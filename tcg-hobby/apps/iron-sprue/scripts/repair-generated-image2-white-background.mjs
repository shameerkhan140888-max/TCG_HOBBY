import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const dataDir = path.join(appRoot, 'data');
const reportsDir = path.join(appRoot, 'reports');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const RUN_ID = '2026-09-14';
const ACTOR = 'iron-sprue-white-image2-repair';
const CANVAS_SIZE = 1100;
const APPLY = process.argv.includes('--apply');
const RAILWAY_PRODUCTION = process.argv.includes('--railway-production');
const INCLUDE_REJECTED = process.argv.includes('--include-rejected');

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

function createPrismaClient(env) {
  if (RAILWAY_PRODUCTION) {
    const url = new URL(env.IRON_SPRUE_ADMIN_DATABASE_URL);
    const railwayHost = /(^|\.)railway\.internal$|(^|\.)proxy\.rlwy\.net$|(^|\.)railway\.app$/i.test(url.hostname);
    const railwayTunnel = /^(127\.0\.0\.1|localhost)$/i.test(url.hostname) && url.pathname.replace(/^\//, '') === 'railway';
    if (!railwayHost && !railwayTunnel) throw new Error('--railway-production requires an Iron Sprue Railway database host or tunnel.');
    return new PrismaClient({
      adapter: new PrismaPg({
        connectionString: env.IRON_SPRUE_ADMIN_DATABASE_URL,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 5_000,
        max: 5,
      }),
    });
  }
  if (!env.IRON_SPRUE_DATABASE_URL) throw new Error('IRON_SPRUE_DATABASE_URL is required.');
  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: env.IRON_SPRUE_DATABASE_URL,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
      max: 5,
    }),
  });
}

function sourceScore(asset) {
  const key = String(asset.storageKey ?? '').toLowerCase();
  let score = 0;
  if (asset.approvalState === 'REJECTED') score += 4;
  if (key.includes('/replaced-2026-09-14/image-2/')) score += 20;
  if (key.includes('/organized-2026-09-14/image-2/current-image-2-')) score += 18;
  if (key.includes('/products/') && key.includes('/image-2/')) score += 10;
  if (key.includes('placeholder') || key.endsWith('.json')) score -= 100;
  if (key.includes('generated-image-2-replacement')) score -= 100;
  if (asset.width && asset.height) score += Math.min(10, Math.round((asset.width * asset.height) / 200_000));
  return score;
}

function pickSourceImage2(product, generatedAsset) {
  return product.mediaAssets
    .filter((asset) => asset.role === 'catalogue-primary' && asset.storageKey && asset.id !== generatedAsset.id)
    .map((asset) => ({ asset, score: sourceScore(asset) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || (left.asset.sortOrder ?? 0) - (right.asset.sortOrder ?? 0) || left.asset.id.localeCompare(right.asset.id))[0]?.asset ?? null;
}

async function getBuffer(s3, key) {
  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return streamToBuffer(object.Body);
}

async function createWhiteCanvasReplacement(buffer) {
  const source = sharp(buffer, { failOn: 'none' }).rotate();
  let foreground;
  try {
    foreground = await source
      .clone()
      .trim({ background: '#ffffff', threshold: 22 })
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

  const white = await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 3,
      background: '#ffffff',
    },
  })
    .png()
    .toBuffer();

  const output = await sharp(white)
    .composite([{ input: foreground, gravity: 'centre' }])
    .webp({ quality: 88, effort: 5 })
    .toBuffer();
  const metadata = await sharp(output, { failOn: 'none' }).metadata();
  return {
    buffer: output,
    contentType: 'image/webp',
    byteSize: output.length,
    width: metadata.width ?? CANVAS_SIZE,
    height: metadata.height ?? CANVAS_SIZE,
  };
}

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
}

const env = parseEnvFile(await readFile(envPath, 'utf8'));
if (env.IRON_SPRUE_R2_BUCKET_NAME !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
await mkdir(dataDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: { accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID, secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY },
});
const prisma = createPrismaClient(env);

