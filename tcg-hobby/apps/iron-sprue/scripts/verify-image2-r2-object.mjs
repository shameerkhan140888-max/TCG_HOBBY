import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

async function main() {
  const key = process.argv[2];
  if (!key) throw new Error('Pass the R2 object key to verify.');
  const fileEnv = parseEnvFile(await readFile(envPath, 'utf8'));
  const endpoint = process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim();
  const accessKeyId = process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim();
  if (bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  const s3 = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
  const result = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  console.log(
    JSON.stringify(
      {
        bucket: BUCKET,
        key,
        exists: true,
        contentType: result.ContentType,
        byteSize: result.ContentLength,
        metadata: result.Metadata,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
