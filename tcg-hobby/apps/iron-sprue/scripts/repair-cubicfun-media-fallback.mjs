import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const BAD_FALLBACK_URL = 'https://www.tasmaproducts.com/cubic-fun/c007h-era-of-navigation';
const VALID_FALLBACK_SKU = 'IS-CUB-C007H';
const SYSTEM_ACTOR_ID = 'iron-sprue-media-fallback-repair';

function parseEnvFile(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[name] = value;
  }
  return values;
}

async function loadEnv() {
  const fileEnv = parseEnvFile(await readFile(envPath, 'utf8'));
  return {
    databaseUrl: process.env.IRON_SPRUE_DATABASE_URL?.trim() || fileEnv.IRON_SPRUE_DATABASE_URL?.trim(),
    endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    accessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
  };
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function listKeys(client, prefix) {
  const keys = [];
  let ContinuationToken;
  do {
    const result = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken }));
    keys.push(...(result.Contents ?? []).map((item) => item.Key).filter(Boolean));
    ContinuationToken = result.NextContinuationToken;
  } while (ContinuationToken);
  return keys;
}

async function deleteKeys(client, keys) {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (batch.length === 0) continue;
    await client.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: batch.map((Key) => ({ Key })) } }));
  }
}

async function main() {
  const env = await loadEnv();
  if (env.bucket !== BUCKET) throw new Error(`Active bucket must be ${BUCKET}.`);
  if (!env.databaseUrl || !env.endpoint || !env.accessKeyId || !env.secretAccessKey) throw new Error('Iron Sprue DB/R2 config is required.');

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, max: 5 }) });
  const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
  const report = { repairedSkus: [], deletedObjectCount: 0, recreatedPlaceholders: 0 };

  try {
    const badReviews = await prisma.ironSprueAdminContentReview.findMany({
      where: {
        storeCode: STORE_CODE,
        fieldName: 'media-pilot',
        proposedValue: { path: ['sourcePageUrl'], equals: BAD_FALLBACK_URL },
        product: { sku: { not: VALID_FALLBACK_SKU } },
      },
      include: { product: true },
    });

    for (const review of badReviews) {
      const product = review.product;
      const productPart = `${slugify(product.sku)}-${slugify(product.slug)}`;
      const prefixes = [`archive/products/${productPart}/`, `published/products/${productPart}/`, `processed/products/${productPart}/`];
      const keys = (await Promise.all(prefixes.map((prefix) => listKeys(s3, prefix)))).flat();
      await deleteKeys(s3, keys);

      await prisma.$transaction(async (tx) => {
        await tx.ironSprueAdminContentReview.deleteMany({ where: { storeCode: STORE_CODE, productId: product.id, fieldName: 'media-pilot' } });
        await tx.ironSprueAdminMediaAsset.deleteMany({ where: { storeCode: STORE_CODE, productId: product.id } });
        await tx.ironSprueAdminMediaAsset.create({
          data: {
            storeCode: STORE_CODE,
            productId: product.id,
            role: 'manufacturer-original',
            storageKey: `archive/products/${product.sku.toLowerCase()}/original/source-required.json`,
            altText: `${product.sourceTitle} authorised source reference`,
            mimeType: 'application/json',
            approvalState: 'PENDING',
            isPrimary: false,
            sortOrder: 10,
            uploadedById: SYSTEM_ACTOR_ID,
            lastError: 'Source link unresolved after fallback correction; manufacturer/source media still needs acquisition and R2 upload.',
          },
        });
        await tx.ironSprueAdminMediaAsset.create({
          data: {
            storeCode: STORE_CODE,
            productId: product.id,
            role: 'catalogue-primary',
            storageKey: `published/products/${product.sku.toLowerCase()}/catalogue-primary-placeholder.json`,
            altText: `${product.customerTitle} storefront primary image`,
            mimeType: 'application/json',
            approvalState: 'FAILED',
            isPrimary: false,
            sortOrder: 20,
            uploadedById: SYSTEM_ACTOR_ID,
            lastError: 'Image 2 storefront primary is required before publication.',
          },
        });
      });

      report.repairedSkus.push(product.sku);
      report.deletedObjectCount += keys.length;
      report.recreatedPlaceholders += 2;
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
