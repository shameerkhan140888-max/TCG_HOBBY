import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportsDir = path.join(appRoot, 'reports');
const dataDir = path.join(appRoot, 'data');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const RUN_ID = '2026-09-14';
const ACTOR = 'iron-sprue-image2-repair';
const APPLY = process.argv.includes('--apply');
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

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function getObjectBuffer(s3, key) {
  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return streamToBuffer(object.Body);
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
if (!env.IRON_SPRUE_DATABASE_URL) throw new Error('IRON_SPRUE_DATABASE_URL is required.');
if (env.IRON_SPRUE_R2_BUCKET_NAME !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);

await mkdir(reportsDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: { accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID, secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY },
});
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.IRON_SPRUE_DATABASE_URL, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
});

try {
  const products = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE },
    include: { brand: true, mediaAssets: true },
    orderBy: { sku: 'asc' },
  });
  const repairs = [];
  const errors = [];

  for (const product of products) {
    const badRows = product.mediaAssets.filter((asset) => asset.role === 'catalogue-primary' && asset.approvalState === 'APPROVED' && String(asset.storageKey ?? '').includes(`/organized-${RUN_ID}/image-2/tasma-image-2-fix`));
    if (!badRows.length) continue;
    const archivedSource = product.mediaAssets
      .filter((asset) => asset.role === 'catalogue-primary' && String(asset.storageKey ?? '').includes(`/replaced-${RUN_ID}/image-2/`))
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.id.localeCompare(right.id))[0];
    if (!archivedSource?.storageKey) {
      errors.push({ sku: product.sku, product: product.customerTitle, error: 'No archived Image 2 source found for repair.' });
      continue;
    }

    try {
      const sourceBuffer = await getObjectBuffer(s3, archivedSource.storageKey);
      const replacement = await createImage2Replacement(sourceBuffer);
      const key = `products/${product.sku.toLowerCase()}/organized-${RUN_ID}/image-2/generated-image-2-replacement-${hash(replacement.buffer)}.png`;
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
            source: 'existing-image2-reprocessed',
            run: RUN_ID,
          },
        }));
        await prisma.$transaction(async (tx) => {
          await tx.ironSprueAdminMediaAsset.updateMany({
            where: { id: { in: badRows.map((asset) => asset.id) } },
            data: {
              approvalState: 'REJECTED',
              isPrimary: false,
              sortOrder: 950,
              uploadedById: ACTOR,
              lastError: 'Rejected: manufacturer-derived Image 2 repair row must not be used as Image 2.',
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
              altText: `${product.customerTitle} corrected Image 2`,
              mimeType: replacement.contentType,
              byteSize: replacement.byteSize,
              width: replacement.width,
              height: replacement.height,
              approvalState: 'APPROVED',
              isPrimary: true,
              sortOrder: 0,
              uploadedById: ACTOR,
              approvedAt: new Date(),
              lastError: `Corrected Image 2 generated from the archived approved Image 2 source, not from manufacturer imagery.`,
            },
            update: {
              productId: product.id,
              role: 'catalogue-primary',
              url: publicUrl(env, key),
              altText: `${product.customerTitle} corrected Image 2`,
              mimeType: replacement.contentType,
              byteSize: replacement.byteSize,
              width: replacement.width,
              height: replacement.height,
              approvalState: 'APPROVED',
              isPrimary: true,
              sortOrder: 0,
              uploadedById: ACTOR,
              approvedAt: new Date(),
              lastError: `Corrected Image 2 generated from the archived approved Image 2 source, not from manufacturer imagery.`,
            },
          });
        });
      }
      repairs.push({
        sku: product.sku,
        product: product.customerTitle,
        archivedSource: archivedSource.storageKey,
        rejectedRows: badRows.map((asset) => asset.storageKey),
        replacementKey: key,
        width: replacement.width,
        height: replacement.height,
      });
    } catch (error) {
      errors.push({ sku: product.sku, product: product.customerTitle, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const result = { generatedAt: new Date().toISOString(), mode: APPLY ? 'applied' : 'dry-run', repairs, errors };
  const suffix = APPLY ? '' : '-dry-run';
  const jsonPath = path.join(dataDir, `manufacturer-derived-image2-repair-${RUN_ID}${suffix}.json`);
  const mdPath = path.join(reportsDir, `manufacturer-derived-image2-repair-${RUN_ID}${suffix}.md`);
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  const markdown = [
    '# Manufacturer-Derived Image 2 Repair',
    '',
    `Generated: ${result.generatedAt}`,
    `Mode: ${result.mode}`,
    '',
    row(['Metric', 'Value']),
    row(['---', '---']),
    row(['Repairs prepared', repairs.length]),
    row(['Errors', errors.length]),
    '',
    row(['SKU', 'Product', 'Replacement Image 2', 'Source archived Image 2']),
    row(['---', '---', '---', '---']),
    ...repairs.map((item) => row([item.sku, item.product, item.replacementKey, item.archivedSource])),
    '',
    `Full JSON: ${jsonPath}`,
  ].join('\n');
  await writeFile(mdPath, `${markdown}\n`);
  console.log(JSON.stringify({ jsonPath, mdPath, summary: { mode: result.mode, repairs: repairs.length, errors: errors.length }, errors }, null, 2));
} finally {
  await prisma.$disconnect();
}
