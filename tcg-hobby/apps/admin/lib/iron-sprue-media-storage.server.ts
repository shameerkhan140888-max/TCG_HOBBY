import 'server-only';

import { HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const IRON_SPRUE_BUCKET = 'iron-sprue-product-media';
const ALLOWED_PREFIXES = ['archive/', 'products/', 'processed/', 'published/', 'marketing/', 'brands/'];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
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

function r2Config() {
  const bucket = ironSprueEnv('IRON_SPRUE_R2_BUCKET_NAME');
  const endpoint =
    ironSprueEnv('IRON_SPRUE_R2_ENDPOINT') ||
    (ironSprueEnv('IRON_SPRUE_R2_ACCOUNT_ID')
      ? `https://${ironSprueEnv('IRON_SPRUE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
      : '');
  const accessKeyId = ironSprueEnv('IRON_SPRUE_R2_ACCESS_KEY_ID');
  const secretAccessKey = ironSprueEnv('IRON_SPRUE_R2_SECRET_ACCESS_KEY');
  const region = ironSprueEnv('IRON_SPRUE_R2_REGION') || 'auto';

  if (bucket !== IRON_SPRUE_BUCKET) throw new Error('Iron Sprue Admin uploads must use iron-sprue-product-media.');
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('Iron Sprue R2 upload configuration is incomplete.');

  return { bucket, endpoint, accessKeyId, secretAccessKey, region };
}

function client() {
  const config = r2Config();
  return {
    bucket: config.bucket,
    client: new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

function assertAllowedKey(key: string) {
  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new Error('Iron Sprue media key is outside the approved R2 prefixes.');
  }
}

export function ironSprueStorageKeyFromImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('r2://')) return trimmed.slice('r2://'.length);

  const publicBase = ironSprueEnv('IRON_SPRUE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  if (publicBase && trimmed.startsWith(`${publicBase}/`)) {
    return trimmed.slice(publicBase.length + 1);
  }
  return null;
}

export function ironSprueAdminPreviewUrl(value: string | null | undefined, fallbackKey?: string | null) {
  const key = ironSprueStorageKeyFromImageUrl(value) ?? fallbackKey ?? null;
  if (key) return `/iron-sprue-admin/media/preview?key=${encodeURIComponent(key)}`;
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith('/assets/') || raw === '/icon.svg') {
    const base =
      process.env.IRON_SPRUE_STOREFRONT_PREVIEW_BASE?.trim().replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_IRON_SPRUE_STOREFRONT_URL?.trim().replace(/\/$/, '') ||
      'http://localhost:3004';
    return `${base}${raw}`;
  }
  return raw;
}

export async function uploadIronSprueAdminImage(input: {
  file: File;
  keyPrefix: string;
  altText?: string | null;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const file = input.file;
  if (!file || file.size === 0) throw new Error('Select an image to upload.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Iron Sprue image uploads are limited to 8 MB.');
  if (!file.type.startsWith('image/')) throw new Error('Only image uploads are allowed.');

  const prefix = input.keyPrefix.replace(/^\/+|\/+$/g, '');
  const slug = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'image';
  const key = `${prefix}/${Date.now()}-${slug}.webp`;
  assertAllowedKey(key);

  const source = Buffer.from(await file.arrayBuffer());
  const image = sharp(source).rotate().resize({
    width: input.maxWidth ?? 2400,
    height: input.maxHeight ?? 2400,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const metadata = await image.metadata();
  const body = await image.webp({ quality: 88, effort: 4 }).toBuffer();
  const { client: s3, bucket } = client();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return {
    key,
    url: `r2://${key}`,
    altText: input.altText?.trim() || null,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    mimeType: 'image/webp',
    byteSize: body.length,
  };
}

export async function listIronSprueR2Objects(prefix: string, maxKeys = 80) {
  const cleanPrefix = prefix.replace(/^\/+/, '');
  assertAllowedKey(cleanPrefix.endsWith('/') ? cleanPrefix : `${cleanPrefix}/`);
  const { client: s3, bucket } = client();
  const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: cleanPrefix, MaxKeys: maxKeys }));
  return (result.Contents ?? [])
    .filter((object) => object.Key && !object.Key.endsWith('/'))
    .map((object) => ({
      key: object.Key!,
      size: object.Size ?? 0,
      updatedAt: object.LastModified ?? null,
      previewUrl: `/iron-sprue-admin/media/preview?key=${encodeURIComponent(object.Key!)}`,
    }));
}

export async function assertIronSprueR2ObjectExists(key: string) {
  assertAllowedKey(key);
  const { client: s3, bucket } = client();
  await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}
