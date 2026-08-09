import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const envPath = path.join(appRoot, '.env.local');
const STORE_CODE = 'IRON_SPRUE';
const SYSTEM_ACTOR_ID = 'iron-sprue-launch-import';

function parseEnvFile(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

async function loadIronSprueDatabaseUrl() {
  const envText = await readFile(envPath, 'utf8');
  const env = parseEnvFile(envText);
  const url = process.env.IRON_SPRUE_DATABASE_URL?.trim() || env.IRON_SPRUE_DATABASE_URL?.trim();
  if (!url) throw new Error('IRON_SPRUE_DATABASE_URL is required for the launch catalogue import.');
  return url;
}

function redactDatabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  return {
    protocol: url.protocol,
    host: url.hostname,
    database: url.pathname.replace(/^\//, ''),
    sslmode: url.searchParams.get('sslmode') ?? null,
  };
}

function assertIronSprueTarget(rawUrl) {
  const url = new URL(rawUrl);
  if (!/neon\.tech$/i.test(url.hostname)) {
    throw new Error('Iron Sprue launch import must target the dedicated Neon host.');
  }
  if (/tcg[-_]?hobby/i.test(url.hostname) || /tcg[-_]?hobby/i.test(url.pathname)) {
    throw new Error('Iron Sprue launch import resolved a TCG Hobby-looking database target.');
  }
  const disallowedNames = ['TCG_HOBBY_DATABASE_URL', 'TCG_DATABASE_URL', 'DIRECT_DATABASE_URL'];
  for (const name of disallowedNames) {
    if (process.env[name]?.trim() && process.env[name].trim() === rawUrl) {
      throw new Error(`Iron Sprue launch import must not reuse ${name}.`);
    }
  }
}

function assertManifest(manifest) {
  if (manifest.storeCode !== STORE_CODE) throw new Error('Manifest is not scoped to IRON_SPRUE.');
  if (!Array.isArray(manifest.products) || manifest.products.length === 0) throw new Error('Manifest has no products.');
  const duplicateSkus = new Set();
  const seenSkus = new Set();
  for (const product of manifest.products) {
    if (product.storeCode !== STORE_CODE) throw new Error(`Product ${product.sku} is not Iron Sprue-scoped.`);
    if (!product.sku?.startsWith('IS-')) throw new Error(`Product ${product.sku} has an invalid Iron Sprue SKU.`);
    if (seenSkus.has(product.sku)) duplicateSkus.add(product.sku);
    seenSkus.add(product.sku);
    if (product.retailPriceMinor <= 0) throw new Error(`Product ${product.sku} is missing a positive retail price.`);
    if (product.receivedQuantity < 0 || product.expectedQuantity < 0 || product.availableQuantity < 0) {
      throw new Error(`Product ${product.sku} has invalid inventory quantities.`);
    }
  }
  if (duplicateSkus.size > 0) throw new Error(`Duplicate SKUs in manifest: ${[...duplicateSkus].join(', ')}`);
}

function checksumManifest(text) {
  return createHash('sha256').update(text).digest('hex');
}

function publicationState(product) {
  if (product.publicationState === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (product.imageUrl) return 'CONTENT_PENDING';
  return 'MEDIA_PENDING';
}

function sourceReference(manifest, product) {
  return `${manifest.sourceDocument}#${manifest.sourceSheet}:row-${product.sourceRow}`;
}

async function main() {
  const manifestText = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  assertManifest(manifest);

  const databaseUrl = await loadIronSprueDatabaseUrl();
  assertIronSprueTarget(databaseUrl);
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: databaseUrl,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
      max: 5,
    }),
  });

  const dryRun = process.argv.includes('--dry-run');
  const sourceChecksum = manifest.sourceChecksum || checksumManifest(manifestText);
  const target = redactDatabaseUrl(databaseUrl);

  try {
    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            mode: 'dry-run',
            target,
            batch: manifest.importBatchId,
            products: manifest.products.length,
            units: manifest.summary.physicalUnitsSupplied,
            reviewRequired: manifest.summary.reviewRequiredRows,
          },
          null,
          2,
        ),
      );
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        const supplierBySlug = new Map();
        for (const supplier of manifest.suppliers) {
          const record = await tx.ironSprueAdminSupplier.upsert({
            where: { storeCode_slug: { storeCode: STORE_CODE, slug: supplier.slug } },
            create: {
              storeCode: STORE_CODE,
              name: supplier.name,
              slug: supplier.slug,
              website: supplier.website,
              internalNotes: supplier.internalNotes,
              active: supplier.active,
            },
            update: {
              name: supplier.name,
              website: supplier.website,
              internalNotes: supplier.internalNotes,
              active: supplier.active,
            },
          });
          supplierBySlug.set(supplier.slug, record);
        }

        const brandByName = new Map();
        for (const brand of manifest.brands) {
          const record = await tx.ironSprueAdminBrand.upsert({
            where: { storeCode_slug: { storeCode: STORE_CODE, slug: brand.slug } },
            create: {
              storeCode: STORE_CODE,
              name: brand.name,
              slug: brand.slug,
              logoUrl: brand.logoUrl,
              logoAltText: brand.logoAltText,
              website: brand.website,
              sortOrder: brand.sortOrder,
              featured: brand.featured,
              active: brand.active,
            },
            update: {
              name: brand.name,
              logoUrl: brand.logoUrl,
              logoAltText: brand.logoAltText,
              website: brand.website,
              sortOrder: brand.sortOrder,
              featured: brand.featured,
              active: brand.active,
            },
          });
          brandByName.set(brand.name, record);
        }

        const categoryByName = new Map();
        for (const category of manifest.categories) {
          const record = await tx.ironSprueAdminCategory.upsert({
            where: { storeCode_slug: { storeCode: STORE_CODE, slug: category.slug } },
            create: {
              storeCode: STORE_CODE,
              name: category.name,
              slug: category.slug,
              description: category.description,
              sortOrder: category.sortOrder,
              active: category.active,
            },
            update: {
              name: category.name,
              description: category.description,
              sortOrder: category.sortOrder,
              active: category.active,
            },
          });
          categoryByName.set(category.name, record);
        }

        await tx.ironSprueAdminImportBatch.upsert({
          where: { storeCode_sourceChecksum: { storeCode: STORE_CODE, sourceChecksum } },
          create: {
            id: manifest.importBatchId,
            storeCode: STORE_CODE,
            sourceName: manifest.sourceDocument,
            sourceChecksum,
            status: 'IMPORTED',
            totalRows: manifest.summary.totalSourceRows,
            successfulRows: manifest.summary.importableRows,
            failedRows: manifest.summary.reviewRequiredRows,
            skippedRows: 0,
            zeroQuantityRows: manifest.summary.zeroQuantityRows,
            createdById: SYSTEM_ACTOR_ID,
          },
          update: {
            status: 'IMPORTED',
            totalRows: manifest.summary.totalSourceRows,
            successfulRows: manifest.summary.importableRows,
            failedRows: manifest.summary.reviewRequiredRows,
            skippedRows: 0,
            zeroQuantityRows: manifest.summary.zeroQuantityRows,
          },
        });

        const defaultSupplier = supplierBySlug.get('tasma-products');
        for (const product of manifest.products) {
          const brand = brandByName.get(product.brand);
          const category = categoryByName.get(product.category);
          if (!brand) throw new Error(`Missing brand for ${product.sku}.`);
          if (!category) throw new Error(`Missing category for ${product.sku}.`);
          if (!defaultSupplier) throw new Error('Missing Tasma Products supplier record.');

          const record = await tx.ironSprueAdminProduct.upsert({
            where: { storeCode_sku: { storeCode: STORE_CODE, sku: product.sku } },
            create: {
              storeCode: STORE_CODE,
              sourceTitle: product.sourceTitle,
              customerTitle: product.customerTitle,
              slug: product.slug,
              sku: product.sku,
              supplierProductCode: product.supplierSku,
              mpn: product.manufacturerReference,
              brandId: brand.id,
              categoryId: category.id,
              supplierId: defaultSupplier.id,
              shortDescription: product.shortDescription,
              fullDescription: product.description,
              featureBullets: product.features,
              specifications: product.specifications,
              buildType: product.productType,
              tags: product.searchKeywords,
              searchKeywords: product.searchKeywords,
              seoTitle: product.seoTitle,
              metaDescription: product.metaDescription,
              supplierUnitCostMinor: product.supplierUnitCostMinor,
              landedCostMinor: product.tradePriceExVatMinor,
              grossPriceMinor: product.retailPriceMinor,
              compareAtPriceMinor: product.compareAtPriceMinor,
              vatRate: product.vatRate,
              currency: 'GBP',
              publicationState: publicationState(product),
              featured: product.launchRole === 'Hero',
              newArrival: true,
              comingSoon: false,
              hideWhenOutOfStock: false,
              createdById: SYSTEM_ACTOR_ID,
              updatedById: SYSTEM_ACTOR_ID,
            },
            update: {
              sourceTitle: product.sourceTitle,
              customerTitle: product.customerTitle,
              slug: product.slug,
              supplierProductCode: product.supplierSku,
              mpn: product.manufacturerReference,
              brandId: brand.id,
              categoryId: category.id,
              supplierId: defaultSupplier.id,
              shortDescription: product.shortDescription,
              fullDescription: product.description,
              featureBullets: product.features,
              specifications: product.specifications,
              buildType: product.productType,
              tags: product.searchKeywords,
              searchKeywords: product.searchKeywords,
              seoTitle: product.seoTitle,
              metaDescription: product.metaDescription,
              supplierUnitCostMinor: product.supplierUnitCostMinor,
              landedCostMinor: product.tradePriceExVatMinor,
              grossPriceMinor: product.retailPriceMinor,
              compareAtPriceMinor: product.compareAtPriceMinor,
              vatRate: product.vatRate,
              publicationState: publicationState(product),
              featured: product.launchRole === 'Hero',
              newArrival: true,
              updatedById: SYSTEM_ACTOR_ID,
            },
          });

          await tx.ironSprueAdminInventory.upsert({
            where: { productId: record.id },
            create: {
              storeCode: STORE_CODE,
              productId: record.id,
              expectedQuantity: product.expectedQuantity,
              receivedQuantity: product.receivedQuantity,
              damagedQuantity: product.damagedQuantity,
              missingQuantity: product.missingQuantity,
              availableStock: product.availableQuantity,
              reservedStock: product.reservedQuantity,
              reorderPoint: product.reorderLevel,
            },
            update: {
              expectedQuantity: product.expectedQuantity,
              receivedQuantity: product.receivedQuantity,
              damagedQuantity: product.damagedQuantity,
              missingQuantity: product.missingQuantity,
              availableStock: product.availableQuantity,
              reservedStock: product.reservedQuantity,
              reorderPoint: product.reorderLevel,
            },
          });

          const source = sourceReference(manifest, product);
          await tx.ironSprueAdminContentReview.deleteMany({ where: { storeCode: STORE_CODE, productId: record.id } });
          await tx.ironSprueAdminContentReview.create({
            data: {
              storeCode: STORE_CODE,
              productId: record.id,
              fieldName: 'launch-import',
              proposedValue: {
                sourceRow: product.sourceRow,
                retailPriceMinor: product.retailPriceMinor,
                supplierUnitCostMinor: product.supplierUnitCostMinor,
                sourceMediaLinks: product.sourceMediaLinks ?? [],
                validationWarnings: product.validationWarnings,
              },
              sourceReference: source,
              status: product.validationWarnings.length > 0 ? 'CONFLICT' : 'PENDING',
              conflictReason: product.validationWarnings.join(' | ') || null,
            },
          });

          await tx.ironSprueAdminMediaAsset.deleteMany({ where: { storeCode: STORE_CODE, productId: record.id } });
          await tx.ironSprueAdminMediaAsset.create({
            data: {
              storeCode: STORE_CODE,
              productId: record.id,
              role: 'manufacturer-original',
              url: product.imageUrl,
              storageKey: `archive/products/${product.sku.toLowerCase()}/original/source-required.json`,
              altText: `${product.brand} ${product.name}`,
              mimeType: 'application/json',
              approvalState: 'PENDING',
              isPrimary: false,
              sortOrder: 10,
              lastError: product.imageUrl
                ? null
                : product.sourceMediaLinks?.length
                  ? 'Source link recorded from provisional PO; manufacturer/source media still needs acquisition and R2 upload.'
                  : 'Manufacturer/source media still needs acquisition and R2 upload.',
            },
          });
          await tx.ironSprueAdminMediaAsset.create({
            data: {
              storeCode: STORE_CODE,
              productId: record.id,
              role: 'catalogue-primary',
              url: product.imageUrl,
              storageKey: `published/products/${product.sku.toLowerCase()}/catalogue-primary-placeholder.json`,
              altText: `${product.name} storefront primary image`,
              mimeType: product.imageUrl ? 'image/jpeg' : 'application/json',
              approvalState: product.imageUrl ? 'PENDING' : 'FAILED',
              isPrimary: Boolean(product.imageUrl),
              sortOrder: 20,
              lastError: product.imageUrl ? null : 'Image 2 storefront primary is required before publication.',
            },
          });
        }
      },
      { timeout: 60_000 },
    );

    const counts = await Promise.all([
      prisma.ironSprueAdminProduct.count({ where: { storeCode: STORE_CODE } }),
      prisma.ironSprueAdminInventory.aggregate({ where: { storeCode: STORE_CODE }, _sum: { expectedQuantity: true, receivedQuantity: true, availableStock: true } }),
      prisma.ironSprueAdminProduct.count({ where: { storeCode: STORE_CODE, publicationState: 'REVIEW_REQUIRED' } }),
    ]);

    console.log(
      JSON.stringify(
        {
          mode: 'imported',
          target,
          batch: manifest.importBatchId,
          products: counts[0],
          expectedUnits: counts[1]._sum.expectedQuantity,
          receivedUnits: counts[1]._sum.receivedQuantity,
          availableUnits: counts[1]._sum.availableStock,
          reviewRequired: counts[2],
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
