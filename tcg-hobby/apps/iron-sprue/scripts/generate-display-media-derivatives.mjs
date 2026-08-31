import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const BUCKET = 'iron-sprue-product-media';
const STORE_FRONT = 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev';
const API = 'https://considerate-unity-production-b734.up.railway.app';
const WIDTHS = [320, 480, 640, 960, 1400];
const FETCH_TIMEOUT_MS = 15_000;
const R2_TIMEOUT_MS = 20_000;
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

function timeoutSignal(ms) {
  return AbortSignal.timeout(ms);
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

async function loadEnv() {
  const fileEnv = parseEnvFile(await readFile(envPath, 'utf8'));
  return {
    endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    accessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
  };
}

function keyFromMediaUrl(value) {
  const url = new URL(value, STORE_FRONT);
  const prefix = '/media/iron-sprue/';
  if (!url.pathname.startsWith(prefix)) return null;
  const key = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!/^(archive|products|processed|published)\//.test(key) || !/\.(avif|jpe?g|png|webp)$/i.test(key)) return null;
  return key;
}

function derivativeKeyFor(key, width) {
  return `derivatives/w${width}/${key.replace(/\.[a-z0-9]+$/i, '')}.webp`;
}

async function bodyToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function exists(s3, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }), { abortSignal: timeoutSignal(R2_TIMEOUT_MS) });
    return true;
  } catch {
    return false;
  }
}

async function publicProducts() {
  const catalogue = await fetch(`${API}/v1/catalogue?pageSize=100`, {
    headers: { accept: 'application/json' },
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
  });
  if (!catalogue.ok) throw new Error(`Catalogue request failed: ${catalogue.status}`);
  const data = await catalogue.json();
  const slugs = data.products.map((product) => product.slug);
  console.error(`Found ${slugs.length} public catalogue products.`);
  const details = [];
  for (const [index, slug] of slugs.entries()) {
    const response = await fetch(`${API}/v1/catalogue/${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
      signal: timeoutSignal(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Product request failed for ${slug}: ${response.status}`);
    details.push(await response.json());
    if ((index + 1) % 10 === 0 || index + 1 === slugs.length) console.error(`Fetched ${index + 1}/${slugs.length} product details.`);
  }
  return details;
}

const env = await loadEnv();
if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
if (!env.endpoint || !env.accessKeyId || !env.secretAccessKey) throw new Error('Iron Sprue R2 write credentials are required.');

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.endpoint,
  credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
});

const products = await publicProducts();
const media = new Map();
for (const product of products) {
  for (const image of product.images ?? []) {
    const key = keyFromMediaUrl(image.url);
    if (key) media.set(key, { key, products: [...(media.get(key)?.products ?? []), product.sku ?? product.slug] });
  }
}

const results = [];
const mediaItems = [...media.values()];
console.error(`Planning derivatives for ${mediaItems.length} unique public media objects.`);
for (const [index, item] of mediaItems.entries()) {
  console.error(`Checking ${index + 1}/${mediaItems.length}: ${item.key}`);
  const source = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: item.key }), { abortSignal: timeoutSignal(R2_TIMEOUT_MS) });
  const buffer = await bodyToBuffer(source.Body);
  const metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  const variants = [];
  for (const width of WIDTHS) {
    const outputKey = derivativeKeyFor(item.key, width);
    const alreadyExists = !FORCE && await exists(s3, outputKey);
    let outputBuffer = null;
    let outputMetadata = null;
    if (!alreadyExists) {
      outputBuffer = await sharp(buffer, { failOn: 'error' })
        .rotate()
        .resize({ width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84, alphaQuality: 90, effort: 4 })
        .toBuffer();
      outputMetadata = await sharp(outputBuffer).metadata();
      if (APPLY) {
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: outputKey,
          Body: outputBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            store: 'iron-sprue',
            derivative: 'display',
            width: String(width),
          },
        }), { abortSignal: timeoutSignal(R2_TIMEOUT_MS) });
      }
    }
    variants.push({
      width,
      key: outputKey,
      existed: alreadyExists,
      bytes: outputBuffer?.byteLength ?? null,
      dimensions: outputMetadata ? { width: outputMetadata.width, height: outputMetadata.height } : null,
    });
  }
  results.push({
    sourceKey: item.key,
    products: item.products,
    source: {
      bytes: buffer.byteLength,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
      hasAlpha: Boolean(metadata.hasAlpha),
    },
    variants,
  });
}

console.log(JSON.stringify({
  mode: APPLY ? 'apply' : 'dry-run',
  productCount: products.length,
  sourceImageCount: results.length,
  widthSet: WIDTHS,
  results,
}, null, 2));
