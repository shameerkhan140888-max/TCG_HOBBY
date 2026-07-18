import { Prisma, ProductCondition } from '@prisma/client';
import { slugify } from '@tcg-hobby/utils';
import { prisma } from './client';
import { derivePublicStockState } from './product-import';

export const PRODUCT_CSV_IMPORT_HEADERS = [
  'name',
  'sku',
  'slug',
  'barcode',
  'brand',
  'game',
  'categorySlug',
  'supplierSlug',
  'productType',
  'language',
  'condition',
  'priceMinor',
  'vatRate',
  'costMinor',
  'rrpMinor',
  'salePriceMinor',
  'saleStartsAt',
  'saleEndsAt',
  'stockOnHand',
  'reorderPoint',
  'reorderQuantity',
  'incomingQuantity',
  'locationCode',
  'supplierSku',
  'supplierProductUrl',
  'minimumOrderQuantity',
  'packQuantity',
  'supplierLeadTimeDays',
  'description',
  'longDescription',
  'primaryImageUrl',
  'primaryImageAlt',
  'imageLabel',
  'featured',
  'published',
  'hideWhenOutOfStock',
  'customerPurchaseLimit',
  'freeUkStandardShipping',
  'shippingPromotionProductOnly',
  'homepagePriority',
  'heroFeatured',
  'recommendationWeight',
  'isAccessory',
  'isStaffPick',
  'isBestSeller',
  'isNewArrival',
  'seoTitle',
  'metaDescription',
  'canonicalUrl',
  'ogImageUrl',
  'noindex',
] as const;

type ProductCsvHeader = (typeof PRODUCT_CSV_IMPORT_HEADERS)[number];

export type ProductCsvImportRow = Record<ProductCsvHeader, string> & {
  rowNumber: number;
};

export type ProductCsvImportMatchType = 'new' | 'sku' | 'barcode' | 'slug';
export type ProductCsvImportRowStatus = 'ready' | 'error';

export type ProductCsvImportPlanRow = {
  rowNumber: number;
  name: string;
  sku: string;
  slug: string;
  categorySlug: string;
  supplierSlug: string;
  match: ProductCsvImportMatchType;
  existingProductId: string | null;
  action: 'create' | 'update';
  status: ProductCsvImportRowStatus;
  errors: string[];
  warnings: string[];
  publicStockState: ReturnType<typeof derivePublicStockState>;
};

export type ProductCsvImportPlan = {
  rows: ProductCsvImportPlanRow[];
  summary: {
    totalRows: number;
    readyRows: number;
    errorRows: number;
    creates: number;
    updates: number;
  };
};

export type ProductCsvImportResult = ProductCsvImportPlan['summary'] & {
  productIds: string[];
  reportRows: Array<{
    rowNumber: number;
    action: 'created' | 'updated';
    productId: string;
    slug: string;
  }>;
};

type ProductIdentityRow = {
  id: string;
  sku: string;
  barcode: string | null;
  slug: string;
};

type LookupRow = {
  id: string;
  slug: string;
};

type ProductCsvPlanningDatabase = {
  product: {
    findMany(args: Prisma.ProductFindManyArgs): Promise<ProductIdentityRow[]>;
  };
  category: {
    findMany(args: Prisma.CategoryFindManyArgs): Promise<LookupRow[]>;
  };
  supplier: {
    findMany(args: Prisma.SupplierFindManyArgs): Promise<LookupRow[]>;
  };
};

type ProductCsvExecutionDatabase = ProductCsvPlanningDatabase & {
  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

export type ProductCsvImportOptions = {
  performedBy?: string;
};

const REQUIRED_HEADERS: ProductCsvHeader[] = [
  'name',
  'sku',
  'categorySlug',
  'supplierSlug',
  'game',
  'priceMinor',
  'vatRate',
  'costMinor',
  'stockOnHand',
  'description',
  'longDescription',
];

const PRODUCT_CONDITIONS = Object.values(ProductCondition);

function normalizeCell(value: string | undefined): string {
  return (value ?? '').trim();
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim())) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim())) {
    rows.push(currentRow);
  }

  if (inQuotes) {
    throw new Error('CSV contains an unterminated quoted value.');
  }

  return rows;
}

