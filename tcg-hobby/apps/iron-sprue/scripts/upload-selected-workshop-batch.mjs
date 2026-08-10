import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const appRoot = path.resolve('apps/iron-sprue');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'selected-workshop-batch-upload-report.json');
const sourceDir = path.join(appRoot, 'public', 'assets', 'workshop-batch-sources');
const workshopDir = path.join(appRoot, 'public', 'assets', 'workshop-batch-approved');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const ACTOR = 'iron-sprue-selected-workshop-batch';
const skus = process.argv.slice(2).map((sku) => sku.toUpperCase());

if (!skus.length) {
  throw new Error('Pass one or more SKUs, for example IS-AOS-05628 IS-CUB-MC133H.');
}

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

function checksum(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

async function uploadMedia({ s3, prisma, env, product, file, role, keyPrefix, sortOrder, altText, note }) {
  const buffer = await readFile(file);
  const hash = checksum(buffer);
  const key = `products/${product.sku.toLowerCase()}/${keyPrefix}/iron-sprue-${keyPrefix}-${hash}.png`;
  const meta = await sharp(buffer).metadata();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        store: 'iron-sprue',
        sku: product.sku.toLowerCase(),
        version: keyPrefix === 'workshop' ? 'iron_sprue_workshop_v1' : 'iron_sprue_image_2',
        role,
      },
    }),
  );

  const media = await prisma.ironSprueAdminMediaAsset.upsert({
    where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
    create: {
      storeCode: STORE_CODE,
      product: { connect: { id: product.id } },
      role,
      url: publicUrl(env, key),
      storageKey: key,
      altText,
      mimeType: 'image/png',
      byteSize: buffer.length,
      width: meta.width,
      height: meta.height,
      approvalState: 'REVIEW_REQUIRED',
      isPrimary: false,
      sortOrder,
      uploadedById: ACTOR,
      lastError: note,
    },
    update: {
      approvalState: 'REVIEW_REQUIRED',
      isPrimary: false,
      uploadedById: ACTOR,
      lastError: note,
    },
  });

  return { key, mediaId: media.id, byteSize: buffer.length, width: meta.width, height: meta.height };
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
  for (const sku of skus) {
    const slug = sku.toLowerCase();
    const product = await prisma.ironSprueAdminProduct.findUnique({
      where: { storeCode_sku: { storeCode: STORE_CODE, sku } },
    });
    if (!product) throw new Error(`Missing Iron Sprue product ${sku}`);

    const image2File = path.join(sourceDir, `${slug}-image2.png`);
    const workshopFile = path.join(workshopDir, `${slug}-workshop.png`);
    const image2 = await uploadMedia({
      s3,
      prisma,
      env,
      product,
      file: image2File,
      role: 'catalogue-primary',
      keyPrefix: 'image-2',
      sortOrder: 10,
      altText: `${product.customerTitle} clean catalogue image`,
      note: 'Selected Image 2 candidate. Requires visual review before publication.',
    });
    const workshop = await uploadMedia({
      s3,
      prisma,
      env,
      product,
      file: workshopFile,
      role: 'workshop-photography',
      keyPrefix: 'workshop',
      sortOrder: 40,
      altText: `${product.customerTitle} in the Iron Sprue workshop`,
      note: 'Selected workshop master using approved IRON_SPRUE_WORKSHOP_V1 recipe. Requires visual review before publication.',
    });
    uploaded.push({ sku, image2, workshop });
  }
} finally {
  await prisma.$disconnect();
}

await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), uploaded }, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, uploaded: uploaded.length, items: uploaded }, null, 2));
