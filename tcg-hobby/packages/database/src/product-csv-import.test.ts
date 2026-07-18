import { describe, expect, it, vi } from 'vitest';
import {
  buildProductCsvTemplate,
  createProductCsvImportPlan,
  executeProductCsvImport,
  parseProductCsv,
} from './product-csv-import';

function csv(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    name: 'CSV Product',
    sku: 'CSV-PRODUCT-001',
    slug: 'csv-product',
    barcode: '',
    brand: 'Pokemon TCG',
    game: 'Pokemon TCG',
    categorySlug: 'sealed-product',
    supplierSlug: 'tcg-hobby',
    productType: 'Premium Collection',
    language: 'English',
    condition: 'SEALED',
    priceMinor: '4999',
    vatRate: '20',
    costMinor: '3500',
    rrpMinor: '',
    salePriceMinor: '',
    saleStartsAt: '',
    saleEndsAt: '',
    stockOnHand: '3',
    reorderPoint: '1',
    reorderQuantity: '0',
    incomingQuantity: '0',
    locationCode: 'MAIN',
    supplierSku: 'CSV-SUPPLIER-001',
    supplierProductUrl: '',
    minimumOrderQuantity: '1',
    packQuantity: '',
    supplierLeadTimeDays: '7',
    description: 'Short product copy.',
    longDescription: 'Long product copy.',
    primaryImageUrl: '/products/csv-product/primary.webp',
    primaryImageAlt: 'CSV Product primary image',
    imageLabel: 'CSV Product',
    featured: 'false',
    published: 'false',
    hideWhenOutOfStock: 'false',
    customerPurchaseLimit: '',
    freeUkStandardShipping: 'false',
    shippingPromotionProductOnly: 'true',
    homepagePriority: '',
    heroFeatured: 'false',
    recommendationWeight: '0',
    isAccessory: 'false',
    isStaffPick: 'false',
    isBestSeller: 'false',
    isNewArrival: 'false',
    seoTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    ogImageUrl: '',
    noindex: 'false',
    ...overrides,
  };
  const headers = Object.keys(values);
  return `${headers.join(',')}\n${headers.map((header) => values[header]).join(',')}`;
}

function planningDb(products: Array<{ id: string; sku: string; barcode: string | null; slug: string }> = []) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(products),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([{ id: 'category-1', slug: 'sealed-product' }]),
    },
    supplier: {
      findMany: vi.fn().mockResolvedValue([{ id: 'supplier-1', slug: 'tcg-hobby' }]),
    },
  };
}

describe('product CSV import', () => {
  it('parses the generated template', () => {
    const rows = parseProductCsv(buildProductCsvTemplate());

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Example Product');
    expect(rows[0]?.rowNumber).toBe(2);
  });

  it('plans a new product when no duplicate exists', async () => {
    const plan = await createProductCsvImportPlan(csv(), planningDb());

    expect(plan.summary).toMatchObject({ totalRows: 1, readyRows: 1, errorRows: 0, creates: 1, updates: 0 });
    expect(plan.rows[0]).toMatchObject({
      action: 'create',
      match: 'new',
      publicStockState: 'LOW_STOCK',
    });
  });

  it('matches an existing product by SKU before slug fallback', async () => {
    const db = planningDb([{ id: 'product-1', sku: 'CSV-PRODUCT-001', barcode: null, slug: 'different-slug' }]);
    const plan = await createProductCsvImportPlan(csv({ slug: 'csv-product' }), db);

    expect(plan.rows[0]).toMatchObject({
      action: 'update',
      match: 'sku',
      existingProductId: 'product-1',
    });
  });

  it('matches an existing product by slug when SKU and barcode do not match', async () => {
    const db = planningDb([{ id: 'product-2', sku: 'OTHER-SKU', barcode: null, slug: 'csv-product' }]);
    const plan = await createProductCsvImportPlan(csv(), db);

    expect(plan.rows[0]).toMatchObject({
      action: 'update',
      match: 'slug',
      existingProductId: 'product-2',
    });
  });

  it('reports missing canonical lookup data clearly', async () => {
    const db = {
      product: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
      supplier: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const plan = await createProductCsvImportPlan(csv(), db);

    expect(plan.summary.errorRows).toBe(1);
    expect(plan.rows[0]?.errors).toContain('Category sealed-product does not exist.');
    expect(plan.rows[0]?.errors).toContain('Supplier tcg-hobby does not exist.');
  });

  it('rejects invalid prices, stock and repeated identities before import', async () => {
    const [header, firstRow] = csv({ priceMinor: '49.99', stockOnHand: '-1' }).split('\n');
    const [, secondRow] = csv({ name: 'Second CSV Product' }).split('\n');
    const invalidCsv = `${header}\n${firstRow}\n${secondRow}`;
    const plan = await createProductCsvImportPlan(invalidCsv, planningDb());

    expect(plan.summary.errorRows).toBe(2);
    expect(plan.rows[0]?.errors).toContain('priceMinor must be a whole number.');
    expect(plan.rows[0]?.errors).toContain('stockOnHand must be at least 0.');
    expect(plan.rows[1]?.errors).toContain('SKU CSV-PRODUCT-001 appears more than once in this CSV.');
  });

  it('does not execute a transaction when preview contains row errors', async () => {
    const db = {
      ...planningDb(),
      $transaction: vi.fn(),
    };

    await expect(executeProductCsvImport(csv({ categorySlug: 'missing-category' }), {}, db)).rejects.toThrow('CSV import has 1 row error');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
