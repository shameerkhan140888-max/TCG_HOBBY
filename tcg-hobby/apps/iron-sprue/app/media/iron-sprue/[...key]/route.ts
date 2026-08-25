import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

function ironSprueEnv(name: string) {
  return process.env[name]?.trim() || readLocalIronSprueEnv()[name]?.trim() || '';
}

function requiredEnv(name: string) {
  const value = ironSprueEnv(name);
  if (!value) throw new Error(`${name} is required for Iron Sprue media delivery.`);
  return value;
}

function normalizeStorageKey(parts: string[]) {
  const key = parts.join('/').trim().replace(/^\/+/, '');
  if (!key || key.includes('..') || key.includes('\\') || !ALLOWED_PREFIX.test(key)) return null;
  return key;
}

function mediaClient() {
  const bucket = requiredEnv('IRON_SPRUE_R2_BUCKET_NAME');
  if (bucket !== BUCKET) throw new Error('Iron Sprue media delivery must use iron-sprue-product-media.');

  return {
    bucket,
    client: new S3Client({
      region: ironSprueEnv('IRON_SPRUE_R2_REGION') || 'auto',
      endpoint: requiredEnv('IRON_SPRUE_R2_ENDPOINT').replace(/\/$/, ''),
      credentials: {
        accessKeyId: requiredEnv('IRON_SPRUE_R2_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('IRON_SPRUE_R2_SECRET_ACCESS_KEY'),
      },
    }),
  };
}

async function boundMediaBucket() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as Record<string, unknown>)[R2_BINDING] as BoundR2Bucket | undefined;
  } catch {
    return undefined;
  }
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

async function streamFromS3Fallback(key: string) {
  const { bucket, client } = mediaClient();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = object.Body?.transformToWebStream();
  if (!body) return NextResponse.json({ error: 'Media object has no readable body.' }, { status: 404 });

  const headers = new Headers({
    'Cache-Control': 'public, max-age=300',
    'Content-Type': object.ContentType ?? 'application/octet-stream',
  });
  if (object.ContentLength != null) headers.set('Content-Length', object.ContentLength.toString());

  return new Response(body, { headers });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await context.params;
  const key = normalizeStorageKey(keyParts);
  if (!key) return NextResponse.json({ error: 'Invalid media key.' }, { status: 400 });

  try {
    return await streamFromBoundR2(key) ?? await streamFromS3Fallback(key);
  } catch (error) {
    console.error('iron_sprue_media_delivery_failed', {
      key,
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json({ error: 'Media delivery is temporarily unavailable.' }, { status: 502 });
  }
}
