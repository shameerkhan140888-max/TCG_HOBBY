import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyIronSprueAdminMediaPreviewSignature } from '../../../../lib/iron-sprue-media-preview-signing.server';

export const dynamic = 'force-dynamic';
let localIronSprueEnv: Record<string, string> | null = null;

function parseEnvValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function readLocalIronSprueEnv() {
  if (localIronSprueEnv) return localIronSprueEnv;

  localIronSprueEnv = {};
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
  if (!value) throw new Error(`${name} is required for Iron Sprue media previews.`);
  return value;
}

function getIronSprueMediaClient() {
  const bucket = requiredEnv('IRON_SPRUE_R2_BUCKET_NAME');
  if (bucket !== 'iron-sprue-product-media') {
    throw new Error('Iron Sprue Admin media previews must use iron-sprue-product-media.');
  }

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

function normalizeStorageKey(value: string | null) {
  const key = value?.trim().replace(/^\/+/, '');
  if (!key || key.includes('..') || key.includes('\\')) return null;
  if (!/^(archive|products|processed|published|marketing|brands)\//.test(key)) return null;
  return key;
}

function isMissingR2Object(error: unknown) {
  return error instanceof Error && error.name === 'NoSuchKey';
}

export async function GET(request: NextRequest) {
  const key = normalizeStorageKey(request.nextUrl.searchParams.get('key'));
  if (!key) return NextResponse.json({ error: 'Invalid media key.' }, { status: 400 });
  if (!verifyIronSprueAdminMediaPreviewSignature(key, request.nextUrl.searchParams.get('exp'), request.nextUrl.searchParams.get('sig'))) {
    return NextResponse.json({ error: 'Invalid or expired media preview URL.' }, { status: 401 });
  }

  const { bucket, client } = getIronSprueMediaClient();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key })).catch((error: unknown) => {
    if (isMissingR2Object(error)) return null;
    throw error;
  });
  if (!object) return NextResponse.json({ error: 'Media object was not found.' }, { status: 404 });
  const body = object.Body?.transformToWebStream();
  if (!body) return NextResponse.json({ error: 'Media object has no readable body.' }, { status: 404 });

  const headers = new Headers({
    'Cache-Control': 'private, max-age=300',
    'Content-Type': object.ContentType ?? 'application/octet-stream',
  });
  if (object.ContentLength != null) headers.set('Content-Length', object.ContentLength.toString());

  return new Response(body, {
    headers,
  });
}
