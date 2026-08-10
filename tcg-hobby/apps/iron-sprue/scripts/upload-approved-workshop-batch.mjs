import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'approved-workshop-batch-upload-report.json');
const sourceDir = path.join(appRoot, 'public', 'assets', 'workshop-batch-sources');
const workshopDir = path.join(appRoot, 'public', 'assets', 'workshop-batch-approved');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const ACTOR = 'iron-sprue-approved-workshop-batch';

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

async function findBatchItems() {
  const files = await readdir(workshopDir);
  return files
    .filter((file) => /^is-.+-workshop\.png$/i.test(file))
    .map((file) => {
      const slug = file.replace(/-workshop\.png$/i, '');
      const sku = slug.toUpperCase();
      return {
        sku,
        image2File: path.join(sourceDir, `${slug}-image2.png`),
        workshopFile: path.join(workshopDir, file),
      };
    })
    .sort((a, b) => a.sku.localeCompare(b.sku));
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
  for (const item of await findBatchItems()) {
    const product = await prisma.ironSprueAdminProduct.findUnique({
      where: { storeCode_sku: { storeCode: STORE_CODE, sku: item.sku } },
    });
    if (!product) throw new Error(`Missing Iron Sprue product ${item.sku}`);

    const image2 = await uploadMedia({
      s3,
      prisma,
      env,
      product,
      file: item.image2File,
      role: 'catalogue-primary',
      keyPrefix: 'image-2',
      sortOrder: 10,
      altText: `${product.customerTitle} clean catalogue image`,
      note: 'Generated from authorised source as Image 2 candidate. Requires visual review before publication.',
    });
    const workshop = await uploadMedia({
      s3,
      prisma,
      env,
      product,
      file: item.workshopFile,
      role: 'workshop-photography',
      keyPrefix: 'workshop',
      sortOrder: 40,
      altText: `${product.customerTitle} in the Iron Sprue workshop`,
      note: 'Generated using approved IRON_SPRUE_WORKSHOP_V1 recipe and Image 2 subject. Requires visual review before publication.',
    });
    uploaded.push({ sku: item.sku, image2, workshop });
  }
} finally {
  await prisma.$disconnect();
}

await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), uploaded }, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, uploaded: uploaded.length, items: uploaded }, null, 2));
