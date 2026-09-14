import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const RUN_ID = '2026-09-14';
const SKU = 'IS-CUB-MC133H';
const ACTOR = 'iron-sprue-burj-image2-repair';
const CANVAS_SIZE = 1100;

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
  const base = env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  return base ? `${base}/${key}` : null;
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function createImage2Replacement(buffer) {
  const source = sharp(buffer, { failOn: 'none' }).rotate();
  const background = await source
    .clone()
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'cover', position: 'centre' })
    .blur(28)
    .modulate({ brightness: 0.88, saturation: 0.82 })
    .png()
    .toBuffer();
  let foreground;
  try {
    foreground = await source
      .clone()
      .trim({ background: '#ffffff', threshold: 18 })
      .resize(Math.round(CANVAS_SIZE * 0.94), Math.round(CANVAS_SIZE * 0.94), { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
  } catch {
    foreground = await source
      .clone()
      .resize(Math.round(CANVAS_SIZE * 0.94), Math.round(CANVAS_SIZE * 0.94), { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
  }
  const output = await sharp(background)
    .composite([{ input: foreground, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  const metadata = await sharp(output, { failOn: 'none' }).metadata();
  return {
    buffer: output,
    contentType: 'image/png',
    byteSize: output.length,
    width: metadata.width ?? CANVAS_SIZE,
    height: metadata.height ?? CANVAS_SIZE,
  };
}

const env = parseEnvFile(await readFile(envPath, 'utf8'));
if (!env.IRON_SPRUE_ADMIN_DATABASE_URL) throw new Error('IRON_SPRUE_ADMIN_DATABASE_URL is required.');
if (env.IRON_SPRUE_R2_BUCKET_NAME !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: { accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID, secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY },
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: env.IRON_SPRUE_ADMIN_DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
    max: 5,
  }),
});

try {
  const product = await prisma.ironSprueAdminProduct.findUnique({
    where: { storeCode_sku: { storeCode: STORE_CODE, sku: SKU } },
    include: { mediaAssets: true },
  });
  if (!product) throw new Error(`${SKU} not found.`);
  const portrait = product.mediaAssets
    .filter((asset) => asset.role === 'catalogue-primary' && asset.approvalState === 'APPROVED' && String(asset.storageKey ?? '').includes(`/organized-${RUN_ID}/image-2/current-image-2-`))
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))[0];
  if (!portrait?.storageKey) throw new Error('Approved organized Burj Image 2 portrait row not found.');
  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: portrait.storageKey }));
  const sourceBuffer = await streamToBuffer(object.Body);
  const replacement = await createImage2Replacement(sourceBuffer);
  const key = `products/is-cub-mc133h/organized-${RUN_ID}/image-2/generated-image-2-replacement-${hash(replacement.buffer)}.png`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: replacement.buffer,
    ContentType: replacement.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: {
      store: 'iron-sprue',
      sku: SKU.toLowerCase(),
      role: 'catalogue-primary',
      source: 'existing-image2-reprocessed',
      run: RUN_ID,
    },
  }));

  await prisma.$transaction(async (tx) => {
    await tx.ironSprueAdminMediaAsset.update({
      where: { id: portrait.id },
      data: {
        approvalState: 'REJECTED',
        isPrimary: false,
        sortOrder: Math.max(portrait.sortOrder ?? 0, 900),
        uploadedById: ACTOR,
        lastError: 'Rejected after Burj-specific Image 2 square replacement was generated from this Image 2 source.',
      },
    });
    await tx.ironSprueAdminMediaAsset.upsert({
      where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
      create: {
        storeCode: STORE_CODE,
        productId: product.id,
        role: 'catalogue-primary',
        url: publicUrl(env, key),
        storageKey: key,
        altText: 'Burj Khalifa corrected Image 2',
        mimeType: replacement.contentType,
        byteSize: replacement.byteSize,
        width: replacement.width,
        height: replacement.height,
        approvalState: 'APPROVED',
        isPrimary: true,
        sortOrder: 0,
        uploadedById: ACTOR,
        approvedAt: new Date(),
        lastError: 'Burj Image 2 generated from existing Image 2 source to resolve portrait/underfilled gallery display.',
      },
      update: {
        productId: product.id,
        role: 'catalogue-primary',
        url: publicUrl(env, key),
        altText: 'Burj Khalifa corrected Image 2',
        mimeType: replacement.contentType,
        byteSize: replacement.byteSize,
        width: replacement.width,
        height: replacement.height,
        approvalState: 'APPROVED',
        isPrimary: true,
        sortOrder: 0,
        uploadedById: ACTOR,
        approvedAt: new Date(),
        lastError: 'Burj Image 2 generated from existing Image 2 source to resolve portrait/underfilled gallery display.',
      },
    });
  });

  console.log(JSON.stringify({ sku: SKU, sourceKey: portrait.storageKey, replacementKey: key, width: replacement.width, height: replacement.height }, null, 2));
} finally {
  await prisma.$disconnect();
}
