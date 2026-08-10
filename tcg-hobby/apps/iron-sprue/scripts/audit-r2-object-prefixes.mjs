import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const BUCKET = 'iron-sprue-product-media';

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

async function listObjects(s3) {
  const objects = [];
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken }));
    for (const item of page.Contents ?? []) objects.push({ key: item.Key, size: item.Size ?? 0 });
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return objects;
}

function addCount(map, key, size) {
  const entry = map.get(key) ?? { count: 0, bytes: 0 };
  entry.count += 1;
  entry.bytes += size;
  map.set(key, entry);
}

const env = await loadEnv();
if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
const objects = await listObjects(s3);
const top = new Map();
const topTwo = new Map();

for (const object of objects) {
  const parts = object.key.split('/');
  addCount(top, parts[0] || '(root)', object.size);
  addCount(topTwo, parts.slice(0, 2).join('/') || '(root)', object.size);
}

const sorted = (map) => [...map.entries()]
  .map(([prefix, value]) => ({ prefix, ...value }))
  .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));

console.log(JSON.stringify({
  bucket: BUCKET,
  totalObjects: objects.length,
  totalBytes: objects.reduce((total, item) => total + item.size, 0),
  topPrefixes: sorted(top),
  topTwoPrefixes: sorted(topTwo).slice(0, 30),
  archiveSamples: objects.filter((item) => item.key.startsWith('archive/')).slice(0, 25),
}, null, 2));
