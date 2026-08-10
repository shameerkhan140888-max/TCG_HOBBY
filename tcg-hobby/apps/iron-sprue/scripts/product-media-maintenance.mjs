import { CopyObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportPath = path.join(appRoot, 'data', 'product-media-maintenance-report.json');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const ACTOR = 'iron-sprue-product-media-maintenance';

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
    databaseUrl: process.env.IRON_SPRUE_DATABASE_URL?.trim() || fileEnv.IRON_SPRUE_DATABASE_URL?.trim(),
    endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    accessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
    publicBaseUrl: process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, '') || fileEnv.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, ''),
  };
}

function assertEnv(env) {
  if (!env.databaseUrl) throw new Error('IRON_SPRUE_DATABASE_URL is required.');
  if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  if (!env.endpoint || !env.accessKeyId || !env.secretAccessKey) throw new Error('R2 endpoint and credentials are required.');
  const database = new URL(env.databaseUrl);
  if (!/neon\.tech$/i.test(database.hostname)) throw new Error('Refusing non-Neon Iron Sprue database target.');
  if (/tcg[-_]?hobby/i.test(database.hostname) || /tcg[-_]?hobby/i.test(database.pathname)) throw new Error('Refusing TCG-looking database target.');
}

function publicUrl(env, key) {
  return env.publicBaseUrl ? `${env.publicBaseUrl}/${key}` : null;
}

function productMediaObject(key) {
  return /^(archive|published|processed|products)\/products\//.test(key);
}

function redundantProductObject(key) {
  if (/^published\/products\/.+\/image-2\/\d+\.(?:webp|avif|jpe?g)$/i.test(key)) return true;
  if (/^processed\/products\/.+\/workshop\/workshop-placeholder\.webp$/i.test(key)) return true;
  return false;
}

function isCanonicalOriginal(asset) {
  return asset.role === 'manufacturer-original' && asset.storageKey?.startsWith('archive/products/') && !asset.storageKey.endsWith('source-required.json');
}

function originalObjectsForProduct(objects, product) {
  const skuPrefix = `${product.sku.toLowerCase()}-`;
  return objects
    .filter((item) => {
      const match = item.key.match(/^archive\/products\/([^/]+)\/original\/[^/]+\.(?:jpe?g|png|webp)$/i);
      return match && match[1].startsWith(skuPrefix);
    })
    .sort((a, b) => b.size - a.size);
}

function mimeTypeFromKey(key) {
  if (/\.png$/i.test(key)) return 'image/png';
  if (/\.webp$/i.test(key)) return 'image/webp';
  return 'image/jpeg';
}

function isGeneratedImage2Proof(asset) {
  return asset.role === 'catalogue-primary' && /\/image-2\/candidate-[a-f0-9]{12}\.png$/i.test(asset.storageKey ?? '');
}

function secondRole(product) {
  if (/aoshima|cubicfun|pintoo/i.test(product.brand?.name ?? '')) return 'completed-result';
  if (/deluxe|expo|tasma|occre/i.test(product.brand?.name ?? '')) return 'supporting-detail';
  return 'supporting-detail';
}

async function listObjects(s3) {
  const objects = [];
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken }));
    for (const item of page.Contents ?? []) objects.push({ key: item.Key, size: item.Size ?? 0 });
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return objects;
}

async function deleteKeys(s3, keys) {
  let deleted = 0;
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    if (!chunk.length) continue;
    const result = await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
    deleted += chunk.length - (result.Errors?.length ?? 0);
  }
  return deleted;
}

async function objectExists(s3, key) {
  try {
    const result = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return { exists: true, byteSize: result.ContentLength ?? null, mimeType: result.ContentType ?? null };
  } catch {
    return { exists: false, byteSize: null, mimeType: null };
  }
}

