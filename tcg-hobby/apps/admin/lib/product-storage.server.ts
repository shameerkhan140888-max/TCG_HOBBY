import 'server-only';
import { randomUUID } from 'node:crypto';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp, { type Metadata } from 'sharp';

export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
type StorageConfig = { endpoint: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBaseUrl: string };
export type ProcessedProductImage = { storageKey: string; thumbnailKey: string; url: string; thumbnailUrl: string; main: Buffer; thumbnail: Buffer; width: number; height: number; mimeType: 'image/webp'; byteSize: number };

function env(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`Managed image storage is not configured: ${name} is missing.`); return value; }
export function getProductStorageConfig(): StorageConfig { return { endpoint: env('R2_ENDPOINT'), accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY'), bucket: env('R2_BUCKET_NAME'), publicBaseUrl: env('R2_PUBLIC_BASE_URL').replace(/\/$/, '') }; }
function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
export async function processProductImage(productId: string, file: File): Promise<ProcessedProductImage> {
  if (!file.size || file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('Choose a non-empty JPEG, PNG or WebP image no larger than 10 MB.');
  const source = Buffer.from(await file.arrayBuffer());
  if (!detectImageType(source)) throw new Error('The file contents are not a supported JPEG, PNG or WebP image.');
  let metadata: Metadata;
  try { metadata = await sharp(source, { failOn: 'error', limitInputPixels: MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION }).metadata(); } catch { throw new Error('The image is malformed or cannot be decoded safely.'); }
  if (!metadata.width || !metadata.height || metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) throw new Error(`Image dimensions must not exceed ${MAX_IMAGE_DIMENSION} pixels on either side.`);
  const prefix = `products/${productId}/${randomUUID()}`;
  const main = await sharp(source).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  const thumbnail = await sharp(source).rotate().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const outputMetadata = await sharp(main).metadata();
  const config = getProductStorageConfig(); const storageKey = `${prefix}/main.webp`; const thumbnailKey = `${prefix}/thumbnail.webp`;
  return { storageKey, thumbnailKey, url: `${config.publicBaseUrl}/${storageKey}`, thumbnailUrl: `${config.publicBaseUrl}/${thumbnailKey}`, main, thumbnail, width: outputMetadata.width ?? metadata.width, height: outputMetadata.height ?? metadata.height, mimeType: 'image/webp', byteSize: main.byteLength };
}
function client(config: StorageConfig) { return new S3Client({ region: 'auto', endpoint: config.endpoint, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }); }
export async function uploadProcessedProductImage(image: ProcessedProductImage) {
  const config = getProductStorageConfig(); const storage = client(config); const uploaded: string[] = [];
  try { for (const [Key, Body] of [[image.storageKey, image.main], [image.thumbnailKey, image.thumbnail]] as const) { await storage.send(new PutObjectCommand({ Bucket: config.bucket, Key, Body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' })); uploaded.push(Key); } }
  catch (error) { if (uploaded.length) await storage.send(new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: uploaded.map((Key) => ({ Key })) } })).catch(() => undefined); throw error; }
  finally { storage.destroy(); }
}
export async function deleteProductImageObjects(keys: string[]) { if (!keys.length) return; const config = getProductStorageConfig(); const storage = client(config); try { await storage.send(new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } })); } finally { storage.destroy(); } }
export function thumbnailKeyFor(storageKey: string) { return storageKey.replace(/\/main\.webp$/, '/thumbnail.webp'); }
