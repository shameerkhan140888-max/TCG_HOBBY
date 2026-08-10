import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'approved-workshop-sample-upload-report.json');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const samples = [
  {
    sku: 'IS-AOS-05778',
    file: path.join(appRoot, 'public', 'assets', 'workshop-acceptance-samples', 'is-aos-05778-workshop-sample.png'),
    note: 'Approved second Jimny revision: product prominent, camera slightly pulled back, Foamex visible.',
  },
  {
    sku: 'IS-CUB-C108H',
    file: path.join(appRoot, 'public', 'assets', 'workshop-acceptance-samples', 'is-cub-c108h-workshop-sample.png'),
    note: 'Approved CubicFun workshop sample.',
  },
];

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

function publicUrl(env, key) {
  return env.IRON_SPRUE_R2_PUBLIC_BASE_URL ? `${env.IRON_SPRUE_R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}` : null;
}

const env = parseEnvFile(await readFile(envPath, 'utf8'));
if (env.IRON_SPRUE_R2_BUCKET_NAME !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY,
  },
});
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.IRON_SPRUE_DATABASE_URL, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
});

const uploaded = [];
try {
  for (const sample of samples) {
    const product = await prisma.ironSprueAdminProduct.findUnique({ where: { storeCode_sku: { storeCode: STORE_CODE, sku: sample.sku } } });
    if (!product) throw new Error(`Missing Iron Sprue product ${sample.sku}`);
    const buffer = await readFile(sample.file);
    const checksum = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const key = `products/${sample.sku.toLowerCase()}/workshop/iron-sprue-workshop-v1-approved-${checksum}.png`;
    const meta = await sharp(buffer).metadata();
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: { store: 'iron-sprue', sku: sample.sku.toLowerCase(), version: 'iron_sprue_workshop_v1', role: 'approved-workshop-sample' },
    }));
    const media = await prisma.ironSprueAdminMediaAsset.upsert({
      where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
      create: {
        storeCode: STORE_CODE,
        product: { connect: { id: product.id } },
        role: 'workshop-photography',
        url: publicUrl(env, key),
        storageKey: key,
        altText: `${product.customerTitle} in the Iron Sprue workshop`,
        mimeType: 'image/png',
        byteSize: buffer.length,
        width: meta.width,
        height: meta.height,
        approvalState: 'REVIEW_REQUIRED',
        isPrimary: false,
        sortOrder: 40,
        uploadedById: 'iron-sprue-approved-workshop-sample',
        lastError: sample.note,
      },
      update: {
        approvalState: 'REVIEW_REQUIRED',
        uploadedById: 'iron-sprue-approved-workshop-sample',
        lastError: sample.note,
      },
    });
    uploaded.push({ sku: sample.sku, key, mediaId: media.id, byteSize: buffer.length, width: meta.width, height: meta.height });
  }
} finally {
  await prisma.$disconnect();
}

await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), uploaded }, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, uploaded: uploaded.length, items: uploaded }, null, 2));
