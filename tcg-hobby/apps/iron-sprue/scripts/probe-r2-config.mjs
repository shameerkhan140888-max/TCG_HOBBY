import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const BUCKET = 'iron-sprue-product-media';
const NAMES = [
  'IRON_SPRUE_R2_ACCOUNT_ID',
  'IRON_SPRUE_R2_BUCKET_NAME',
  'IRON_SPRUE_R2_ACCESS_KEY_ID',
  'IRON_SPRUE_R2_SECRET_ACCESS_KEY',
  'IRON_SPRUE_R2_ENDPOINT',
  'IRON_SPRUE_R2_REGION',
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

function valueSource(name, fileEnv) {
  if (process.env[name]?.trim()) return { source: 'process.env', value: process.env[name].trim(), duplicate: Boolean(fileEnv[name]?.trim()) };
  if (fileEnv[name]?.trim()) return { source: 'apps/iron-sprue/.env.local', value: fileEnv[name].trim(), duplicate: false };
  return { source: 'unset', value: undefined, duplicate: false };
}

function safeError(operation, error) {
  return {
    operation,
    ok: false,
    name: error?.name ?? 'UnknownError',
    message: error?.message ?? null,
    httpStatusCode: error?.$metadata?.httpStatusCode ?? null,
    requestId: error?.$metadata?.requestId ?? null,
    extendedRequestId: error?.$metadata?.extendedRequestId ?? null,
    cfId: error?.$metadata?.cfId ?? null,
    code: error?.Code ?? error?.code ?? null,
  };
}

async function streamToText(body) {
  if (!body) return '';
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const fileEnv = parseEnvFile(await readFile(envPath, 'utf8'));
  const resolved = Object.fromEntries(NAMES.map((name) => [name, valueSource(name, fileEnv)]));
  const accountId = resolved.IRON_SPRUE_R2_ACCOUNT_ID.value;
  const bucket = resolved.IRON_SPRUE_R2_BUCKET_NAME.value;
  const endpoint = resolved.IRON_SPRUE_R2_ENDPOINT.value;
  const accessKeyId = resolved.IRON_SPRUE_R2_ACCESS_KEY_ID.value;
  const secretAccessKey = resolved.IRON_SPRUE_R2_SECRET_ACCESS_KEY.value;
  const region = resolved.IRON_SPRUE_R2_REGION.value || 'auto';
  const endpointHost = endpoint ? new URL(endpoint).hostname : null;
  const endpointAccountId = endpointHost?.replace(/(?:\.eu)?\.r2\.cloudflarestorage\.com$/i, '') ?? null;

  const report = {
    envSources: Object.fromEntries(
      Object.entries(resolved).map(([name, item]) => [
        name,
        {
          source: item.source,
          duplicateDefinition: item.duplicate,
          present: Boolean(item.value),
        },
      ]),
    ),
    safeFingerprint: {
      accessKeyIdLast4: accessKeyId ? accessKeyId.slice(-4) : null,
      bucket,
      endpointHost,
      endpointJurisdiction: endpointHost?.includes('.eu.r2.cloudflarestorage.com') ? 'eu' : 'default',
      endpointAccountMatchesConfiguredAccount: Boolean(accountId && endpointAccountId && accountId === endpointAccountId),
      region,
      secretPresent: Boolean(secretAccessKey),
      s3CompatibleApi: Boolean(endpointHost?.endsWith('r2.cloudflarestorage.com')),
      forcePathStyle: false,
    },
    operations: [],
  };

  if (bucket !== BUCKET) throw new Error(`Active bucket must be ${BUCKET}.`);
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('R2 endpoint and credentials are required.');

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  const key = `pipeline/probes/${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const body = `iron-sprue-r2-probe ${new Date().toISOString()}`;

  try {
    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    report.operations.push({ operation: 'ListObjectsV2', ok: true, httpStatusCode: result.$metadata.httpStatusCode, requestId: result.$metadata.requestId });
  } catch (error) {
    report.operations.push(safeError('ListObjectsV2', error));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  try {
    const result = await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'text/plain', CacheControl: 'no-store' }));
    report.operations.push({ operation: 'PutObject', ok: true, key, httpStatusCode: result.$metadata.httpStatusCode, requestId: result.$metadata.requestId });
  } catch (error) {
    report.operations.push(safeError('PutObject', error));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    report.operations.push({
      operation: 'GetObject',
      ok: (await streamToText(result.Body)) === body,
      httpStatusCode: result.$metadata.httpStatusCode,
      requestId: result.$metadata.requestId,
    });
  } catch (error) {
    report.operations.push(safeError('GetObject', error));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  try {
    const result = await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    report.operations.push({ operation: 'DeleteObject', ok: true, httpStatusCode: result.$metadata.httpStatusCode, requestId: result.$metadata.requestId });
  } catch (error) {
    report.operations.push(safeError('DeleteObject', error));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
