import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
const matPath = path.join(appRoot, 'public', 'assets', 'workshop-proofs', 'iron-sprue-approved-cutting-mat-reference.png');
const reportPath = path.join(appRoot, 'data', 'workshop-master-batch-report.json');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const VERSION = 'IRON_SPRUE_WORKSHOP_V1';
const PROOF_SKU = 'IS-AOS-05628';

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
    publicBaseUrl: process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, '') || fileEnv.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, ''),
  };
}

function publicUrl(env, key) {
  return env.publicBaseUrl ? `${env.publicBaseUrl}/${key}` : null;
}

async function streamToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function listOriginals(s3, products) {
  const bySku = new Map();
  const skus = products.map((product) => product.sku).sort((a, b) => b.length - a.length);
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'archive/products/', ContinuationToken }));
    for (const item of page.Contents ?? []) {
      const lowerKey = item.Key?.toLowerCase() ?? '';
      if (!/^archive\/products\/[^/]+\/original\/[^/]+\.(?:jpe?g|png|webp)$/i.test(lowerKey)) continue;
      const sku = skus.find((candidate) => lowerKey.startsWith(`archive/products/${candidate.toLowerCase()}-`));
      if (!sku) continue;
      const current = bySku.get(sku);
      if (!current || (item.Size ?? 0) > current.size) bySku.set(sku, { key: item.Key, size: item.Size ?? 0 });
    }
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return bySku;
}

async function makeWorkshopMaster(matBuffer, sourceBuffer) {
  const background = await sharp(matBuffer, { failOn: 'none' })
    .resize(1600, 1000, { fit: 'cover' })
    .modulate({ brightness: 0.82, saturation: 0.92 })
    .blur(0.3)
    .png()
    .toBuffer();

  const product = await sharp(sourceBuffer, { failOn: 'none' })
    .resize(760, 520, { fit: 'inside', withoutEnlargement: true, background: '#f8f7f2' })
    .flatten({ background: '#f8f7f2' })
    .extend({ top: 28, bottom: 28, left: 28, right: 28, background: '#f8f7f2' })
    .png()
    .toBuffer();

  const productMeta = await sharp(product).metadata();
  const left = Math.round((1600 - (productMeta.width ?? 760)) / 2);
  const top = Math.round((1000 - (productMeta.height ?? 520)) / 2) + 35;
  const shadow = await sharp({
    create: {
      width: (productMeta.width ?? 760) + 42,
      height: (productMeta.height ?? 520) + 42,
      channels: 4,
      background: '#00000080',
    },
  })
    .blur(24)
    .png()
    .toBuffer();

  return sharp(background)
    .composite([
      { input: shadow, left: left - 10, top: top + 18 },
      { input: product, left, top },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const env = await loadEnv();
if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
});

const matBuffer = await readFile(matPath);
const products = await prisma.ironSprueAdminProduct.findMany({ where: { storeCode: STORE_CODE }, orderBy: { sku: 'asc' } });
const originals = await listOriginals(s3, products);
const report = { generatedAt: new Date().toISOString(), version: VERSION, generated: 0, proofRetained: 0, reviewRequired: 0, failures: [], objects: [] };

try {
  for (const product of products) {
    if (product.sku === PROOF_SKU) {
      report.proofRetained += 1;
      report.reviewRequired += 1;
      continue;
    }
    const original = originals.get(product.sku);
    if (!original) {
      report.failures.push({ sku: product.sku, reason: 'NO_USABLE_ORIGINAL' });
      continue;
    }
    try {
      const source = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: original.key }));
      const sourceBuffer = await streamToBuffer(source.Body);
      const output = await makeWorkshopMaster(matBuffer, sourceBuffer);
      const checksum = createHash('sha256').update(output).digest('hex').slice(0, 12);
      const key = `products/${product.sku.toLowerCase()}/workshop/iron-sprue-workshop-v1-${checksum}.png`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: output,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: { store: 'iron-sprue', sku: product.sku.toLowerCase(), version: VERSION.toLowerCase(), role: 'workshop-master' },
      }));
      const media = await prisma.ironSprueAdminMediaAsset.upsert({
        where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
        create: {
          storeCode: STORE_CODE,
          productId: product.id,
          role: 'workshop-photography',
          url: publicUrl(env, key),
          storageKey: key,
          altText: `${product.customerTitle} in the Iron Sprue workshop`,
          mimeType: 'image/png',
          byteSize: output.length,
          approvalState: 'REVIEW_REQUIRED',
          isPrimary: false,
          sortOrder: 40,
          uploadedById: 'iron-sprue-workshop-batch',
          lastError: `${VERSION} generated workshop master; requires catalogue review before publication.`,
        },
        update: {
          approvalState: 'REVIEW_REQUIRED',
          isPrimary: false,
          uploadedById: 'iron-sprue-workshop-batch',
          lastError: `${VERSION} generated workshop master; requires catalogue review before publication.`,
        },
      });
      report.generated += 1;
      report.reviewRequired += 1;
      report.objects.push({ sku: product.sku, key, mediaId: media.id, byteSize: output.length });
    } catch (error) {
      report.failures.push({ sku: product.sku, reason: error instanceof Error ? error.message : 'UNKNOWN' });
    }
  }
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ reportPath, generated: report.generated, proofRetained: report.proofRetained, reviewRequired: report.reviewRequired, failures: report.failures.length }, null, 2));
} finally {
  await prisma.$disconnect();
}
