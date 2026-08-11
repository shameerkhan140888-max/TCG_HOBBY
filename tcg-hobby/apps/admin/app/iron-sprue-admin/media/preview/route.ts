import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '../../../../lib/auth.server';

export const dynamic = 'force-dynamic';

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
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
      region: process.env.IRON_SPRUE_R2_REGION?.trim() || 'auto',
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

export async function GET(request: NextRequest) {
  await requireAdminSession('/iron-sprue-admin/media', '/iron-sprue-admin/login');

  const key = normalizeStorageKey(request.nextUrl.searchParams.get('key'));
  if (!key) return NextResponse.json({ error: 'Invalid media key.' }, { status: 400 });

  const { bucket, client } = getIronSprueMediaClient();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
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
