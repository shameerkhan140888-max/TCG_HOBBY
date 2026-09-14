import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const bucket = 'iron-sprue-product-media';
const files = [
  {
    file: path.join(appRoot, 'public', 'brand', 'iron-sprue-email-avatar.png'),
    key: 'brand/iron-sprue-email-avatar.png',
    contentType: 'image/png',
  },
  {
    file: path.join(appRoot, 'public', 'brand', 'iron-sprue-email-avatar.svg'),
    key: 'brand/iron-sprue-email-avatar.svg',
    contentType: 'image/svg+xml',
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

const env = parseEnvFile(await readFile(envPath, 'utf8'));
const client = new S3Client({
  region: env.IRON_SPRUE_R2_REGION || 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY,
  },
});

const uploads = [];
for (const asset of files) {
  const body = await readFile(asset.file);
  await client.send(new PutObjectCommand({
    Bucket: env.IRON_SPRUE_R2_BUCKET_NAME || bucket,
    Key: asset.key,
    Body: body,
    ContentType: asset.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  uploads.push({ key: asset.key, bytes: body.length, contentType: asset.contentType });
}

console.log(JSON.stringify({ uploads }, null, 2));
