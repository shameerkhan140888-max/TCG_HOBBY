import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertIronSpruePrimaryMediaRole,
  assertIronSprueR2Bucket,
  assertNoClientStoreOverride,
  calculateIronSprueOnHandStock,
  createIronSprueCustomerOrderRequest,
  createIronSprueAdminProduct,
  createIronSprueManualOrder,
  deriveIronSprueProductReadinessState,
  evaluateIronSprueProductReadiness,
  getIronSprueProductReadiness,
  getIronSprueAdminDashboard,
  getIronSprueAdminPermissionMatrix,
  isIronSprueDisplayableImageAsset,
  listIronSprueAdminProducts,
  receiveIronSprueStock,
  reconcileIronSprueR2ProductMedia,
  reconcileIronSprueInventoryAvailableStock,
  resolveIronSpruePublicMediaUrl,
  resolveIronSprueCustomerOrderRequest,
  resolveIronSprueAdminPermissions,
  publishIronSprueAdminProduct,
  publishIronSprueAdminProducts,
  setIronSprueProductPublicationState,
  summarizeIronSprueProductReadinessBlockers,
  synchronizeIronSprueProductPublicationReadiness,
  updateIronSprueAdminCategoryControls,
  updateIronSprueAdminOrderFulfilmentStatus,
  updateIronSprueAdminMediaApproval,
  upsertIronSprueAdminHero,
  upsertIronSprueAdminTypographySettings,
} from './iron-sprue-admin.js';
import { getIronSprueAdminDatabaseTargetInfo, getNodePostgresPoolMax } from './client.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

const actor = { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' };

function readyProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    storeCode: 'IRON_SPRUE',
    customerTitle: 'Aoshima Kit',
    sourceTitle: 'Aoshima Kit',
    sku: 'IS-AOSHIMA-1',
    slug: 'aoshima-kit',
    brandId: 'brand-1',
    categoryId: 'category-1',
    supplierId: 'supplier-1',
    grossPriceMinor: 2650,
    vatRate: 20,
    currency: 'GBP',
    publicationState: 'DRAFT',
    shortDescription: 'Short copy',
    fullDescription: 'Full copy',
    specifications: { scale: '1/32' },
    seoTitle: 'Aoshima Kit',
    metaDescription: 'Aoshima kit for modellers',
    inventory: { availableStock: 2, reservedStock: 0 },
    mediaAssets: [
      { id: 'media-1', role: 'catalogue-primary', approvalState: 'APPROVED', isPrimary: true, storageKey: 'products/is-aoshima-1/image-2/primary.png', url: null, sortOrder: 0 },
    ],
    contentReviews: [],
    ...overrides,
  } as any;
}