async function copyObject(s3, sourceKey, targetKey, mimeType) {
  await s3.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${encodeURIComponent(sourceKey).replace(/%2F/g, '/')}`,
      Key: targetKey,
      ContentType: mimeType ?? undefined,
      MetadataDirective: 'COPY',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

async function main() {
  const apply = process.argv.includes('--apply');
  const env = await loadEnv();
  assertEnv(env);
  const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
  });

  try {
    const beforeObjects = await listObjects(s3);
    const productObjectsBefore = beforeObjects.filter((item) => productMediaObject(item.key));
    const redundantObjects = productObjectsBefore.filter((item) => redundantProductObject(item.key));
    const heroObjectsBefore = beforeObjects.filter((item) => item.key.startsWith('marketing/heroes/'));

    const products = await prisma.ironSprueAdminProduct.findMany({
      where: { storeCode: STORE_CODE },
      include: { brand: true, mediaAssets: true },
      orderBy: { sku: 'asc' },
    });

    const referencedKeys = new Set(products.flatMap((product) => product.mediaAssets.map((asset) => asset.storageKey).filter(Boolean)));
    const referencedRedundantKeys = redundantObjects.filter((item) => referencedKeys.has(item.key)).map((item) => item.key);
    const image2 = { sourceReused: 0, generated: 0, passed: 0, reviewRequired: 0, failed: [] };
    const second = { completed: 0, reviewRequired: 0, failed: [] };
    const orphanReferences = [];

    if (apply) {
      await prisma.$transaction(async (tx) => {
        await tx.ironSprueAdminMediaAsset.deleteMany({
          where: {
            storeCode: STORE_CODE,
            OR: [
              { role: 'catalogue-derivative' },
              { role: 'workshop-photography', storageKey: { contains: 'workshop-placeholder.webp' } },
              { storageKey: { in: referencedRedundantKeys } },
            ],
          },
        });
      });
      await deleteKeys(s3, redundantObjects.map((item) => item.key));
    }

    for (const product of products) {
      const currentGeneratedProof = product.mediaAssets.find(isGeneratedImage2Proof);
      const original = product.mediaAssets.find(isCanonicalOriginal);
      const r2Originals = originalObjectsForProduct(productObjectsBefore, product);
      const canonicalOriginal = original?.storageKey ? { key: original.storageKey, size: original.byteSize ?? null, mimeType: original.mimeType } : r2Originals[0] ? { key: r2Originals[0].key, size: r2Originals[0].size, mimeType: mimeTypeFromKey(r2Originals[0].key) } : null;
      if (currentGeneratedProof) {
        const exists = await objectExists(s3, currentGeneratedProof.storageKey);
        if (exists.exists) {
          image2.generated += 1;
          image2.reviewRequired += 1;
        } else {
          orphanReferences.push(currentGeneratedProof.storageKey);
          image2.failed.push(product.sku);
        }
      } else if (canonicalOriginal?.key) {
        const exists = await objectExists(s3, canonicalOriginal.key);
        if (!exists.exists) {
          orphanReferences.push(canonicalOriginal.key);
          image2.failed.push(product.sku);
        } else {
          image2.sourceReused += 1;
          image2.reviewRequired += 1;
          if (apply) {
            await prisma.ironSprueAdminMediaAsset.upsert({
              where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: canonicalOriginal.key } },
              create: {
                storeCode: STORE_CODE,
                productId: product.id,
                role: 'catalogue-primary',
                url: publicUrl(env, canonicalOriginal.key),
                storageKey: canonicalOriginal.key,
                altText: `${product.customerTitle} Image 2 candidate from authorised source`,
                mimeType: exists.mimeType ?? canonicalOriginal.mimeType,
                byteSize: exists.byteSize ?? canonicalOriginal.size,
                approvalState: 'REVIEW_REQUIRED',
                isPrimary: false,
                sortOrder: 10,
                uploadedById: ACTOR,
                lastError: 'Authorised source appears suitable as a clean catalogue candidate but requires visual approval before publication.',
              },
              update: {
                role: 'catalogue-primary',
                approvalState: 'REVIEW_REQUIRED',
                isPrimary: false,
                sortOrder: 10,
                uploadedById: ACTOR,
                lastError: 'Authorised source appears suitable as a clean catalogue candidate but requires visual approval before publication.',
              },
            });
          }
        }
      } else {
        image2.failed.push(product.sku);
      }

      const secondOriginal = r2Originals.find((item) => item.key !== canonicalOriginal?.key);
      if (secondOriginal?.key) {
        const exists = await objectExists(s3, secondOriginal.key);
        if (exists.exists) {
          second.completed += 1;
          second.reviewRequired += 1;
          if (apply) {
            const targetKey = `products/${product.sku.toLowerCase()}/supporting/source-view-${secondOriginal.key.split('/').pop()}`;
            await copyObject(s3, secondOriginal.key, targetKey, mimeTypeFromKey(secondOriginal.key));
            await prisma.ironSprueAdminMediaAsset.upsert({
              where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: targetKey } },
              create: {
                storeCode: STORE_CODE,
                productId: product.id,
                role: secondRole(product),
                url: publicUrl(env, targetKey),
                storageKey: targetKey,
                altText: `${product.customerTitle} supporting product reference`,
                mimeType: exists.mimeType ?? mimeTypeFromKey(secondOriginal.key),
                byteSize: exists.byteSize ?? secondOriginal.size,
                approvalState: 'REVIEW_REQUIRED',
                isPrimary: false,
                sortOrder: 30,
                uploadedById: ACTOR,
                lastError: 'Second gallery candidate copied from authorised source; requires visual review for usefulness before publication.',
              },
              update: {
                approvalState: 'REVIEW_REQUIRED',
                isPrimary: false,
                uploadedById: ACTOR,
                lastError: 'Second gallery candidate copied from authorised source; requires visual review for usefulness before publication.',
              },
            });
          }
        } else {
          second.failed.push(product.sku);
        }
      } else {
        second.failed.push(product.sku);
      }
    }

    const afterObjects = apply ? await listObjects(s3) : beforeObjects;
    const productObjectsAfter = afterObjects.filter((item) => productMediaObject(item.key));
    const report = {
      mode: apply ? 'applied' : 'dry-run',
      bucket: BUCKET,
      productMediaObjectsBefore: productObjectsBefore.length,
      productMediaObjectsAfter: productObjectsAfter.length,
      duplicateResizedObjectsRemoved: apply ? redundantObjects.length : 0,
      duplicateResizedObjectsIdentified: redundantObjects.length,
      bytesReclaimable: redundantObjects.reduce((total, item) => total + item.size, 0),
      bytesReclaimed: apply ? redundantObjects.reduce((total, item) => total + item.size, 0) : 0,
      originalSourceImagesRetained: productObjectsBefore.filter((item) => /^archive\/products\/.+\/original\/.+\.(?:jpe?g|png|webp)$/i.test(item.key)).length,
      heroObjectsBefore: heroObjectsBefore.length,
      heroDuplicatesRemoved: 0,
      image2,
      second,
      orphanReferences,
      generatedAt: new Date().toISOString(),
    };

    if (apply) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
