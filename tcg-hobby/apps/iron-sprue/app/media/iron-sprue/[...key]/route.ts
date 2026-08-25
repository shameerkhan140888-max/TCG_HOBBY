import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'iron-sprue-product-media';
const R2_BINDING = 'IRON_SPRUE_PRODUCT_MEDIA';
const ALLOWED_PREFIX = /^(archive|products|processed|published|marketing|brands)\//;
let localIronSprueEnv: Record<string, string> | null = null;

type BoundR2Object = {
  body: ReadableStream;
  size?: number;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata?: (headers: Headers) => void;
};

type BoundR2Bucket = {
  get: (key: string) => Promise<BoundR2Object | null>;
};

function parseEnvValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function readLocalIronSprueEnv() {
  if (localIronSprueEnv) return localIronSprueEnv;

  localIronSprueEnv = {};
  if (process.env.NODE_ENV === 'production') return localIronSprueEnv;

  let existsSync: typeof import('node:fs').existsSync;
  let readFileSync: typeof import('node:fs').readFileSync;
  let join: typeof import('node:path').join;

  try {
    ({ existsSync, readFileSync } = require('node:fs') as typeof import('node:fs'));
    ({ join } = require('node:path') as typeof import('node:path'));
  } catch {
    return localIronSprueEnv;
  }

  const candidates = [
    join(process.cwd(), 'apps', 'iron-sprue', '.env.local'),
    join(process.cwd(), '.env.local'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      const name = match?.[1];
      const value = match?.[2];
      if (name && typeof value === 'string' && !localIronSprueEnv[name]) {
        localIronSprueEnv[name] = parseEnvValue(value);
      }
    }
  }

  return localIronSprueEnv;
}

async function cloudflareEnv() {
  try {
    const context = await getCloudflareContext({ async: true });
    return context.env as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function ironSprueEnv(name: string) {
  const runtimeEnv = await cloudflareEnv();
  const runtimeValue = runtimeEnv?.[name];
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) return runtimeValue.trim();
  return process.env[name]?.trim() || readLocalIronSprueEnv()[name]?.trim() || '';
}

async function requiredEnv(name: string) {
  const value = await ironSprueEnv(name);
  if (!value) throw new Error(`${name} is required for Iron Sprue media delivery.`);
  return value;
}

function normalizeStorageKey(parts: string[]) {
  const key = parts.join('/').trim().replace(/^\/+/, '');
  if (!key || key.includes('..') || key.includes('\\') || !ALLOWED_PREFIX.test(key)) return null;
  return key;
}

async function boundMediaBucket() {
  const runtimeEnv = await cloudflareEnv();
  return runtimeEnv?.[R2_BINDING] as BoundR2Bucket | undefined;
}

async function streamFromBoundR2(key: string) {
  const bucket = await boundMediaBucket();
  if (!bucket) return null;
  const object = await bucket.get(key);
  if (!object?.body) return NextResponse.json({ error: 'Media object was not found.' }, { status: 404 });
  const headers = new Headers({ 'Cache-Control': 'public, max-age=300' });
  object.writeHttpMetadata?.(headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  if (object.size != null) headers.set('Content-Length', String(object.size));
  return new Response(object.body, { headers });
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hmac(key: ArrayBuffer | Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
}

async function signingKey(secret: string, date: string, region: string) {
  const dateKey = await hmac(new TextEncoder().encode(`AWS4${secret}`), date);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function amzDate(now = new Date()) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodeStoragePath(bucket: string, key: string) {
  return `/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function signedR2Headers(input: { method: string; url: URL; region: string; accessKeyId: string; secretAccessKey: string; now?: Date }) {
  const dateTime = amzDate(input.now);
  const date = dateTime.slice(0, 8);
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalHeaders = `host:${input.url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateTime}\n`;
  const canonicalRequest = [
    input.method,
    input.url.pathname,
    input.url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${date}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateTime,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = toHex(await hmac(await signingKey(input.secretAccessKey, date, input.region), stringToSign));

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': dateTime,
  };
}

async function streamFromR2FetchFallback(key: string) {
  const bucket = await requiredEnv('IRON_SPRUE_R2_BUCKET_NAME');
  if (bucket !== BUCKET) throw new Error('Iron Sprue media delivery must use iron-sprue-product-media.');

  const region = await ironSprueEnv('IRON_SPRUE_R2_REGION') || 'auto';
  const endpoint = (await requiredEnv('IRON_SPRUE_R2_ENDPOINT')).replace(/\/$/, '');
  const url = new URL(`${encodeStoragePath(bucket, key)}`, endpoint);
  const response = await fetch(url, {
    method: 'GET',
    headers: await signedR2Headers({
      method: 'GET',
      url,
      region,
      accessKeyId: await requiredEnv('IRON_SPRUE_R2_ACCESS_KEY_ID'),
      secretAccessKey: await requiredEnv('IRON_SPRUE_R2_SECRET_ACCESS_KEY'),
    }),
  });

  if (response.status === 404) return NextResponse.json({ error: 'Media object was not found.' }, { status: 404 });
  if (!response.ok || !response.body) throw new Error(`R2 media fetch failed with status ${response.status}.`);

  const headers = new Headers({
    'Cache-Control': 'public, max-age=300',
    'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
  });
  const contentLength = response.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(response.body, { headers });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await context.params;
  const key = normalizeStorageKey(keyParts);
  if (!key) return NextResponse.json({ error: 'Invalid media key.' }, { status: 400 });

  try {
    return await streamFromBoundR2(key) ?? await streamFromR2FetchFallback(key);
  } catch (error) {
    console.error('iron_sprue_media_delivery_failed', {
      key,
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json({ error: 'Media delivery is temporarily unavailable.' }, { status: 502 });
  }
}
