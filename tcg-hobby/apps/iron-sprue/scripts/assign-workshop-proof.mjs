import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const proofPath = path.join(appRoot, 'public', 'assets', 'workshop-proofs', 'iron-sprue-workshop-v1-is-aos-05628.png');
const recipePath = path.join(appRoot, 'docs', 'IRON_SPRUE_WORKSHOP_V1.md');
const STORE_CODE = 'IRON_SPRUE';
const SKU = 'IS-AOS-05628';
const BUCKET = 'iron-sprue-product-media';
const VERSION = 'IRON_SPRUE_WORKSHOP_V1';

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

function publicUrl(env, key) {
  return env.publicBaseUrl ? `${env.publicBaseUrl}/${key}` : null;
}

const recipe = {
  version: VERSION,
  sku: SKU,
  benchMaterial: 'dark premium modelling workbench with restrained industrial finish',
  matPlacement: 'approved Iron Sprue cutting mat flat on the bench, ruler/grid/cog details visible',
  foamexPosition: 'dark Iron Sprue Foamex/banner panel in the rear background, softly out of focus',
  cameraHeight: 'approximately 20-30cm above bench',
  cameraAngle: 'three-quarter front product view, landscape gallery framing',
  framing: 'product centered in the mat product zone with enough mat identity visible',
  focalFeel: 'realistic product photography depth of field, background gently softened',
  lightingDirection: 'warm key light from upper left with soft fill',
  lightingTemperature: 'warm workshop/studio light, not orange-heavy',
  shadowCharacter: 'realistic contact shadows under the model',
  backgroundDepth: 'shallow shelf/display depth, no cluttered/random props',
  logoBannerVisibility: 'Iron Sprue mark visible on mat and rear banner without oversized ad treatment',
  colourGrade: 'dark graphite, neutral bench, subtle orange accents, accurate product colour',
  workshopProps: 'limited paints/tools at edges only, supporting the modelling workshop context',
  productPlacementZone: 'central mat area, clear of logo-heavy corners and ruler edges',
};

async function main() {
  const env = await loadEnv();
  if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  const buffer = await readFile(proofPath);
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const key = `products/is-aos-05628/workshop/iron-sprue-workshop-v1-${checksum.slice(0, 12)}.png`;
  const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'image/png', CacheControl: 'public, max-age=31536000, immutable', Metadata: { store: 'iron-sprue', sku: SKU.toLowerCase(), version: VERSION.toLowerCase(), role: 'workshop-proof' } }));

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
  });
  try {
    const product = await prisma.ironSprueAdminProduct.findUnique({ where: { storeCode_sku: { storeCode: STORE_CODE, sku: SKU } } });
    if (!product) throw new Error(`Iron Sprue product not found: ${SKU}`);
    const media = await prisma.ironSprueAdminMediaAsset.upsert({
      where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
      create: {
        storeCode: STORE_CODE,
        productId: product.id,
        role: 'workshop-photography',
        url: publicUrl(env, key),
        storageKey: key,
        altText: 'Aoshima Toyota 2000GT Red on the canonical Iron Sprue workshop mat',
        mimeType: 'image/png',
        byteSize: buffer.length,
        approvalState: 'REVIEW_REQUIRED',
        isPrimary: false,
        sortOrder: 40,
        uploadedById: 'iron-sprue-workshop-proof',
        lastError: `${VERSION} proof only; requires user visual approval before workshop batch generation.`,
      },
      update: {
        approvalState: 'REVIEW_REQUIRED',
        isPrimary: false,
        uploadedById: 'iron-sprue-workshop-proof',
        lastError: `${VERSION} proof only; requires user visual approval before workshop batch generation.`,
      },
    });
    await prisma.ironSprueAdminContentReview.create({
      data: {
        storeCode: STORE_CODE,
        productId: product.id,
        fieldName: VERSION,
        proposedValue: { ...recipe, r2Key: key, checksum },
        sourceReference: 'Codex imagegen using approved Iron Sprue mat reference and IS-AOS-05628 Image 2 candidate',
        status: 'PENDING',
      },
    });
    await writeFile(recipePath, `# ${VERSION}\n\n${Object.entries(recipe).map(([name, value]) => `- ${name}: ${value}`).join('\n')}\n\n- r2Key: ${key}\n- approvalState: REVIEW_REQUIRED\n- batchStatus: locked pending user visual approval\n`);
    console.log(JSON.stringify({ version: VERSION, sku: SKU, bucket: BUCKET, key, mediaId: media.id, byteSize: buffer.length, approvalState: media.approvalState }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