try {
  const products = await prisma.ironSprueAdminProduct.findMany({
    where: {
      storeCode: STORE_CODE,
      mediaAssets: {
        some: {
          role: 'catalogue-primary',
          storageKey: { contains: 'generated-image-2-replacement' },
          ...(INCLUDE_REJECTED ? {} : { approvalState: 'APPROVED' }),
        },
      },
    },
    include: { mediaAssets: true },
    orderBy: { sku: 'asc' },
  });

  const repairs = [];
  const errors = [];
  for (const product of products) {
    const generatedAssets = product.mediaAssets
      .filter((asset) => asset.role === 'catalogue-primary' && asset.storageKey?.includes('generated-image-2-replacement') && (INCLUDE_REJECTED || asset.approvalState === 'APPROVED'))
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.id.localeCompare(right.id));

    for (const generated of generatedAssets) {
      const source = pickSourceImage2(product, generated);
      if (!source?.storageKey) {
        errors.push({ sku: product.sku, generatedKey: generated.storageKey, error: 'No suitable source Image 2 row found.' });
        continue;
      }
      try {
        const sourceBuffer = await getBuffer(s3, source.storageKey);
        const replacement = await createWhiteCanvasReplacement(sourceBuffer);
        const key = `products/${product.sku.toLowerCase()}/organized-${RUN_ID}/image-2/white-image-2-replacement-${hash(replacement.buffer)}.webp`;
        if (APPLY) {
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: replacement.buffer,
            ContentType: replacement.contentType,
            CacheControl: 'public, max-age=31536000, immutable',
            Metadata: {
              store: 'iron-sprue',
              sku: product.sku.toLowerCase(),
              role: 'catalogue-primary',
              source: 'existing-image2-white-canvas',
              run: RUN_ID,
            },
          }));
          await prisma.$transaction(async (tx) => {
            await tx.ironSprueAdminMediaAsset.update({
              where: { id: generated.id },
              data: {
                approvalState: 'REJECTED',
                isPrimary: false,
                sortOrder: Math.max(generated.sortOrder ?? 0, 900),
                uploadedById: ACTOR,
                lastError: 'Rejected after white-background Image 2 replacement was generated from the original Image 2 source.',
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
                altText: `${product.customerTitle} corrected Image 2 on white background`,
                mimeType: replacement.contentType,
                byteSize: replacement.byteSize,
                width: replacement.width,
                height: replacement.height,
                approvalState: generated.approvalState === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                isPrimary: Boolean(generated.isPrimary && generated.approvalState === 'APPROVED'),
                sortOrder: generated.approvalState === 'APPROVED' ? 0 : Math.max(generated.sortOrder ?? 0, 900),
                uploadedById: ACTOR,
                approvedAt: generated.approvalState === 'APPROVED' ? new Date() : null,
                lastError: 'Image 2 regenerated on a white canvas to remove grey backdrop and improve storefront display.',
              },
              update: {
                productId: product.id,
                role: 'catalogue-primary',
                url: publicUrl(env, key),
                altText: `${product.customerTitle} corrected Image 2 on white background`,
                mimeType: replacement.contentType,
                byteSize: replacement.byteSize,
                width: replacement.width,
                height: replacement.height,
                approvalState: generated.approvalState === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                isPrimary: Boolean(generated.isPrimary && generated.approvalState === 'APPROVED'),
                sortOrder: generated.approvalState === 'APPROVED' ? 0 : Math.max(generated.sortOrder ?? 0, 900),
                uploadedById: ACTOR,
                approvedAt: generated.approvalState === 'APPROVED' ? new Date() : null,
                lastError: 'Image 2 regenerated on a white canvas to remove grey backdrop and improve storefront display.',
              },
            });
          });
        }
        repairs.push({
          sku: product.sku,
          product: product.customerTitle,
          oldKey: generated.storageKey,
          sourceKey: source.storageKey,
          newKey: key,
          width: replacement.width,
          height: replacement.height,
          byteSize: replacement.byteSize,
          approved: generated.approvalState === 'APPROVED',
        });
      } catch (error) {
        errors.push({ sku: product.sku, generatedKey: generated.storageKey, sourceKey: source.storageKey, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const suffix = `${RAILWAY_PRODUCTION ? '-railway' : '-neon'}${APPLY ? '' : '-dry-run'}`;
  const jsonPath = path.join(dataDir, `white-image2-replacement-repair-${RUN_ID}${suffix}.json`);
  const reportPath = path.join(reportsDir, `white-image2-replacement-repair-${RUN_ID}${suffix}.md`);
  const result = { generatedAt: new Date().toISOString(), mode: APPLY ? 'applied' : 'dry-run', target: RAILWAY_PRODUCTION ? 'railway' : 'neon', includeRejected: INCLUDE_REJECTED, repairs, errors };
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(reportPath, `${[
    '# White Image 2 Replacement Repair',
    '',
    `Generated: ${result.generatedAt}`,
    `Mode: ${result.mode}`,
    `Target: ${result.target}`,
    '',
    row(['Metric', 'Value']),
    row(['---', '---']),
    row(['Repairs', repairs.length]),
    row(['Errors', errors.length]),
    '',
    row(['SKU', 'Product', 'New white Image 2', 'Source Image 2']),
    row(['---', '---', '---', '---']),
    ...repairs.map((item) => row([item.sku, item.product, item.newKey, item.sourceKey])),
    '',
    `Full JSON: ${jsonPath}`,
  ].join('\n')}\n`);
  console.log(JSON.stringify({ jsonPath, reportPath, summary: { mode: result.mode, target: result.target, repairs: repairs.length, errors: errors.length }, errors }, null, 2));
} finally {
  await prisma.$disconnect();
}
