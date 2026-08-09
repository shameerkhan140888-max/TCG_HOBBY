import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const SYSTEM_ACTOR_ID = 'iron-sprue-image2-proof';
const SKU = 'IS-AOS-05628';
const LOCAL_CANDIDATE = path.join(appRoot, 'public', 'assets', 'catalogue-candidates', 'is-aos-05628-toyota-2000gt-red-image-2-candidate.png');

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
    databaseUrl:
      process.env.IRON_SPRUE_DIRECT_DATABASE_URL?.trim() ||
      fileEnv.IRON_SPRUE_DIRECT_DATABASE_URL?.trim() ||
      process.env.IRON_SPRUE_DATABASE_URL?.trim() ||
      fileEnv.IRON_SPRUE_DATABASE_URL?.trim(),
    r2Endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    r2AccessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    r2SecretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    r2Bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
    publicBaseUrl:
      process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, '') ||
      fileEnv.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, ''),
  };
}

function assertConfig(env) {
  if (!env.databaseUrl) throw new Error('IRON_SPRUE_DATABASE_URL is required.');
  if (!env.r2Endpoint || !env.r2AccessKeyId || !env.r2SecretAccessKey) throw new Error('Iron Sprue R2 write credentials are required.');
  if (env.r2Bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  const db = new URL(env.databaseUrl);
  if (!/neon\.tech$/i.test(db.hostname)) throw new Error('Image 2 proof must target the dedicated Neon host.');
  if (/tcg[-_]?hobby/i.test(db.hostname) || /tcg[-_]?hobby/i.test(db.pathname)) throw new Error('Refusing a TCG Hobby-looking database target.');
}

function publicUrl(env, key) {
  if (!env.publicBaseUrl) return null;
  return `${env.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function main() {
  const env = await loadEnv();
  assertConfig(env);

  const candidate = await readFile(LOCAL_CANDIDATE);
  const metadata = await sharp(candidate, { failOn: 'none' }).metadata();
  const checksum = createHash('sha256').update(candidate).digest('hex');
  const key = `processed/products/is-aos-05628-aoshima-05628-toyota-2000gt-red/image-2/candidate-${checksum.slice(0, 12)}.png`;
  const url = publicUrl(env, key);

  const s3 = new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: candidate,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        store: 'iron-sprue',
        sku: SKU.toLowerCase(),
        role: 'image-2-candidate',
        source: 'codex-imagegen-edit',
      },
    }),
  );

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: env.databaseUrl,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
      max: 5,
    }),
  });

  try {
    const product = await prisma.ironSprueAdminProduct.findUnique({
      where: { storeCode_sku: { storeCode: STORE_CODE, sku: SKU } },
    });
    if (!product) throw new Error(`Iron Sprue Admin product not found for ${SKU}.`);

    await prisma.$transaction(async (tx) => {
      await tx.ironSprueAdminMediaAsset.upsert({
        where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
        create: {
          storeCode: STORE_CODE,
          productId: product.id,
          role: 'catalogue-primary',
          url,
          storageKey: key,
          altText: 'Aoshima Toyota 2000GT Red isolated on a clean white catalogue background',
          mimeType: 'image/png',
          byteSize: candidate.length,
          width: metadata.width,
          height: metadata.height,
          approvalState: 'REVIEW_REQUIRED',
          isPrimary: false,
          sortOrder: 9,
          uploadedById: SYSTEM_ACTOR_ID,
          lastError:
            'Image 2 candidate generated by Codex image editing from product-led source artwork; requires Admin visual approval before becoming primary.',
        },
        update: {
          productId: product.id,
          role: 'catalogue-primary',
          url,
          altText: 'Aoshima Toyota 2000GT Red isolated on a clean white catalogue background',
          mimeType: 'image/png',
          byteSize: candidate.length,
          width: metadata.width,
          height: metadata.height,
          approvalState: 'REVIEW_REQUIRED',
          isPrimary: false,
          sortOrder: 9,
          uploadedById: SYSTEM_ACTOR_ID,
          lastError:
            'Image 2 candidate generated by Codex image editing from product-led source artwork; requires Admin visual approval before becoming primary.',
        },
      });

      await tx.ironSprueAdminContentReview.create({
        data: {
          storeCode: STORE_CODE,
          productId: product.id,
          fieldName: 'image-2-candidate',
          proposedValue: {
            storageKey: key,
            source: 'Codex image-generation/editing skill',
            sourceArtwork: 'Toyota 2000GT Red product-led hero source artwork',
            transformation: 'Product isolated from workshop source and placed on clean white catalogue canvas.',
            checksum,
            width: metadata.width,
            height: metadata.height,
            approvalState: 'REVIEW_REQUIRED',
          },
          sourceReference: 'codex-imagegen-edit',
          status: 'PENDING',
        },
      });
    });

    const assigned = await prisma.ironSprueAdminMediaAsset.findUnique({
      where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
      select: { id: true, productId: true, role: true, approvalState: true, isPrimary: true, storageKey: true, width: true, height: true, byteSize: true },
    });

    console.log(
      JSON.stringify(
        {
          sku: SKU,
          bucket: BUCKET,
          uploaded: true,
          assigned: Boolean(assigned),
          media: assigned,
          publicUrl: url,
          checksum: checksum.slice(0, 12),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
