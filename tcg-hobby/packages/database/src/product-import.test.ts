import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createProductImportPlan,
  derivePublicStockState,
  validateProductMediaManifest,
  validateProductImportFolder,
} from './product-import';

const tempFolders: string[] = [];

async function createImportFolder(manifest: Record<string, unknown>, mediaManifest = validMediaManifest()): Promise<string> {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'tcg-product-import-'));
  tempFolders.push(folder);
  await mkdir(path.join(folder, 'images'));
  await writeFile(path.join(folder, 'images', '01-primary.webp'), 'primary-image');
  await writeFile(path.join(folder, 'images', '02-gallery.webp'), 'gallery-image');
  await writeFile(path.join(folder, 'product.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(folder, 'media.json'), JSON.stringify(mediaManifest, null, 2));
  return folder;
}

function validManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    name: 'Test Product',
    slug: 'test-product',
    sku: 'TEST-PRODUCT-001',
    game: 'POKEMON',
    category: 'sealed-product',
    priceMinor: 4999,
    vatRate: 20,
    stockQuantity: 3,
    lifecycleState: 'DRAFT',
    visible: false,
    featured: true,
    homepagePriority: 1,
    heroFeatured: false,
    preorder: false,
    shippingPromotion: { type: 'NONE', productOnly: true },
    shortDescription: 'A tested product description.',
    fullDescription: 'A tested long product description.',
    contents: ['1 tested item'],
    source: { type: 'OWNER_SUPPLIED', reference: 'Unit test media.' },
    ...overrides,
  };
}

function validMediaManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    images: [
      {
        filename: '01-primary.webp',
        displayOrder: 1,
        alt: 'Test Product primary image',
        role: 'PRIMARY',
        heroEligible: true,
        homepageEligible: true,
        openGraphEligible: true,
        thumbnailUsage: 'BOTH',
        provenance: 'OWNER_SUPPLIED',
      },
      {
        filename: '02-gallery.webp',
        displayOrder: 2,
        alt: 'Test Product gallery image',
        role: 'GALLERY',
        heroEligible: false,
        homepageEligible: false,
        openGraphEligible: false,
        thumbnailUsage: 'GALLERY',
        provenance: 'OWNER_SUPPLIED',
      },
    ],
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(tempFolders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

describe('product import validation', () => {
  it('accepts a complete manifest', async () => {
    const folder = await createImportFolder(validManifest());
    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(true);
    expect(result.input?.slug).toBe('test-product');
    expect(result.input?.lifecycleState).toBe('DRAFT');
    expect(result.input?.seo.title).toBe('Test Product | TCG Hobby');
    expect(result.input?.recommendationWeight).toBe(0);
    expect(result.input?.isAccessory).toBe(false);
  });

  it('accepts optional merchandising metadata without making it required', async () => {
    const folder = await createImportFolder(
      validManifest({
        recommendationWeight: 25,
        isAccessory: true,
        isStaffPick: true,
        isBestSeller: false,
        isNewArrival: true,
      }),
    );
    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(true);
    expect(result.input).toMatchObject({
      recommendationWeight: 25,
      isAccessory: true,
      isStaffPick: true,
      isBestSeller: false,
      isNewArrival: true,
    });
  });

  it('rejects invalid price, negative stock and bad slugs', async () => {
    const folder = await createImportFolder(
      validManifest({
        slug: 'Bad Slug',
        priceMinor: 49.99,
        stockQuantity: -1,
        recommendationWeight: -1,
      }),
    );
    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('slug must use lowercase letters, numbers and hyphens.');
    expect(result.errors).toContain('priceMinor must be a non-negative integer minor-unit amount.');
    expect(result.errors).toContain('stockQuantity must be a non-negative integer.');
    expect(result.errors).toContain('recommendationWeight must be a non-negative integer.');
  });

  it('rejects unsupported categories and missing published supplier data', async () => {
    const folder = await createImportFolder(
      validManifest({
        category: 'unsupported',
        lifecycleState: 'PUBLISHED',
        visible: true,
      }),
    );
    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('category must be one of: sealed-product, single-card, accessories, event-entry.');
    expect(result.errors).toContain('PUBLISHED products require supplierSlug so catalogue rows can render safely.');
  });

  it('rejects a product import without media.json', async () => {
    const folder = await createImportFolder(validManifest());
    await rm(path.join(folder, 'media.json'));

    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('media.json was not found.');
  });

  it('validates media metadata separately from product data', () => {
    const result = validateProductMediaManifest(
      validMediaManifest({
        images: [
          {
            filename: '01-primary.webp',
            displayOrder: 1,
            alt: 'Primary image',
            role: 'PRIMARY',
            heroEligible: true,
            homepageEligible: true,
            openGraphEligible: true,
            thumbnailUsage: 'BOTH',
            provenance: 'OWNER_SUPPLIED',
          },
        ],
      }),
      '/tmp/product',
    );

    expect(result.images[0]).toMatchObject({
      displayOrder: 1,
      role: 'PRIMARY',
      thumbnailUsage: 'BOTH',
    });
  });

  it('rejects a folder without a primary image file', async () => {
    const folder = await createImportFolder(validManifest());
    await rm(path.join(folder, 'images', '01-primary.webp'));

    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('01-primary.webp is listed in product.json but does not exist in images/.');
  });

  it('derives customer-facing stock states without exposing quantities', () => {
    expect(derivePublicStockState(0)).toBe('OUT_OF_STOCK');
    expect(derivePublicStockState(3)).toBe('LOW_STOCK');
    expect(derivePublicStockState(4)).toBe('IN_STOCK');
  });
});

describe('product import planning', () => {
  function databaseWithProductMatches(matches: Record<string, { id: string } | null> = {}) {
    const findUnique = vi.fn(async ({ where }: { where: Record<string, string> }) => {
      const [field, value] = Object.entries(where)[0] ?? [];
      return field && value ? matches[`${field}:${value}`] ?? null : null;
    });
    const categoryFindUnique = vi.fn(async ({ where }: { where: { slug: string } }) =>
      where.slug === 'sealed-product' ? { slug: where.slug } : null,
    );
    const supplierFindUnique = vi.fn(async ({ where }: { where: { slug: string } }) =>
      where.slug === 'card-citadel' ? { slug: where.slug } : null,
    );

    return {
      db: {
        product: {
          findUnique,
        },
        category: {
          findUnique: categoryFindUnique,
        },
        supplier: {
          findUnique: supplierFindUnique,
        },
      },
      findUnique,
      categoryFindUnique,
      supplierFindUnique,
    };
  }

  it('orders media, keeps the primary first and plans card-safe output', async () => {
    const folder = await createImportFolder(validManifest());
    const { db } = databaseWithProductMatches();

    const plan = await createProductImportPlan(folder, db as never);

    expect(plan.productMatch).toBe('new');
    expect(plan.stages).toEqual([
      'validate-input',
      'normalise-data',
      'process-media',
      'validate-business-rules',
      'upsert-product',
      'register-media',
      'generate-seo',
      'register-gallery',
      'storefront-availability',
      'audit',
    ]);
    expect(plan.input.stockQuantity).toBe(3);
    expect(plan.media[0]).toMatchObject({
      sourceFilename: '01-primary.webp',
      outputFilename: 'primary.webp',
      isPrimary: true,
    });
    expect(plan.media.some((item) => item.outputFilename === 'primary-card.webp')).toBe(true);
  });

  it('skips absent optional identifiers and falls back to slug lookup', async () => {
    const folder = await createImportFolder(validManifest({ sku: undefined }));
    const { db, findUnique } = databaseWithProductMatches();

    const plan = await createProductImportPlan(folder, db as never);

    expect(plan.productMatch).toBe('new');
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: 'test-product' },
      select: { id: true },
    });
  });

  it('matches an existing product by slug after importId, id and sku miss', async () => {
    const folder = await createImportFolder(
      validManifest({
        importId: 'import-123',
        id: 'missing-product-id',
        sku: 'MISSING-SKU',
      }),
    );
    const { db, findUnique } = databaseWithProductMatches({
      'slug:test-product': { id: 'existing-product-id' },
    });

    const plan = await createProductImportPlan(folder, db as never);

    expect(plan.productMatch).toBe('slug');
    expect(plan.productId).toBe('existing-product-id');
    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { importId: 'import-123' },
      select: { id: true },
    });
    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'missing-product-id' },
      select: { id: true },
    });
    expect(findUnique).toHaveBeenNthCalledWith(3, {
      where: { sku: 'MISSING-SKU' },
      select: { id: true },
    });
    expect(findUnique).toHaveBeenNthCalledWith(4, {
      where: { slug: 'test-product' },
      select: { id: true },
    });
  });

  it('stops planning when database lookup fails', async () => {
    const folder = await createImportFolder(validManifest());
    const db = {
      product: {
        findUnique: vi.fn(async () => {
          throw new Error('database unavailable');
        }),
      },
      category: {
        findUnique: vi.fn(),
      },
      supplier: {
        findUnique: vi.fn(),
      },
    };

    await expect(createProductImportPlan(folder, db as never)).rejects.toThrow('Product import database lookup failed');
  });

  it('stops planning with a clear message when the canonical category is missing', async () => {
    const folder = await createImportFolder(validManifest({ category: 'sealed-product' }));
    const { db } = databaseWithProductMatches();
    db.category.findUnique = vi.fn(async () => null);

    await expect(createProductImportPlan(folder, db as never)).rejects.toThrow('category "sealed-product" does not exist');
  });

  it('returns new only after successful lookups find no existing product', async () => {
    const folder = await createImportFolder(validManifest({ importId: 'import-123' }));
    const { db, findUnique } = databaseWithProductMatches();

    const plan = await createProductImportPlan(folder, db as never);

    expect(plan.productMatch).toBe('new');
    expect(plan.productId).toBeUndefined();
    expect(findUnique).toHaveBeenCalledTimes(3);
  });

  it('does not publish genuinely new products unless the manifest explicitly requests publication', async () => {
    const folder = await createImportFolder(validManifest({ lifecycleState: undefined, status: undefined, visible: undefined }));
    const { db } = databaseWithProductMatches();

    const plan = await createProductImportPlan(folder, db as never);

    expect(plan.productMatch).toBe('new');
    expect(plan.input.lifecycleState).toBe('DRAFT');
    expect(plan.input.visible).toBe(false);
  });

  it('does not require WebP-only inputs', async () => {
    const folder = await createImportFolder(
      validManifest(),
      validMediaManifest({
        images: [
          { filename: '01-primary.png', displayOrder: 1, alt: 'PNG primary image', role: 'PRIMARY' },
        ],
      }),
    );
    await rm(path.join(folder, 'images', '01-primary.webp'));
    await copyFile(path.join(folder, 'images', '02-gallery.webp'), path.join(folder, 'images', '01-primary.png'));

    const result = await validateProductImportFolder(folder);

    expect(result.valid).toBe(true);
  });
});