export function parseProductCsv(csvText: string): ProductCsvImportRow[] {
  const rows = parseCsvRows(csvText.trim());
  const [rawHeaders, ...rawDataRows] = rows;

  if (!rawHeaders?.length) {
    throw new Error('CSV is empty.');
  }

  const headers = rawHeaders.map((header) => normalizeCell(header));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}.`);
  }

  const unsupportedHeaders = headers.filter((header) => !PRODUCT_CSV_IMPORT_HEADERS.includes(header as ProductCsvHeader));
  if (unsupportedHeaders.length) {
    throw new Error(`CSV contains unsupported headers: ${unsupportedHeaders.join(', ')}.`);
  }

  return rawDataRows.map((cells, rowIndex) => {
    const row = Object.fromEntries(PRODUCT_CSV_IMPORT_HEADERS.map((header) => [header, ''])) as Record<ProductCsvHeader, string>;
    headers.forEach((header, headerIndex) => {
      row[header as ProductCsvHeader] = normalizeCell(cells[headerIndex]);
    });

    return {
      ...row,
      rowNumber: rowIndex + 2,
    };
  });
}

function parseIntegerCell(value: string, field: ProductCsvHeader, errors: string[], options: { required?: boolean; min?: number } = {}): number | null {
  if (!value) {
    if (options.required) errors.push(`${field} is required.`);
    return null;
  }

  if (!/^-?\d+$/.test(value)) {
    errors.push(`${field} must be a whole number.`);
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (options.min !== undefined && parsed < options.min) {
    errors.push(`${field} must be at least ${options.min}.`);
  }

  return parsed;
}

function parseBooleanCell(value: string, fallback: boolean, field: ProductCsvHeader, errors: string[]): boolean {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(normalized)) return true;
  if (['false', 'no', '0', 'off'].includes(normalized)) return false;
  errors.push(`${field} must be true or false.`);
  return fallback;
}

function parseOptionalDateCell(value: string, field: ProductCsvHeader, errors: string[]): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${field} must be a valid ISO date or datetime.`);
    return null;
  }
  return parsed;
}

function validateSlug(value: string, field: ProductCsvHeader, errors: string[]): void {
  if (value && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push(`${field} must use lowercase letters, numbers and hyphens.`);
  }
}

function validateManagedUrl(value: string, field: ProductCsvHeader, errors: string[]): void {
  if (!value) return;
  if (value.startsWith('/')) return;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return;
  } catch {
    // handled below
  }

  errors.push(`${field} must be an http(s) URL or managed path.`);
}

function resolveMatch(row: ProductCsvImportRow, products: ProductIdentityRow[]): { match: ProductCsvImportMatchType; product: ProductIdentityRow | null } {
  const skuMatch = products.find((product) => product.sku === row.sku);
  if (skuMatch) return { match: 'sku', product: skuMatch };

  const barcodeMatch = row.barcode ? products.find((product) => product.barcode === row.barcode) ?? null : null;
  if (barcodeMatch) return { match: 'barcode', product: barcodeMatch };

  const slugMatch = products.find((product) => product.slug === row.slug);
  if (slugMatch) return { match: 'slug', product: slugMatch };

  return { match: 'new', product: null };
}

export function buildProductCsvTemplate(): string {
  return [
    PRODUCT_CSV_IMPORT_HEADERS.join(','),
    [
      'Example Product',
      'EXAMPLE-SKU-001',
      'example-product',
      '',
      'Pokemon TCG',
      'Pokemon TCG',
      'sealed-product',
      'tcg-hobby',
      'Premium Collection',
      'English',
      'SEALED',
      '4999',
      '20',
      '3500',
      '',
      '',
      '',
      '',
      '3',
      '1',
      '0',
      '0',
      'MAIN',
      'EXAMPLE-SUPPLIER-SKU',
      '',
      '1',
      '',
      '7',
      'Short customer-facing description.',
      'Long customer-facing product description.',
      '/products/example/primary.webp',
      'Example Product primary image',
      'Example Product',
      'false',
      'false',
      'false',
      '',
      'false',
      'true',
      '',
      'false',
      '0',
      'false',
      'false',
      'false',
      'false',
      '',
      '',
      '',
      '',
      'false',
    ]
      .map((cell) => (cell.includes(',') ? `"${cell.replaceAll('"', '""')}"` : cell))
      .join(','),
  ].join('\n');
}

