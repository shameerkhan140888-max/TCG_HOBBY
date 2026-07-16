import { describe, expect, it, vi } from 'vitest';
import {
  assertProductImportLookupData,
  canonicalCategories,
  canonicalSuppliers,
  seedCanonicalLookupData,
  verifyCanonicalLookupData,
} from './canonical-seed';

function createMockLookupDb(options: { categories?: string[]; suppliers?: string[] } = {}) {
  const categorySlugs = new Set(options.categories ?? canonicalCategories.map((category) => category.slug));
  const supplierSlugs = new Set(options.suppliers ?? canonicalSuppliers.map((supplier) => supplier.slug));

  return {
    category: {
      upsert: vi.fn(async ({ where }: { where: { slug: string } }) => {
        categorySlugs.add(where.slug);
      }),
      findMany: vi.fn(async () => Array.from(categorySlugs).map((slug) => ({ slug }))),
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) =>
        categorySlugs.has(where.slug) ? { slug: where.slug } : null,
      ),
    },
    supplier: {
      upsert: vi.fn(async ({ where }: { where: { slug: string } }) => {
        supplierSlugs.add(where.slug);
      }),
      findMany: vi.fn(async () => Array.from(supplierSlugs).map((slug) => ({ slug }))),
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) =>
        supplierSlugs.has(where.slug) ? { slug: where.slug } : null,
      ),
    },
  };
}

describe('canonical seed', () => {
  it('upserts canonical categories and suppliers and exits through verification', async () => {
    const db = createMockLookupDb({ categories: [], suppliers: [] });
    const log = vi.fn();

    await seedCanonicalLookupData(db as never, log);
    await verifyCanonicalLookupData(db as never);

    expect(db.category.upsert).toHaveBeenCalledTimes(canonicalCategories.length);
    expect(db.supplier.upsert).toHaveBeenCalledTimes(canonicalSuppliers.length);
    expect(log).toHaveBeenCalledWith('Seeding categories...');
    expect(log).toHaveBeenCalledWith('Seeding suppliers...');
    expect(log).toHaveBeenCalledWith('Seeding products...');
    expect(log).toHaveBeenCalledWith('Seeding users...');
  });

  it('fails verification when a canonical category is missing', async () => {
    const db = createMockLookupDb({
      categories: canonicalCategories.filter((category) => category.slug !== 'sealed-product').map((category) => category.slug),
    });

    await expect(verifyCanonicalLookupData(db as never)).rejects.toThrow('Missing categories: sealed-product');
  });

  it('rejects imports when lookup category slugs do not match seeded data', async () => {
    const db = createMockLookupDb({ categories: ['pokemon-tcg'], suppliers: ['card-citadel'] });

    await expect(
      assertProductImportLookupData(db as never, {
        category: 'sealed-product',
        supplierSlug: 'card-citadel',
      }),
    ).rejects.toThrow('category "sealed-product" does not exist');
  });

  it('accepts import prerequisites when category and supplier exist', async () => {
    const db = createMockLookupDb({ categories: ['sealed-product'], suppliers: ['card-citadel'] });

    await expect(
      assertProductImportLookupData(db as never, {
        category: 'sealed-product',
        supplierSlug: 'card-citadel',
      }),
    ).resolves.toBeUndefined();
  });
});
