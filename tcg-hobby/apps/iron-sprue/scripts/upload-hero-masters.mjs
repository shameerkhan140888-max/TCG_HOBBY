import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'hero-master-upload-report.json');
const BUCKET = 'iron-sprue-product-media';

const EXISTING_STOREFRONT_HEROES = [
  ['aoshima-06348-lamborghini-adventador-green', path.join(appRoot, 'public', 'assets', 'hero-aoshima-lamborghini-workshop.png')],
  ['cubicfun-mc101h-burj-al-arab', path.join(appRoot, 'public', 'assets', 'promo-cubicfun-landmark-workshop.png')],
  ['pintoo-s1024-3d-jigsaw-vase-koi-carp-lotus', path.join(appRoot, 'public', 'assets', 'promo-pintoo-vase-workshop.png')],
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

async function loadEnv() {
  const fileEnv = parseEnvFile(await readFile(envPath, 'utf8'));
  return {
    endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    accessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
  };
}

function productSlugFromHeroFilename(name) {
  return name.replace(/-hero\.png$/i, '');
}

async function exists(s3, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

const env = await loadEnv();
if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
const campaignDir = path.join(appRoot, 'public', 'assets', 'hero-campaigns');
const campaignHeroes = (await readdir(campaignDir))
  .filter((name) => name.endsWith('-hero.png'))
  .map((name) => [productSlugFromHeroFilename(name), path.join(campaignDir, name)]);
const heroInputs = [...EXISTING_STOREFRONT_HEROES, ...campaignHeroes];
const seen = new Set();
const uploaded = [];

for (const [slug, filePath] of heroInputs) {
  if (seen.has(slug)) throw new Error(`Duplicate hero product slug: ${slug}`);
  seen.add(slug);
  const buffer = await readFile(filePath);
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const key = `marketing/heroes/${slug}/${checksum.slice(0, 12)}.png`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: { store: 'iron-sprue', role: 'hero-master', product: slug },
  }));
  uploaded.push({ slug, key, checksum: checksum.slice(0, 12), byteSize: buffer.length, exists: await exists(s3, key) });
}

if (uploaded.length !== 15) throw new Error(`Expected 15 hero masters, found ${uploaded.length}.`);
if (!uploaded.every((item) => item.exists)) throw new Error('One or more uploaded hero masters could not be verified.');

const report = { generatedAt: new Date().toISOString(), bucket: BUCKET, heroMastersUploaded: uploaded.length, uniqueProducts: seen.size, uploaded };
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, heroMastersUploaded: uploaded.length, uniqueProducts: seen.size }, null, 2));