export async function createProductCsvImportPlan(csvText: string, db: ProductCsvPlanningDatabase = prisma): Promise<ProductCsvImportPlan> {
  const rows = parseProductCsv(csvText);
  const slugs = rows.map((row) => row.slug || slugify(row.name)).filter(Boolean);
  const skus = rows.map((row) => row.sku).filter(Boolean);
  const barcodes = rows.map((row) => row.barcode).filter(Boolean);
  const categorySlugs = [...new Set(rows.map((row) => row.categorySlug).filter(Boolean))];
  const supplierSlugs = [...new Set(rows.map((row) => row.supplierSlug).filter(Boolean))];
  const productIdentityFilters: Prisma.ProductWhereInput[] = [
    ...(skus.length ? [{ sku: { in: skus } }] : []),
    ...(barcodes.length ? [{ barcode: { in: barcodes } }] : []),
    ...(slugs.length ? [{ slug: { in: slugs } }] : []),
  ];

  const [products, categories, suppliers] = await Promise.all([
    db.product.findMany({
      where: productIdentityFilters.length ? { OR: productIdentityFilters } : { id: { in: [] } },
      select: { id: true, sku: true, barcode: true, slug: true },
    }),
    db.category.findMany({ where: { slug: { in: categorySlugs } }, select: { id: true, slug: true } }),
    db.supplier.findMany({ where: { slug: { in: supplierSlugs } }, select: { id: true, slug: true } }),
  ]);

  const categorySet = new Set(categories.map((category) => category.slug));
  const supplierSet = new Set(suppliers.map((supplier) => supplier.slug));
  const seenSkus = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenBarcodes = new Set<string>();

  const planRows = rows.map((row): ProductCsvImportPlanRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const slug = row.slug || slugify(row.name);

    if (!row.name) errors.push('name is required.');
    if (!row.sku) errors.push('sku is required.');
    if (!row.game) errors.push('game is required.');
    if (!row.description) errors.push('description is required.');
    if (!row.longDescription) errors.push('longDescription is required.');
    if (!row.categorySlug) errors.push('categorySlug is required.');
    if (!row.supplierSlug) errors.push('supplierSlug is required.');
    validateSlug(slug, 'slug', errors);
    validateSlug(row.categorySlug, 'categorySlug', errors);
    validateSlug(row.supplierSlug, 'supplierSlug', errors);

    if (row.categorySlug && !categorySet.has(row.categorySlug)) errors.push(`Category ${row.categorySlug} does not exist.`);
    if (row.supplierSlug && !supplierSet.has(row.supplierSlug)) errors.push(`Supplier ${row.supplierSlug} does not exist.`);

    const condition = row.condition || ProductCondition.SEALED;
    if (!PRODUCT_CONDITIONS.includes(condition as ProductCondition)) {
      errors.push(`condition must be one of: ${PRODUCT_CONDITIONS.join(', ')}.`);
    }

    const priceMinor = parseIntegerCell(row.priceMinor, 'priceMinor', errors, { required: true, min: 0 }) ?? 0;
    parseIntegerCell(row.vatRate, 'vatRate', errors, { required: true, min: 0 });
    parseIntegerCell(row.costMinor, 'costMinor', errors, { required: true, min: 0 });
    parseIntegerCell(row.rrpMinor, 'rrpMinor', errors, { min: 0 });
    parseIntegerCell(row.salePriceMinor, 'salePriceMinor', errors, { min: 0 });
    const stockOnHand = parseIntegerCell(row.stockOnHand, 'stockOnHand', errors, { required: true, min: 0 }) ?? 0;
    parseIntegerCell(row.reorderPoint, 'reorderPoint', errors, { min: 0 });
    parseIntegerCell(row.reorderQuantity, 'reorderQuantity', errors, { min: 0 });
    parseIntegerCell(row.incomingQuantity, 'incomingQuantity', errors, { min: 0 });
    parseIntegerCell(row.minimumOrderQuantity, 'minimumOrderQuantity', errors, { min: 1 });
    parseIntegerCell(row.packQuantity, 'packQuantity', errors, { min: 1 });
    parseIntegerCell(row.supplierLeadTimeDays, 'supplierLeadTimeDays', errors, { min: 0 });
    parseIntegerCell(row.customerPurchaseLimit, 'customerPurchaseLimit', errors, { min: 1 });
    parseIntegerCell(row.homepagePriority, 'homepagePriority', errors, { min: 0 });
    parseIntegerCell(row.recommendationWeight, 'recommendationWeight', errors, { min: 0 });
    parseOptionalDateCell(row.saleStartsAt, 'saleStartsAt', errors);
    parseOptionalDateCell(row.saleEndsAt, 'saleEndsAt', errors);
    validateManagedUrl(row.primaryImageUrl, 'primaryImageUrl', errors);
    validateManagedUrl(row.supplierProductUrl, 'supplierProductUrl', errors);
    validateManagedUrl(row.canonicalUrl, 'canonicalUrl', errors);
    validateManagedUrl(row.ogImageUrl, 'ogImageUrl', errors);
    parseBooleanCell(row.featured, false, 'featured', errors);
    parseBooleanCell(row.published, false, 'published', errors);
    parseBooleanCell(row.hideWhenOutOfStock, false, 'hideWhenOutOfStock', errors);
    parseBooleanCell(row.freeUkStandardShipping, false, 'freeUkStandardShipping', errors);
    parseBooleanCell(row.shippingPromotionProductOnly, true, 'shippingPromotionProductOnly', errors);
    parseBooleanCell(row.heroFeatured, false, 'heroFeatured', errors);
    parseBooleanCell(row.isAccessory, false, 'isAccessory', errors);
    parseBooleanCell(row.isStaffPick, false, 'isStaffPick', errors);
    parseBooleanCell(row.isBestSeller, false, 'isBestSeller', errors);
    parseBooleanCell(row.isNewArrival, false, 'isNewArrival', errors);
    parseBooleanCell(row.noindex, false, 'noindex', errors);

    if (priceMinor === 0) warnings.push('Retail price is zero; confirm this is intentional.');
    if (row.sku && seenSkus.has(row.sku)) errors.push(`SKU ${row.sku} appears more than once in this CSV.`);
    if (slug && seenSlugs.has(slug)) errors.push(`Slug ${slug} appears more than once in this CSV.`);
    if (row.barcode && seenBarcodes.has(row.barcode)) errors.push(`Barcode ${row.barcode} appears more than once in this CSV.`);
    if (row.sku) seenSkus.add(row.sku);
    if (slug) seenSlugs.add(slug);
    if (row.barcode) seenBarcodes.add(row.barcode);

    const match = resolveMatch({ ...row, slug }, products);

    return {
      rowNumber: row.rowNumber,
      name: row.name,
      sku: row.sku,
      slug,
      categorySlug: row.categorySlug,
      supplierSlug: row.supplierSlug,
      match: match.match,
      existingProductId: match.product?.id ?? null,
      action: match.product ? 'update' : 'create',
      status: errors.length ? 'error' : 'ready',
      errors,
      warnings,
      publicStockState: derivePublicStockState(stockOnHand),
    };
  });

  return {
    rows: planRows,
    summary: {
      totalRows: planRows.length,
      readyRows: planRows.filter((row) => row.status === 'ready').length,
      errorRows: planRows.filter((row) => row.status === 'error').length,
      creates: planRows.filter((row) => row.action === 'create' && row.status === 'ready').length,
      updates: planRows.filter((row) => row.action === 'update' && row.status === 'ready').length,
    },
  };
}

