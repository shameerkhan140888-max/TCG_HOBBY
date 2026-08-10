import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'media-integrity-report.json');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const REPAIR_STALE = process.argv.includes('--repair-stale');

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

async function listKeys(s3) {
  const keys = new Set();
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken }));
    for (const item of page.Contents ?? []) {
      if (item.Key) keys.add(item.Key);
    }
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return keys;
}

function countBy(items, pick) {
  return items.reduce((counts, item) => {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

const env = await loadEnv();
if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.endpoint,
  credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
});
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
});

try {
  const keys = await listKeys(s3);
  const [products, suppliers, categories, mediaAssets] = await Promise.all([
    prisma.ironSprueAdminProduct.count({ where: { storeCode: STORE_CODE } }),
    prisma.ironSprueAdminSupplier.count({ where: { storeCode: STORE_CODE } }),
    prisma.ironSprueAdminCategory.count({ where: { storeCode: STORE_CODE } }),
    prisma.ironSprueAdminMediaAsset.findMany({
      where: { storeCode: STORE_CODE },
      select: { id: true, productId: true, role: true, storageKey: true, approvalState: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const brokenReferences = mediaAssets
    .filter((asset) => asset.storageKey && !keys.has(asset.storageKey))
    .map((asset) => ({ id: asset.id, productId: asset.productId, role: asset.role, storageKey: asset.storageKey }));
  if (REPAIR_STALE && brokenReferences.length > 0) {
    await prisma.ironSprueAdminMediaAsset.deleteMany({
      where: { id: { in: brokenReferences.map((asset) => asset.id) } },
    });
  }

  const unreferencedProductObjects = [...keys]
    .filter((key) => /^(archive|processed|products)\/products\//.test(key))
    .filter((key) => !/^archive\/products\/.+\/original\//.test(key))
    .filter((key) => !mediaAssets.some((asset) => asset.storageKey === key));

  const report = {
    generatedAt: new Date().toISOString(),
    products,
    suppliers,
    categories,
    r2Objects: keys.size,
    mediaAssets: mediaAssets.length,
    mediaByRole: countBy(mediaAssets, (asset) => asset.role),
    mediaByApprovalState: countBy(mediaAssets, (asset) => asset.approvalState),
    brokenReferences,
    unreferencedProductObjects,
    staleReferencesDeleted: REPAIR_STALE ? brokenReferences.length : 0,
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    reportPath,
    products,
    suppliers,
    categories,
    r2Objects: keys.size,
    mediaAssets: mediaAssets.length,
    brokenReferences: brokenReferences.length,
    staleReferencesDeleted: report.staleReferencesDeleted,
    unreferencedProductObjects: unreferencedProductObjects.length,
    mediaByRole: report.mediaByRole,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