describe('Iron Sprue dedicated Admin foundation', () => {
  it('maps existing platform admins to the full Iron Sprue Admin role without TCG store input', async () => {
    const matrix = getIronSprueAdminPermissionMatrix();
    expect(matrix.map((item) => item.role)).toContain('SUPER_ADMIN');

    const permissions = await resolveIronSprueAdminPermissions(actor, {} as never);
    expect(permissions.role).toBe('SUPER_ADMIN');
    expect(permissions.permissions).toContain('products:publish');
    expect(permissions.permissions).toContain('roles:manage');
  });

  it('fails closed on browser-supplied or cross-store context', () => {
    expect(() => assertNoClientStoreOverride({ storeCode: 'TCG_HOBBY' })).toThrow(/IRON_SPRUE/);
    expect(() => assertNoClientStoreOverride({ storeCode: 'IRON_SPRUE' })).not.toThrow();
    expect(() => assertNoClientStoreOverride({})).not.toThrow();
  });

  it('rejects non-Iron Sprue media storage and non-Image-2 primary media roles', () => {
    expect(() => assertIronSprueR2Bucket('tcg-hobby-media')).toThrow(/iron-sprue-product-media/);
    expect(() => assertIronSprueR2Bucket('iron-sprue-product-media')).not.toThrow();
    expect(() => assertIronSpruePrimaryMediaRole('manufacturer-original')).toThrow(/Image 2/);
    expect(() => assertIronSpruePrimaryMediaRole('catalogue-primary')).not.toThrow();
  });

  it('requires Image 2, content, SEO and review completion before publication readiness', () => {
    const checks = evaluateIronSprueProductReadiness(readyProduct({
      mediaAssets: [],
      contentReviews: [{ fieldName: 'fullDescription', status: 'PENDING' }],
      metaDescription: null,
    }));

    expect(checks.find((check) => check.key === 'media')?.passed).toBe(false);
    expect(checks.find((check) => check.key === 'seo')?.passed).toBe(false);
    expect(checks.find((check) => check.key === 'content-conflicts')?.passed).toBe(false);
    expect(evaluateIronSprueProductReadiness(readyProduct()).every((check) => check.passed)).toBe(true);
  });

  it('resolves R2-backed image rows to the public media origin and rejects JSON placeholders', () => {
    process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = 'https://media.ironsprue.co.uk/';

    expect(resolveIronSpruePublicMediaUrl({
      url: 'r2://products/is-aos-05603/image-2/iron-sprue-image-2.png',
      storageKey: 'products/is-aos-05603/image-2/iron-sprue-image-2.png',
    })).toBe('https://media.ironsprue.co.uk/products/is-aos-05603/image-2/iron-sprue-image-2.png');
    expect(isIronSprueDisplayableImageAsset({
      mimeType: 'application/json',
      storageKey: 'published/products/is-aos-05603/catalogue-primary-placeholder.json',
    })).toBe(false);
  });

  it('does not let pending launch-import bookkeeping block an otherwise ready product', () => {
    const product = readyProduct({
      contentReviews: [
        { id: 'review-1', fieldName: 'launch-import', status: 'PENDING', proposedValue: {}, sourceReference: 'row-1' },
      ],
    });

    const readiness = getIronSprueProductReadiness(product);

    expect(readiness.isReadyToPublish).toBe(true);
    expect(readiness.blockingReasons).toEqual([]);
  });

  it('reconciles confident R2 product images into approved canonical Railway media rows', async () => {
    const product = readyProduct({
      id: 'product-1',
      sku: 'IS-AOS-05603',
      customerTitle: 'Pagani Zonda F',
      mediaAssets: [
        {
          id: 'placeholder-1',
          role: 'catalogue-primary',
          approvalState: 'FAILED',
          isPrimary: false,
          storageKey: 'published/products/is-aos-05603/catalogue-primary-placeholder.json',
          url: null,
          sortOrder: 0,
          mimeType: 'application/json',
        },
      ],
      contentReviews: [],
    });
    const upsertedRecords: any[] = [];
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([product]),
        findFirst: vi.fn().mockResolvedValue({ ...product, mediaAssets: [] }),
        update: vi.fn().mockResolvedValue(product),
      },
      ironSprueAdminMediaAsset: {
        upsert: vi.fn(async ({ create }) => {
          const record = { id: `media-${upsertedRecords.length + 1}`, ...create };
          upsertedRecords.push(record);
          return record;
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    const result = await reconcileIronSprueR2ProductMedia([
      { key: 'products/is-aos-05603/image-2/iron-sprue-image-2-ddc9b0dbc551.png', size: 1000 },
      { key: 'products/is-aos-05603/workshop/iron-sprue-workshop-99517f01b1dc.png', size: 2000 },
      { key: 'archive/products/is-aos-05603-aoshima-05603-pagani-zonda-f/original/manufacturer-source.jpg', size: 1800 },
      { key: 'products/is-aos-99999/image-2/missing.png', size: 500 },
      { key: 'products/is-aos-05603/source-required.json', size: 100 },
    ], actor, client as never);

    expect(result.upsertedMedia).toBe(3);
    expect(result.affectedProducts).toBe(1);
    expect(result.unmatched).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'products/is-aos-99999/image-2/missing.png' }),
      expect.objectContaining({ key: 'products/is-aos-05603/source-required.json' }),
    ]));
    expect(client.ironSprueAdminMediaAsset.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        productId: 'product-1',
        role: 'catalogue-primary',
        approvalState: 'APPROVED',
        isPrimary: true,
        storageKey: 'products/is-aos-05603/image-2/iron-sprue-image-2-ddc9b0dbc551.png',
        url: 'r2://products/is-aos-05603/image-2/iron-sprue-image-2-ddc9b0dbc551.png',
      }),
    }));
    expect(client.ironSprueAdminMediaAsset.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        productId: 'product-1',
        role: 'manufacturer-original',
        approvalState: 'APPROVED',
        isPrimary: false,
        storageKey: 'archive/products/is-aos-05603-aoshima-05603-pagani-zonda-f/original/manufacturer-source.jpg',
        url: 'r2://archive/products/is-aos-05603-aoshima-05603-pagani-zonda-f/original/manufacturer-source.jpg',
      }),
    }));
    expect(client.ironSprueAdminMediaAsset.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productId: 'product-1', role: 'catalogue-primary' }),
      data: { isPrimary: false },
    }));
  });

  it('returns one structured readiness answer for media, content, commercial, review and inventory blockers', () => {
    expect(getIronSprueProductReadiness(readyProduct())).toMatchObject({
      status: 'READY',
      isReadyToPublish: true,
      primaryImageUrl: '/media/iron-sprue/products/is-aoshima-1/image-2/primary.png',
      blockingReasons: [],
    });
    expect(getIronSprueProductReadiness(readyProduct({ mediaAssets: [] })).blockingReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'media.primary_missing', category: 'media', source: 'mediaAssets.catalogue-primary' }),
    ]));
    expect(getIronSprueProductReadiness(readyProduct({
      mediaAssets: [{ id: 'media-1', role: 'catalogue-primary', approvalState: 'APPROVED', isPrimary: true, storageKey: null, url: null, sortOrder: 0 }],
    })).blockingReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'media.primary_unresolvable', category: 'media' }),
    ]));
    expect(getIronSprueProductReadiness(readyProduct({
      mediaAssets: [{
        id: 'media-json',
        role: 'catalogue-primary',
        approvalState: 'APPROVED',
        isPrimary: true,
        storageKey: 'archive/products/is-aos-05603/original/source-required.json',
        url: null,
        mimeType: 'application/json',
        sortOrder: 0,
      }],
    })).blockingReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'media.primary_unresolvable',
        category: 'media',
        message: 'Approved primary catalogue media must be a resolvable image file.',
      }),
    ]));
    expect(getIronSprueProductReadiness(readyProduct({ contentReviews: [{ fieldName: 'sourceRow', status: 'CONFLICT' }] })).blockingReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'commercial', source: 'contentReviews.sourceRow' }),
    ]));
    expect(getIronSprueProductReadiness(readyProduct({ contentReviews: [{ fieldName: 'identity-match', status: 'CONFLICT' }] })).blockingReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'review', source: 'contentReviews.identity-match' }),
    ]));
    expect(getIronSprueProductReadiness(readyProduct({ inventory: { availableStock: 0, reservedStock: 0 } })).blockingReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'inventory.stock_unavailable', category: 'inventory' }),
    ]));
  });

  it('derives publication states and blockers from media and content readiness', () => {
    expect(deriveIronSprueProductReadinessState(readyProduct())).toBe('READY_TO_PUBLISH');
    expect(deriveIronSprueProductReadinessState(readyProduct({ mediaAssets: [] }))).toBe('MEDIA_PENDING');
    expect(deriveIronSprueProductReadinessState(readyProduct({ fullDescription: null }))).toBe('CONTENT_PENDING');
    expect(deriveIronSprueProductReadinessState(readyProduct({ contentReviews: [{ fieldName: 'fullDescription', status: 'CONFLICT' }] }))).toBe('REVIEW_REQUIRED');
    expect(deriveIronSprueProductReadinessState(readyProduct({ contentReviews: [{ fieldName: 'image-2-candidate', status: 'CONFLICT' }] }))).toBe('REVIEW_REQUIRED');
    expect(summarizeIronSprueProductReadinessBlockers(readyProduct({
      mediaAssets: [],
      contentReviews: [{ fieldName: 'fullDescription', status: 'CONFLICT' }, { fieldName: 'shortDescription', status: 'PENDING' }, { fieldName: 'image-2-candidate', status: 'CONFLICT' }],
    }))).toEqual(expect.arrayContaining([
      '1 required primary catalogue media asset pending.',
      'fullDescription content review is conflict.',
      'shortDescription content review is pending.',
    ]));
  });

  it('classifies displayable media without treating import source markers as product images', () => {
    expect(isIronSprueDisplayableImageAsset({ storageKey: 'products/is-aos-1/catalogue-primary.webp', mimeType: 'image/webp' })).toBe(true);
    expect(isIronSprueDisplayableImageAsset({ storageKey: 'products/is-aos-1/catalogue-primary.png', mimeType: null })).toBe(true);
    expect(isIronSprueDisplayableImageAsset({ storageKey: 'archive/products/is-aos-1/original/source-required.json', mimeType: 'application/json' })).toBe(false);
  });

  it('blocks READY_TO_PUBLISH or PUBLISHED when readiness checks fail', async () => {
    const client = {
      ironSprueAdminProduct: {
        findFirst: vi.fn().mockResolvedValue(readyProduct({ mediaAssets: [] })),
      },
    };

    await expect(setIronSprueProductPublicationState('product-1', 'READY_TO_PUBLISH', actor, client as never)).rejects.toThrow(/media/);
    expect(client.ironSprueAdminProduct.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'product-1', storeCode: 'IRON_SPRUE' },
    }));
  });

  it('preserves published intent when a published product temporarily becomes blocked', async () => {
    const stale = readyProduct({ publicationState: 'PUBLISHED', mediaAssets: [] });
    const client = {
      ironSprueAdminProduct: {
        findFirst: vi.fn().mockResolvedValue(stale),
        update: vi.fn(),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    const result = await synchronizeIronSprueProductPublicationReadiness('product-1', actor, client as never);

    expect(result).toBe(stale);
    expect(client.ironSprueAdminProduct.update).not.toHaveBeenCalled();
  });

  it('uses the explicit Railway-production admin database target when configured', () => {
    process.env.DATABASE_URL = 'postgresql://root@local.example/tcg_hobby';
    process.env.IRON_SPRUE_DATABASE_URL = 'postgresql://iron@neon.example/neondb';
    process.env.IRON_SPRUE_ADMIN_DATABASE_URL = 'postgresql://railway@railway.internal/railway';
    process.env.IRON_SPRUE_ADMIN_ENVIRONMENT = 'railway-production';

    const target = getIronSprueAdminDatabaseTargetInfo();

    expect(target).toMatchObject({
      source: 'IRON_SPRUE_ADMIN_DATABASE_URL',
      label: 'RAILWAY PRODUCTION',
      host: 'railway.internal',
      database: 'railway',
    });
  });

  it('requires the explicit admin database target for hosted Iron Sprue Admin deployments', () => {
    process.env.VERCEL = '1';
    process.env.DATABASE_URL = 'postgresql://root@railway-public.example/railway';
    process.env.IRON_SPRUE_DATABASE_URL = 'postgresql://iron@neon.example/neondb';
    delete process.env.IRON_SPRUE_ADMIN_DATABASE_URL;

    expect(() => getIronSprueAdminDatabaseTargetInfo()).toThrow(/requires IRON_SPRUE_ADMIN_DATABASE_URL/);
  });

  it('rejects tunnel and Neon targets for hosted Iron Sprue Admin deployments', () => {
    process.env.VERCEL = '1';
    process.env.IRON_SPRUE_ADMIN_DATABASE_URL = 'postgresql://postgres@127.0.0.1:64843/railway';
    expect(() => getIronSprueAdminDatabaseTargetInfo()).toThrow(/localhost Railway tunnel/);

    process.env.IRON_SPRUE_ADMIN_DATABASE_URL = 'postgresql://iron@example.eu-west-2.aws.neon.tech/neondb';
    expect(() => getIronSprueAdminDatabaseTargetInfo()).toThrow(/cannot use Neon/);
  });

  it('caps hosted Node Postgres pools to one connection by default', () => {
    process.env.VERCEL = '1';
    delete process.env.PRISMA_PG_POOL_MAX;

    expect(getNodePostgresPoolMax()).toBe(1);

    process.env.PRISMA_PG_POOL_MAX = '3';
    expect(getNodePostgresPoolMax()).toBe(3);
  });

  it('publishes a ready product through the canonical product publication state', async () => {
    const product = readyProduct({ publicationState: 'READY_TO_PUBLISH', readyApprovedAt: new Date('2026-08-20T00:00:00.000Z') });
    const tx = {
      ironSprueAdminProduct: { update: vi.fn().mockResolvedValue({ ...product, publicationState: 'PUBLISHED' }) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminProduct: { findFirst: vi.fn().mockResolvedValue(product) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await publishIronSprueAdminProduct('product-1', actor, client as never);

    expect(tx.ironSprueAdminProduct.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'product-1' },
      data: expect.objectContaining({ publicationState: 'PUBLISHED', publishedAt: expect.any(Date) }),
    }));
  });

  it('makes an admin-published product visible to the canonical catalogue source', async () => {
    const product = readyProduct({ publicationState: 'READY_TO_PUBLISH', readyApprovedAt: new Date('2026-08-20T00:00:00.000Z') });
    let canonicalProduct = product;
    const tx = {
      ironSprueAdminProduct: {
        update: vi.fn().mockImplementation(({ data }) => {
          canonicalProduct = { ...canonicalProduct, ...data };
          return Promise.resolve(canonicalProduct);
        }),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminProduct: {
        findFirst: vi.fn().mockResolvedValue(product),
        findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(
          where.publicationState === 'PUBLISHED' && canonicalProduct.publicationState === 'PUBLISHED'
            ? [{ ...canonicalProduct, brand: null, category: null, supplier: null, inventory: { availableStock: 1, reservedStock: 0 } }]
            : [],
        )),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const { getIronSprueCatalogueProducts } = await import('./iron-sprue-catalogue.js');

    await publishIronSprueAdminProduct('product-1', actor, client as never);
    const catalogue = await getIronSprueCatalogueProducts({ search: '', category: '', sort: 'featured', page: 1, pageSize: 20 }, client as never);

    expect(canonicalProduct.publicationState).toBe('PUBLISHED');
    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ publicationState: 'PUBLISHED' }),
    }));
    expect(catalogue.products).toHaveLength(1);
  });

  it('bulk-publishes only products without unresolved review blockers', async () => {
    const ready = readyProduct({ id: 'ready-1', sku: 'IS-READY', publicationState: 'READY_TO_PUBLISH' });
    const blocked = readyProduct({ id: 'blocked-1', sku: 'IS-BLOCKED', contentReviews: [{ fieldName: 'fullDescription', status: 'CONFLICT' }] });
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([ready, blocked]) },
      $transaction: vi.fn(),
    };

    await expect(publishIronSprueAdminProducts(['ready-1', 'blocked-1'], actor, client as never)).rejects.toThrow(/fullDescription content review is conflict/);
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('bulk-publishes eligible selected products', async () => {
    const ready = readyProduct({ id: 'ready-1', sku: 'IS-READY', publicationState: 'READY_TO_PUBLISH' });
    const tx = {
      ironSprueAdminProduct: { update: vi.fn().mockResolvedValue({ ...ready, publicationState: 'PUBLISHED' }) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([ready]) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await publishIronSprueAdminProducts(['ready-1'], actor, client as never);

    expect(tx.ironSprueAdminProduct.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ publicationState: 'PUBLISHED' }),
    }));
  });

  it('creates products, inventory and audit records inside one Iron Sprue transaction', async () => {
    const createdProduct = {
      id: 'product-1',
      sku: 'IS-AOSHIMA-1',
      customerTitle: 'Aoshima Kit',
    };
    const tx = {
      ironSprueAdminProduct: { create: vi.fn().mockResolvedValue(createdProduct) },
      ironSprueAdminInventory: { create: vi.fn().mockResolvedValue({}) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = { $transaction: vi.fn((callback) => callback(tx)) };

    await createIronSprueAdminProduct({ sourceTitle: 'Aoshima Kit', sku: 'IS-AOSHIMA-1', grossPriceMinor: 2650 }, actor, client as never);

    expect(tx.ironSprueAdminProduct.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', sku: 'IS-AOSHIMA-1' }),
    }));
    expect(tx.ironSprueAdminInventory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', productId: 'product-1' }),
    }));
    expect(tx.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', action: 'product.create' }),
    }));
  });

  it('records goods received movement and rejects negative stock quantities', async () => {
    await expect(receiveIronSprueStock('product-1', { receivedQuantity: -1 }, actor, {} as never)).rejects.toThrow(/negative/);

    const tx = {
      ironSprueAdminInventory: { update: vi.fn().mockResolvedValue({}) },
      ironSprueAdminStockMovement: { create: vi.fn().mockResolvedValue({}) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminInventory: { findFirst: vi.fn().mockResolvedValue({ id: 'inventory-1', availableStock: 2 }) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await receiveIronSprueStock('product-1', { receivedQuantity: 3, damagedQuantity: 1, missingQuantity: 0 }, actor, client as never);

    expect(client.ironSprueAdminInventory.findFirst).toHaveBeenCalledWith({ where: { productId: 'product-1', storeCode: 'IRON_SPRUE' } });
    expect(tx.ironSprueAdminStockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ storeCode: 'IRON_SPRUE', quantity: 2, beforeQuantity: 2, afterQuantity: 4 }),
    }));
  });

  it('derives on-hand stock from received stock and non-receipt movements', () => {
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 5 })).toBe(5);
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 5, damagedQuantity: 1, missingQuantity: 1 })).toBe(3);
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 5, movementQuantity: -1 })).toBe(4);
    expect(calculateIronSprueOnHandStock({ receivedQuantity: 0, movementQuantity: -2 })).toBe(0);
  });

  it('reconciles stale available stock without undoing genuine sales movements', async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = {
      ironSprueAdminInventory: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'inventory-stale',
            productId: 'product-stale',
            expectedQuantity: 5,
            receivedQuantity: 5,
            damagedQuantity: 0,
            missingQuantity: 0,
            availableStock: 0,
            reservedStock: 0,
            product: { id: 'product-stale', sku: 'IS-CUB-MC093H', customerTitle: "St Basil's Cathedral" },
          },
          {
            id: 'inventory-sold',
            productId: 'product-sold',
            expectedQuantity: 5,
            receivedQuantity: 5,
            damagedQuantity: 0,
            missingQuantity: 0,
            availableStock: 4,
            reservedStock: 0,
            product: { id: 'product-sold', sku: 'IS-OCC-13000', customerTitle: "Queen Anne's Revenge" },
          },
        ]),
        update,
      },
      ironSprueAdminStockMovement: {
        groupBy: vi.fn().mockResolvedValue([
          { productId: 'product-sold', _sum: { quantity: -1 } },
        ]),
      },
    };

    const result = await reconcileIronSprueInventoryAvailableStock(client as never);

    expect(client.ironSprueAdminStockMovement.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        storeCode: 'IRON_SPRUE',
        movementType: { not: 'GOODS_RECEIVED' },
      },
    }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'inventory-stale' },
      data: { availableStock: 5 },
    });
    expect(result.updated).toBe(1);
    expect(result.corrections[0]).toEqual(expect.objectContaining({
      sku: 'IS-CUB-MC093H',
      previousAvailableStock: 0,
      nextAvailableStock: 5,
    }));
  });

  it('counts dashboard data only through Iron Sprue scoped tables', async () => {
    process.env.DATABASE_URL = 'postgresql://root@local.example/tcg_hobby';
    process.env.IRON_SPRUE_ENVIRONMENT = 'development';
    process.env.IRON_SPRUE_WORKER_READ_DATABASE_URL = 'postgresql://redacted.example/iron';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'test-access';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'test-secret';

    const count = vi.fn().mockResolvedValue(0);
    const productCount = vi.fn().mockResolvedValue(0);
    const client = {
      ironSprueAdminProduct: { count: productCount },
      ironSprueAdminInventory: { aggregate: vi.fn().mockResolvedValue({ _sum: {} }) },
      ironSprueAdminSpecialOffer: { count },
      ironSprueAdminHero: { count },
      ironSprueAdminContentReview: { count },
      ironSprueAdminImportBatch: { count },
      ironSprueAdminMediaAsset: { count },
    };

    const dashboard = await getIronSprueAdminDashboard(client as never);

    expect(dashboard.storeCode).toBe('IRON_SPRUE');
    expect(dashboard.r2Status).toBe('configured');
    expect(dashboard.workerReadStatus).toBe('configured');
    for (const call of [...productCount.mock.calls, ...count.mock.calls]) {
      expect(JSON.stringify(call[0])).toContain('IRON_SPRUE');
    }
  });

  it('lists products with server-side Iron Sprue filters and no client store selector', async () => {
    const client = {
      ironSprueAdminProduct: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    await listIronSprueAdminProducts({ search: 'Aoshima', pageSize: 10 }, client as never);

    expect(client.ironSprueAdminProduct.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ storeCode: 'IRON_SPRUE' }),
    }));
    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ storeCode: 'IRON_SPRUE' }),
      take: 10,
    }));
  });

  it('persists media approval and makes rejected media non-primary', async () => {
    const media = {
      id: 'media-1',
      storeCode: 'IRON_SPRUE',
      productId: 'product-1',
      role: 'catalogue-primary',
      approvalState: 'APPROVED',
      isPrimary: true,
      product: { id: 'product-1' },
    };
    const client = {
      ironSprueAdminMediaAsset: {
        findFirst: vi.fn().mockResolvedValue(media),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({ ...media, approvalState: 'REJECTED', isPrimary: false }),
      },
      ironSprueAdminProduct: {
        findFirst: vi.fn().mockResolvedValue(readyProduct({
          publicationState: 'MEDIA_PENDING',
          mediaAssets: [{ role: 'catalogue-primary', approvalState: 'REJECTED', isPrimary: false }],
        })),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await updateIronSprueAdminMediaApproval('media-1', 'REJECTED', actor, client as never);

    expect(client.ironSprueAdminMediaAsset.updateMany).not.toHaveBeenCalled();
    expect(client.ironSprueAdminMediaAsset.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'media-1' },
      data: expect.objectContaining({
        approvalState: 'REJECTED',
        approvedById: null,
        approvedAt: null,
        isPrimary: false,
      }),
    }));
    expect(client.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        action: 'media.approval_state.change',
        after: expect.objectContaining({ approvalState: 'REJECTED', isPrimary: false }),
      }),
    }));
  });

  it('approves a catalogue-primary asset without clearing workshop media', async () => {
    const media = {
      id: 'media-2',
      storeCode: 'IRON_SPRUE',
      productId: 'product-1',
      role: 'catalogue-primary',
      approvalState: 'REVIEW_REQUIRED',
      isPrimary: false,
      storageKey: 'products/is-aos-05628/catalogue-primary.webp',
      url: null,
      mimeType: 'image/webp',
      product: { id: 'product-1' },
    };
    const client = {
      ironSprueAdminMediaAsset: {
        findFirst: vi.fn().mockResolvedValue(media),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ ...media, approvalState: 'APPROVED', isPrimary: true }),
      },
      ironSprueAdminProduct: {
        findFirst: vi.fn().mockResolvedValue(readyProduct()),
        update: vi.fn().mockResolvedValue(readyProduct({ publicationState: 'READY_TO_PUBLISH' })),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await updateIronSprueAdminMediaApproval('media-2', 'APPROVED', actor, client as never);

    expect(client.ironSprueAdminMediaAsset.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        productId: 'product-1',
        role: 'catalogue-primary',
        id: { not: 'media-2' },
      }),
      data: { isPrimary: false },
    }));
    expect(client.ironSprueAdminMediaAsset.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        approvalState: 'APPROVED',
        approvedById: actor.id,
        isPrimary: true,
      }),
    }));
  });

  it('rejects approving a non-image catalogue-primary record as storefront media', async () => {
    const media = {
      id: 'media-json',
      productId: 'product-1',
      role: 'catalogue-primary',
      approvalState: 'PENDING',
      isPrimary: false,
      storageKey: 'archive/products/is-aos-05603/original/source-required.json',
      url: null,
      mimeType: 'application/json',
    };
    const client = {
      ironSprueAdminMediaAsset: {
        findFirst: vi.fn().mockResolvedValue(media),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      ironSprueAdminAuditLog: { create: vi.fn() },
    };

    await expect(updateIronSprueAdminMediaApproval('media-json', 'APPROVED', actor, client as never)).rejects.toThrow(/Only image files/);
    expect(client.ironSprueAdminMediaAsset.update).not.toHaveBeenCalled();
    expect(client.ironSprueAdminAuditLog.create).not.toHaveBeenCalled();
  });

  it('updates category storefront visibility with an audit trail', async () => {
    const category = {
      id: 'category-1',
      storeCode: 'IRON_SPRUE',
      name: 'Model Kits',
      active: false,
      sortOrder: 20,
    };
    const updated = { ...category, active: true, sortOrder: 5 };
    const client = {
      ironSprueAdminCategory: {
        findFirst: vi.fn().mockResolvedValue(category),
        update: vi.fn().mockResolvedValue(updated),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await updateIronSprueAdminCategoryControls('category-1', { active: true, sortOrder: 5 }, actor, client as never);

    expect(client.ironSprueAdminCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-1', storeCode: 'IRON_SPRUE' },
    });
    expect(client.ironSprueAdminCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { active: true, sortOrder: 5 },
    });
    expect(client.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        action: 'category.controls.update',
        entityType: 'category',
        entityId: 'category-1',
        before: { active: false, sortOrder: 20 },
        after: { active: true, sortOrder: 5 },
      }),
    }));
  });

  it('persists constrained hero merchandising badges through the hero controls', async () => {
    const hero = {
      id: 'hero-1',
      headline: 'New arrivals for the bench',
      merchandisingBadge: 'NEW',
      active: true,
      sortOrder: 1,
    };
    const client = {
      ironSprueAdminHero: {
        create: vi.fn().mockResolvedValue(hero),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await upsertIronSprueAdminHero(
      {
        headline: 'New arrivals for the bench',
        merchandisingBadge: 'new',
        active: true,
        sortOrder: 1,
      },
      actor,
      client as never,
    );

    expect(client.ironSprueAdminHero.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        merchandisingBadge: 'NEW',
      }),
    });
    expect(client.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'hero.upsert',
        after: expect.objectContaining({ merchandisingBadge: 'NEW' }),
      }),
    }));
  });

  it('rejects unsupported hero merchandising badge values before persistence', async () => {
    const client = {
      ironSprueAdminHero: {
        create: vi.fn(),
      },
      ironSprueAdminAuditLog: { create: vi.fn() },
    };

    await expect(upsertIronSprueAdminHero(
      { headline: 'Unsafe badge', merchandisingBadge: 'javascript:alert(1)' },
      actor,
      client as never,
    )).rejects.toThrow(/hero merchandising badge/i);

    expect(client.ironSprueAdminHero.create).not.toHaveBeenCalled();
  });

  it('persists constrained storefront typography settings with an audit trail', async () => {
    const record = {
      id: 'typography-1',
      storeCode: 'IRON_SPRUE',
      headingFamily: 'SYSTEM_SANS',
      bodyFamily: 'HUMANIST_SANS',
      headingWeight: 'BOLD',
      bodyWeight: 'MEDIUM',
      headingScale: 'LARGE',
      bodyScale: 'COMFORTABLE',
    };
    const client = {
      ironSprueAdminTypographySetting: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(record),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    await upsertIronSprueAdminTypographySettings(
      {
        headingFamily: 'system sans',
        bodyFamily: 'humanist-sans',
        headingWeight: 'bold',
        bodyWeight: 'medium',
        headingScale: 'large',
        bodyScale: 'comfortable',
      },
      actor,
      client as never,
    );

    expect(client.ironSprueAdminTypographySetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { storeCode: 'IRON_SPRUE' },
      create: expect.objectContaining({
        headingFamily: 'SYSTEM_SANS',
        bodyFamily: 'HUMANIST_SANS',
        headingWeight: 'BOLD',
        bodyWeight: 'MEDIUM',
        headingScale: 'LARGE',
        bodyScale: 'COMFORTABLE',
      }),
    }));
    expect(client.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'typography.update',
        entityType: 'typography-settings',
        after: expect.objectContaining({ headingScale: 'LARGE', bodyScale: 'COMFORTABLE' }),
      }),
    }));
  });

  it('blocks fulfilment changes for unpaid or cancelled Iron Sprue orders', async () => {
    const client = {
      ironSprueOrder: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            storeCode: 'IRON_SPRUE',
            paymentStatus: 'REQUIRES_PAYMENT',
            status: 'REQUIRES_PAYMENT',
            fulfilmentStatus: 'PENDING',
            cancelledAt: null,
          })
          .mockResolvedValueOnce({
            id: 'order-2',
            storeCode: 'IRON_SPRUE',
            paymentStatus: 'SUCCEEDED',
            status: 'SUCCEEDED',
            fulfilmentStatus: 'CANCELLED',
            cancelledAt: new Date(),
          }),
      },
      $transaction: vi.fn(),
    };

    await expect(updateIronSprueAdminOrderFulfilmentStatus('order-1', 'SHIPPED', actor, client as never)).rejects.toThrow(/paid/);
    await expect(updateIronSprueAdminOrderFulfilmentStatus('order-2', 'SHIPPED', actor, client as never)).rejects.toThrow(/paid/);
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('creates manual orders by snapshotting products and decrementing sellable stock', async () => {
    const product = {
      id: 'product-1',
      storeCode: 'IRON_SPRUE',
      sku: 'IS-AOS-05629',
      customerTitle: 'Toyota 2000GT Silver',
      slug: 'toyota-2000gt-silver',
      grossPriceMinor: 1999,
      inventory: { id: 'inventory-1', storeCode: 'IRON_SPRUE', productId: 'product-1', availableStock: 2 },
      mediaAssets: [
        { approvalState: 'APPROVED', isPrimary: true, role: 'catalogue-primary', sortOrder: 0, url: '/media/car.webp', storageKey: null, altText: 'Toyota 2000GT Silver' },
      ],
    };
    const createdOrder = {
      id: 'order-1',
      orderNumber: 'IS-20260821-ABC123',
      items: [],
    };
    const tx = {
      ironSprueAdminInventory: {
        findUnique: vi.fn().mockResolvedValue(product.inventory),
        update: vi.fn().mockResolvedValue({}),
      },
      ironSprueAdminStockMovement: { create: vi.fn().mockResolvedValue({}) },
      ironSprueOrder: { create: vi.fn().mockResolvedValue(createdOrder) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([product]) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await createIronSprueManualOrder({
      sourceChannel: 'phone',
      paymentMethodLabel: 'Card machine',
      externalReference: 'TILL-42',
      shippingFullName: 'Iron Customer',
      shippingEmail: 'customer@example.test',
      shippingLine1: '1 Model Street',
      shippingCity: 'Dewsbury',
      shippingPostalCode: 'WF13 3EW',
      lines: [{ productId: 'product-1', quantity: 1 }],
    }, actor, client as never);

    expect(tx.ironSprueAdminInventory.update).toHaveBeenCalledWith({
      where: { productId: 'product-1' },
      data: { availableStock: 1 },
    });
    expect(tx.ironSprueAdminStockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        movementType: 'MANUAL_ORDER_SALE',
        quantity: -1,
        beforeQuantity: 2,
        afterQuantity: 1,
      }),
    }));
    expect(tx.ironSprueOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        paymentProvider: 'MANUAL',
        sourceChannel: 'PHONE',
        paymentMethodLabel: 'Card machine',
        externalReference: 'TILL-42',
        subtotalMinor: 1999,
        totalMinor: 1999,
        items: {
          create: [expect.objectContaining({
            productSku: 'IS-AOS-05629',
            quantity: 1,
            imageUrl: '/media/car.webp',
          })],
        },
      }),
      include: { items: true },
    }));
  });

  it('rejects manual orders when sellable stock is insufficient', async () => {
    const product = {
      id: 'product-1',
      storeCode: 'IRON_SPRUE',
      sku: 'IS-AOS-05629',
      customerTitle: 'Toyota 2000GT Silver',
      slug: 'toyota-2000gt-silver',
      grossPriceMinor: 1999,
      inventory: { id: 'inventory-1', storeCode: 'IRON_SPRUE', productId: 'product-1', availableStock: 0 },
      mediaAssets: [],
    };
    const tx = {
      ironSprueAdminInventory: { findUnique: vi.fn().mockResolvedValue(product.inventory), update: vi.fn() },
      ironSprueAdminStockMovement: { create: vi.fn() },
      ironSprueOrder: { create: vi.fn() },
      ironSprueAdminAuditLog: { create: vi.fn() },
    };
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([product]) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await expect(createIronSprueManualOrder({
      shippingFullName: 'Iron Customer',
      shippingEmail: 'customer@example.test',
      shippingLine1: '1 Model Street',
      shippingCity: 'Dewsbury',
      shippingPostalCode: 'WF13 3EW',
      lines: [{ productId: 'product-1', quantity: 1 }],
    }, actor, client as never)).rejects.toThrow(/Insufficient sellable stock/);

    expect(tx.ironSprueOrder.create).not.toHaveBeenCalled();
  });

  it('records customer cancellation and return requests without mutating commerce state', async () => {
    const order = {
      id: 'order-1',
      storeCode: 'IRON_SPRUE',
      orderNumber: 'IS-20260821-ABC123',
      userId: 'user-1',
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      fulfilmentStatus: 'PENDING',
      cancelledAt: null,
    };
    const request = { id: 'request-1', orderId: 'order-1', requestType: 'CANCELLATION', status: 'OPEN' };
    const tx = {
      ironSprueOrderCustomerRequest: { create: vi.fn().mockResolvedValue(request) },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      ironSprueOrder: { findFirst: vi.fn().mockResolvedValue(order) },
      ironSprueOrderCustomerRequest: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((callback) => callback(tx)),
    };

    await createIronSprueCustomerOrderRequest({
      userId: 'user-1',
      orderNumber: order.orderNumber,
      requestType: 'CANCELLATION',
      reason: 'Please cancel before dispatch',
    }, client as never);

    expect(tx.ironSprueOrderCustomerRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        orderId: 'order-1',
        userId: 'user-1',
        requestType: 'CANCELLATION',
      }),
    });
    expect(tx.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'order.customer_request.cancellation' }),
    }));
  });

  it('blocks customer return requests before dispatch', async () => {
    const client = {
      ironSprueOrder: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'order-1',
          orderNumber: 'IS-1',
          userId: 'user-1',
          status: 'PAID',
          paymentStatus: 'SUCCEEDED',
          fulfilmentStatus: 'PENDING',
          cancelledAt: null,
        }),
      },
    };

    await expect(createIronSprueCustomerOrderRequest({
      userId: 'user-1',
      orderNumber: 'IS-1',
      requestType: 'RETURN',
      reason: 'Need to return',
    }, client as never)).rejects.toThrow(/dispatched/);
  });

  it('resolves customer order requests with an audit trail', async () => {
    const request = {
      id: 'request-1',
      storeCode: 'IRON_SPRUE',
      orderId: 'order-1',
      requestType: 'RETURN',
      status: 'OPEN',
      order: { orderNumber: 'IS-20260821-ABC123' },
    };
    const updated = { ...request, status: 'RESOLVED', adminNotes: 'Return handled in admin.' };
    const tx = {
      ironSprueOrderCustomerRequest: {
        findFirst: vi.fn().mockResolvedValue(request),
        update: vi.fn().mockResolvedValue(updated),
      },
      ironSprueAdminAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = { $transaction: vi.fn((callback) => callback(tx)) };

    await resolveIronSprueCustomerOrderRequest({
      requestId: 'request-1',
      status: 'RESOLVED',
      adminNotes: 'Return handled in admin.',
    }, actor, client as never);

    expect(tx.ironSprueOrderCustomerRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'request-1' },
      data: expect.objectContaining({
        status: 'RESOLVED',
        adminNotes: 'Return handled in admin.',
        resolvedAt: expect.any(Date),
      }),
    }));
    expect(tx.ironSprueAdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'order.customer_request.resolved',
        entityType: 'order-request',
        entityId: 'request-1',
      }),
    }));
  });
});