function buildSearchText(row: ProductCsvImportRow, slug: string): string {
  return [row.name, row.sku, row.barcode, row.brand, row.game, row.productType, row.description, row.longDescription, slug].filter(Boolean).join(' ').toLowerCase();
}

function productDataFromRow(row: ProductCsvImportRow, categoryId: string, slug: string): Prisma.ProductCreateInput | Prisma.ProductUpdateInput {
  return {
    sku: row.sku,
    barcode: row.barcode || null,
    slug,
    name: row.name,
    brand: row.brand || null,
    game: row.game,
    productType: row.productType || null,
    language: row.language || null,
    description: row.description,
    longDescription: row.longDescription,
    condition: (row.condition || ProductCondition.SEALED) as ProductCondition,
    priceMinor: Number.parseInt(row.priceMinor, 10),
    rrpMinor: row.rrpMinor ? Number.parseInt(row.rrpMinor, 10) : null,
    salePriceMinor: row.salePriceMinor ? Number.parseInt(row.salePriceMinor, 10) : null,
    saleStartsAt: row.saleStartsAt ? new Date(row.saleStartsAt) : null,
    saleEndsAt: row.saleEndsAt ? new Date(row.saleEndsAt) : null,
    vatRate: Number.parseInt(row.vatRate, 10),
    currency: 'GBP',
    featured: parseBooleanCell(row.featured, false, 'featured', []),
    homepagePriority: row.homepagePriority ? Number.parseInt(row.homepagePriority, 10) : null,
    heroFeatured: parseBooleanCell(row.heroFeatured, false, 'heroFeatured', []),
    recommendationWeight: row.recommendationWeight ? Number.parseInt(row.recommendationWeight, 10) : 0,
    isAccessory: parseBooleanCell(row.isAccessory, false, 'isAccessory', []),
    isStaffPick: parseBooleanCell(row.isStaffPick, false, 'isStaffPick', []),
    isBestSeller: parseBooleanCell(row.isBestSeller, false, 'isBestSeller', []),
    isNewArrival: parseBooleanCell(row.isNewArrival, false, 'isNewArrival', []),
    freeUkStandardShipping: parseBooleanCell(row.freeUkStandardShipping, false, 'freeUkStandardShipping', []),
    shippingPromotionProductOnly: parseBooleanCell(row.shippingPromotionProductOnly, true, 'shippingPromotionProductOnly', []),
    published: parseBooleanCell(row.published, false, 'published', []),
    hideWhenOutOfStock: parseBooleanCell(row.hideWhenOutOfStock, false, 'hideWhenOutOfStock', []),
    lifecycleState: parseBooleanCell(row.published, false, 'published', []) ? 'PUBLISHED' : 'DRAFT',
    customerPurchaseLimit: row.customerPurchaseLimit ? Number.parseInt(row.customerPurchaseLimit, 10) : null,
    availabilityMessage: null,
    searchText: buildSearchText(row, slug),
    imageLabel: row.imageLabel || row.name,
    category: { connect: { id: categoryId } },
    seoTitle: row.seoTitle || null,
    metaDescription: row.metaDescription || null,
    canonicalUrl: row.canonicalUrl || null,
    ogImageUrl: row.ogImageUrl || row.primaryImageUrl || null,
    noindex: parseBooleanCell(row.noindex, false, 'noindex', []),
    importSourceType: 'CSV_ADMIN',
    importSourceReference: 'admin-csv',
    importedAt: new Date(),
    lastImportedAt: new Date(),
  };
}

