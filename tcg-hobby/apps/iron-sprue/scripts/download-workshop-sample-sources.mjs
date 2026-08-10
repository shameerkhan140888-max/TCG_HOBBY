import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'tasma-source-recovery-report.json');
const outputDir = path.join(appRoot, 'public', 'assets', 'workshop-batch-sources');
const BUCKET = 'iron-sprue-product-media';
const PICKS_ARG = process.argv.find((arg) => arg.startsWith('--skus='));
const PICKS = PICKS_ARG
  ? PICKS_ARG.split('=')[1].split(',').map((sku) => sku.trim()).filter(Boolean)
  : ['IS-AOS-05778', 'IS-CUB-C108H', 'IS-PIN-S1024', 'IS-DLM-AD21', 'IS-AOS-06438'];

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

async function streamToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const env = parseEnvFile(await readFile(envPath, 'utf8'));
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const s3 = new S3Client({
  region: 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: {
    accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY,
  },
});

await mkdir(outputDir, { recursive: true });
const downloaded = [];

for (const sku of PICKS) {
  const row = report.recovered.find((item) => item.sku === sku);
  if (!row) {
    downloaded.push({ sku, status: 'missing-recovery-row' });
    continue;
  }
  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: row.originalKey }));
  const buffer = await streamToBuffer(object.Body);
  const extension = path.extname(row.originalKey) || '.jpg';
  const file = path.join(outputDir, `${sku.toLowerCase()}-source${extension}`);
  await writeFile(file, buffer);
  downloaded.push({ sku, file, key: row.originalKey });
}

console.log(JSON.stringify(downloaded, null, 2));
