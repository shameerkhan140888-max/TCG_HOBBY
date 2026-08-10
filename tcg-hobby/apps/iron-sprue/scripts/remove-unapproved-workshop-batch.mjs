import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'unapproved-workshop-batch-removal-report.json');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const APPLY = process.argv.includes('--apply');

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
  const assets = await prisma.ironSprueAdminMediaAsset.findMany({
    where: {
      storeCode: STORE_CODE,
      role: 'workshop-photography',
      uploadedById: 'iron-sprue-workshop-batch',
    },
    select: { id: true, productId: true, storageKey: true },
    orderBy: { createdAt: 'asc' },
  });
  const keys = [...new Set(assets.map((asset) => asset.storageKey).filter(Boolean))];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'applied' : 'dry-run',
    reason: 'Removed the unapproved flat-mat workshop batch. The approved photographic IRON_SPRUE_WORKSHOP_V1 proof remains intact.',
    mediaRowsMatched: assets.length,
    objectKeysMatched: keys.length,
    deletedMediaRows: 0,
    deletedObjects: 0,
    retainedApprovedProof: 'products/is-aos-05628/workshop/iron-sprue-workshop-v1-d3590e768878.png',
    keys,
  };

  if (APPLY) {
    for (const key of keys) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      report.deletedObjects += 1;
    }
    const deleted = await prisma.ironSprueAdminMediaAsset.deleteMany({
      where: { id: { in: assets.map((asset) => asset.id) } },
    });
    report.deletedMediaRows = deleted.count;
  }

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ reportPath, mode: report.mode, mediaRowsMatched: report.mediaRowsMatched, objectKeysMatched: report.objectKeysMatched, deletedObjects: report.deletedObjects, deletedMediaRows: report.deletedMediaRows }, null, 2));
} finally {
  await prisma.$disconnect();
}