export async function executeProductCsvImport(
  csvText: string,
  options: ProductCsvImportOptions = {},
  db: ProductCsvExecutionDatabase = prisma,
): Promise<ProductCsvImportResult> {
  const plan = await createProductCsvImportPlan(csvText, db);
  if (plan.summary.errorRows > 0) {
    throw new Error(`CSV import has ${plan.summary.errorRows} row error(s). Preview and fix the file before importing.`);
  }

  const rows = parseProductCsv(csvText);
  const categorySlugs = [...new Set(rows.map((row) => row.categorySlug))];
  const supplierSlugs = [...new Set(rows.map((row) => row.supplierSlug))];

  const reportRows = await db.$transaction(async (tx) => {
    const [categories, suppliers] = await Promise.all([
      tx.category.findMany({ where: { slug: { in: categorySlugs } }, select: { id: true, slug: true } }),
      tx.supplier.findMany({ where: { slug: { in: supplierSlugs } }, select: { id: true, slug: true } }),
    ]);
    const categoriesBySlug = new Map(categories.map((category) => [category.slug, category.id]));
    const suppliersBySlug = new Map(suppliers.map((supplier) => [supplier.slug, supplier.id]));

    const importRows: ProductCsvImportResult['reportRows'] = [];

    for (const row of rows) {
      const planRow = plan.rows.find((candidate) => candidate.rowNumber === row.rowNumber);
      if (!planRow || planRow.status !== 'ready') {
        throw new Error(`Row ${row.rowNumber} is not ready to import.`);
      }

      const categoryId = categoriesBySlug.get(row.categorySlug);
      const supplierId = suppliersBySlug.get(row.supplierSlug);
      if (!categoryId) throw new Error(`Category ${row.categorySlug} does not exist.`);
      if (!supplierId) throw new Error(`Supplier ${row.supplierSlug} does not exist.`);

      const slug = planRow.slug;
      const costMinor = Number.parseInt(row.costMinor, 10);
      const productData = productDataFromRow(row, categoryId, slug);
      const now = new Date();
      const product = planRow.existingProductId
        ? await tx.product.update({
            where: { id: planRow.existingProductId },
            data: productData as Prisma.ProductUpdateInput,
            select: { id: true, slug: true },
          })
        : await tx.product.create({
            data: productData as Prisma.ProductCreateInput,
            select: { id: true, slug: true },
          });

      await tx.inventoryItem.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          stockOnHand: Number.parseInt(row.stockOnHand, 10),
          reservedStock: 0,
          reorderPoint: row.reorderPoint ? Number.parseInt(row.reorderPoint, 10) : 0,
          reorderQuantity: row.reorderQuantity ? Number.parseInt(row.reorderQuantity, 10) : 0,
          incomingQuantity: row.incomingQuantity ? Number.parseInt(row.incomingQuantity, 10) : 0,
          locationCode: row.locationCode || 'MAIN',
        },
        update: {
          stockOnHand: Number.parseInt(row.stockOnHand, 10),
          reorderPoint: row.reorderPoint ? Number.parseInt(row.reorderPoint, 10) : 0,
          reorderQuantity: row.reorderQuantity ? Number.parseInt(row.reorderQuantity, 10) : 0,
          incomingQuantity: row.incomingQuantity ? Number.parseInt(row.incomingQuantity, 10) : 0,
          locationCode: row.locationCode || 'MAIN',
        },
      });

      await tx.supplierProduct.deleteMany({ where: { productId: product.id } });
      await tx.supplierProduct.create({
        data: {
          productId: product.id,
          supplierId,
          supplierSku: row.supplierSku || row.sku,
          supplierProductUrl: row.supplierProductUrl || null,
          costMinor,
          minimumOrderQuantity: row.minimumOrderQuantity ? Number.parseInt(row.minimumOrderQuantity, 10) : 1,
          packQuantity: row.packQuantity ? Number.parseInt(row.packQuantity, 10) : null,
          currency: 'GBP',
          leadTimeDays: row.supplierLeadTimeDays ? Number.parseInt(row.supplierLeadTimeDays, 10) : 7,
          lastPriceUpdatedAt: now,
          preferred: true,
        },
      });

      if (row.primaryImageUrl) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.create({
          data: {
            productId: product.id,
            url: row.primaryImageUrl,
            altText: row.primaryImageAlt || row.imageLabel || row.name,
            imageType: 'primary',
            sortOrder: 0,
            isPrimary: true,
          },
        });
      }

      await tx.productImportAudit.create({
        data: {
          productId: product.id,
          importId: null,
          sourceType: 'CSV_ADMIN',
          sourceReference: 'admin-csv',
          lifecycleState: parseBooleanCell(row.published, false, 'published', []) ? 'PUBLISHED' : 'DRAFT',
          changedFields: ['csvImport'],
          previousValues: planRow.action === 'update' ? { matchedBy: planRow.match } : Prisma.JsonNull,
          nextValues: { slug: product.slug, sku: row.sku, publicStockState: planRow.publicStockState },
          warnings: planRow.warnings.join('\n') || null,
          performedBy: options.performedBy ?? 'Admin CSV Import',
        },
      });

      importRows.push({
        rowNumber: row.rowNumber,
        action: planRow.action === 'create' ? 'created' : 'updated',
        productId: product.id,
        slug: product.slug,
      });
    }

    return importRows;
  });

  return {
    ...plan.summary,
    productIds: reportRows.map((row) => row.productId),
    reportRows,
  };
}
