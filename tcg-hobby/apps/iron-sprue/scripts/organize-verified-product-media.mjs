import { CopyObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

throw new Error('Deprecated media organizer disabled: current product-media replacement and cleanup must use product-media-maintenance.mjs with IRON_SPRUE_ADMIN_DATABASE_URL against Railway production.');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const verifiedSourcesPath = path.join(appRoot, 'data', 'all-tasma-product-source-verification-2026-09-14.json');
const dataDir = path.join(appRoot, 'data');
const reportsDir = path.join(appRoot, 'reports');
const RUN_ID = '2026-09-14';
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const ACTOR = 'iron-sprue-verified-media-organization';
const APPLY = process.argv.includes('--apply');
const RAILWAY_PRODUCTION = process.argv.includes('--railway-production');
const IMAGE2_COVERAGE_THRESHOLD = 0.7;
const IMAGE2_CANVAS_SIZE = 1100;

const reportJsonPath = path.join(dataDir, `organized-product-media-${RUN_ID}${APPLY ? '' : '-dry-run'}.json`);
const reviewPath = path.join(reportsDir, `organized-product-media-review-${RUN_ID}${APPLY ? '' : '-dry-run'}.md`);

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

function assertEnv(env) {
  if (RAILWAY_PRODUCTION) {
    if (!env.IRON_SPRUE_ADMIN_DATABASE_URL) throw new Error('IRON_SPRUE_ADMIN_DATABASE_URL is required for --railway-production.');
    const url = new URL(env.IRON_SPRUE_ADMIN_DATABASE_URL);
    const railwayHost = /(^|\.)railway\.internal$|(^|\.)proxy\.rlwy\.net$|(^|\.)railway\.app$/i.test(url.hostname);
    const railwayTunnel = /^(127\.0\.0\.1|localhost)$/i.test(url.hostname) && url.pathname.replace(/^\//, '') === 'railway';
    if (!railwayHost && !railwayTunnel) {
      throw new Error('--railway-production requires an Iron Sprue Railway database host.');
    }
  } else if (!env.IRON_SPRUE_DATABASE_URL) {
    throw new Error('IRON_SPRUE_DATABASE_URL is required.');
  }
  if (env.IRON_SPRUE_R2_BUCKET_NAME !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  if (!env.IRON_SPRUE_R2_ENDPOINT || !env.IRON_SPRUE_R2_ACCESS_KEY_ID || !env.IRON_SPRUE_R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 endpoint and credentials are required.');
  }
}

function createPrismaClient(env) {
  if (RAILWAY_PRODUCTION) {
    return new PrismaClient({
      adapter: new PrismaPg({
        connectionString: env.IRON_SPRUE_ADMIN_DATABASE_URL,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 5_000,
        max: 5,
      }),
    });
  }
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: env.IRON_SPRUE_DATABASE_URL, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
  });
}

function publicUrl(env, key) {
  const base = env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  return base ? `${base}/${key}` : null;
}

function slugSku(sku) {
  return sku.toLowerCase();
}

function extensionFromContentType(contentType, fallbackUrl = '') {
  const normalized = String(contentType ?? '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('avif')) return 'avif';
  const match = String(fallbackUrl).toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
  return match?.[1] && ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(match[1]) ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

function keyFileName(key) {
  return String(key ?? '').split('/').pop() || 'asset';
}

function organizedKey(sku, roleFolder, fileName) {
  return `products/${slugSku(sku)}/organized-${RUN_ID}/${roleFolder}/${fileName}`;
}

function archiveKey(sku, roleFolder, oldKey) {
  return `archive/products/${slugSku(sku)}/replaced-${RUN_ID}/${roleFolder}/${keyFileName(oldKey)}`;
}

function copySource(bucket, sourceKey) {
  return `${bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, '/')}`;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function fetchSourceImage(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
    headers: { 'user-agent': 'IronSprueVerifiedMediaOrganization/1.0', accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`HTTP_${response.status} ${url}`);
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  return { buffer, contentType, width: metadata.width ?? null, height: metadata.height ?? null };
}

async function uploadBuffer(s3, key, buffer, contentType, metadata) {
  if (!APPLY) return;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: metadata,
  }));
}

async function copyObject(s3, sourceKey, targetKey, contentType) {
  if (!sourceKey) return;
  if (!APPLY) return;
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: copySource(BUCKET, sourceKey),
    Key: targetKey,
    ContentType: contentType ?? undefined,
    MetadataDirective: 'COPY',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

async function inspectR2Object(s3, key) {
  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const buffer = await streamToBuffer(object.Body);
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  return {
    buffer,
    contentType: object.ContentType ?? 'image/jpeg',
    byteSize: buffer.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

async function createImage2Replacement(buffer) {
  const source = sharp(buffer, { failOn: 'none' }).rotate();
  const background = await source
    .clone()
    .resize(IMAGE2_CANVAS_SIZE, IMAGE2_CANVAS_SIZE, { fit: 'cover', position: 'centre' })
    .blur(28)
    .modulate({ brightness: 0.88, saturation: 0.82 })
    .png()
    .toBuffer();

  let foreground;
  try {
    foreground = await source
      .clone()
      .trim({ background: '#ffffff', threshold: 18 })
      .resize(Math.round(IMAGE2_CANVAS_SIZE * 0.94), Math.round(IMAGE2_CANVAS_SIZE * 0.94), {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();
  } catch {
    foreground = await source
      .clone()
      .resize(Math.round(IMAGE2_CANVAS_SIZE * 0.94), Math.round(IMAGE2_CANVAS_SIZE * 0.94), {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();
  }

  const bufferOut = await sharp(background)
    .composite([{ input: foreground, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  const metadata = await sharp(bufferOut, { failOn: 'none' }).metadata();
  return {
    buffer: bufferOut,
    contentType: 'image/png',
    byteSize: bufferOut.length,
    width: metadata.width ?? IMAGE2_CANVAS_SIZE,
    height: metadata.height ?? IMAGE2_CANVAS_SIZE,
  };
}

function cardCoverage(width, height) {
  if (!width || !height) return null;
  const frameAspect = 1 / 0.88;
  const imageAspect = width / height;
  return imageAspect >= frameAspect ? frameAspect / imageAspect : imageAspect / frameAspect;
}

function isModelBrand(brandName) {
  return /^(Aoshima|Pintoo|CubicFun)$/i.test(String(brandName ?? ''));
}

function selectedApprovedAsset(product, role) {
  return [...product.mediaAssets]
    .filter((asset) => asset.role === role && asset.approvalState === 'APPROVED' && asset.storageKey)
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))[0] ?? null;
}

function selectedExistingOrganizedAsset(product, role) {
  return [...product.mediaAssets]
    .filter((asset) => asset.role === role && asset.approvalState === 'APPROVED' && String(asset.storageKey ?? '').includes(`/organized-${RUN_ID}/`) && !String(asset.storageKey ?? '').includes('tasma-image-2-fix'))
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))[0] ?? null;
}

function allRoleAssets(product, role) {
  return [...product.mediaAssets]
    .filter((asset) => asset.role === role && asset.storageKey && !String(asset.storageKey).includes(`/organized-${RUN_ID}/`) && !String(asset.storageKey).includes(`/replaced-${RUN_ID}/`));
}

function roleFolder(role) {
  if (role === 'manufacturer-original') return 'manufacturer';
  if (role === 'catalogue-primary') return 'image-2';
  if (role === 'workshop-photography') return 'workshop';
  return role;
}

async function archiveAsset({ tx, s3, env, product, asset, reason }) {
  if (!asset?.storageKey || String(asset.storageKey).includes(`/replaced-${RUN_ID}/`)) return null;
  const targetKey = archiveKey(product.sku, roleFolder(asset.role), asset.storageKey);
  let copied = false;
  let copyError = null;
  try {
    await copyObject(s3, asset.storageKey, targetKey, asset.mimeType);
    copied = true;
  } catch (error) {
    copyError = error instanceof Error ? error.message : String(error);
  }
  if (APPLY) {
    await tx.ironSprueAdminMediaAsset.update({
      where: { id: asset.id },
      data: {
        url: copyError ? asset.url : publicUrl(env, targetKey),
        storageKey: copyError ? asset.storageKey : targetKey,
        approvalState: 'REJECTED',
        isPrimary: false,
        sortOrder: Math.max(asset.sortOrder ?? 0, 900),
        uploadedById: ACTOR,
        lastError: copyError ? `${reason} Source object copy failed during archive: ${copyError}` : reason,
      },
    });
  }
  return { id: asset.id, from: asset.storageKey, to: targetKey, role: asset.role, reason, copied, copyError };
}

async function upsertMedia({ tx, env, product, role, key, altText, mimeType, byteSize, width, height, sortOrder, isPrimary, note }) {
  if (!APPLY) return null;
  return tx.ironSprueAdminMediaAsset.upsert({
    where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: key } },
    create: {
      storeCode: STORE_CODE,
      productId: product.id,
      role,
      url: publicUrl(env, key),
      storageKey: key,
      altText,
      mimeType,
      byteSize,
      width,
      height,
      approvalState: 'APPROVED',
      isPrimary,
      sortOrder,
      uploadedById: ACTOR,
      approvedAt: new Date(),
      lastError: note,
    },
    update: {
      role,
      url: publicUrl(env, key),
      altText,
      mimeType,
      byteSize,
      width,
      height,
      approvalState: 'APPROVED',
      isPrimary,
      sortOrder,
      uploadedById: ACTOR,
      approvedAt: new Date(),
      lastError: note,
    },
  });
}

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
}

await mkdir(dataDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });

const env = parseEnvFile(await readFile(envPath, 'utf8'));
assertEnv(env);
const verified = JSON.parse(await readFile(verifiedSourcesPath, 'utf8'));
const verifiedBySku = new Map(verified.results.map((item) => [item.sku, item]));
const launchProducts = JSON.parse(await readFile(launchProductsPath, 'utf8'));
const launchBySku = new Map(launchProducts.map((item) => [item.sku, item]));
const skus = launchProducts.map((item) => item.sku);

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.IRON_SPRUE_R2_ENDPOINT,
  credentials: { accessKeyId: env.IRON_SPRUE_R2_ACCESS_KEY_ID, secretAccessKey: env.IRON_SPRUE_R2_SECRET_ACCESS_KEY },
});
const prisma = createPrismaClient(env);

const actions = [];
const image2Audit = [];
const reviewRows = [];
const errors = [];

try {
  const products = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE, sku: { in: skus } },
    include: { brand: true, mediaAssets: true },
    orderBy: { sku: 'asc' },
  });
  const productBySku = new Map(products.map((item) => [item.sku, item]));

  for (const sku of skus) {
    const product = productBySku.get(sku);
    const launch = launchBySku.get(sku);
    const source = verifiedBySku.get(sku);
    if (!product) {
      errors.push({ sku, error: 'missing-db-product' });
      continue;
    }
    if (!source?.verification?.bestImage?.url) {
      errors.push({ sku, error: 'missing-verified-tasma-source' });
      continue;
    }

    try {
      const sourceImage = await fetchSourceImage(source.verification.bestImage.url);
      const sourceExtension = extensionFromContentType(sourceImage.contentType, source.verification.bestImage.url);
      const manufacturerKey = organizedKey(sku, 'manufacturer', `tasma-manufacturer-${hash(sourceImage.buffer)}.${sourceExtension}`);
      const existingManufacturer = selectedExistingOrganizedAsset(product, 'manufacturer-original');
      await uploadBuffer(s3, manufacturerKey, sourceImage.buffer, sourceImage.contentType, {
        store: 'iron-sprue',
        sku: sku.toLowerCase(),
        role: 'manufacturer-original',
        source: 'verified-tasma-products',
        run: RUN_ID,
      });

      const modelBrand = isModelBrand(product.brand?.name ?? launch?.brand);
      const existingImage2 = modelBrand ? selectedExistingOrganizedAsset(product, 'catalogue-primary') : null;
      const existingWorkshop = modelBrand ? selectedExistingOrganizedAsset(product, 'workshop-photography') : null;
      const currentImage2 = modelBrand ? selectedApprovedAsset(product, 'catalogue-primary') : null;
      const currentWorkshop = modelBrand ? selectedApprovedAsset(product, 'workshop-photography') : null;
      let organizedImage2 = null;
      let organizedWorkshop = null;
      let image2ReplacementReason = null;

      if (existingImage2) {
        organizedImage2 = {
          key: existingImage2.storageKey,
          contentType: existingImage2.mimeType,
          byteSize: existingImage2.byteSize,
          width: existingImage2.width,
          height: existingImage2.height,
        };
      } else if (currentImage2) {
        const currentCoverage = cardCoverage(currentImage2.width, currentImage2.height);
        const shouldReplaceImage2 = currentCoverage !== null && currentCoverage < IMAGE2_COVERAGE_THRESHOLD;
        const inspected = await inspectR2Object(s3, currentImage2.storageKey);
        image2Audit.push({
          sku,
          product: product.customerTitle,
          brand: product.brand?.name,
          currentKey: currentImage2.storageKey,
          currentWidth: currentImage2.width,
          currentHeight: currentImage2.height,
          cardCoverage: currentCoverage === null ? null : Number(currentCoverage.toFixed(3)),
          replaced: shouldReplaceImage2,
        });
        if (shouldReplaceImage2) {
          const replacement = await createImage2Replacement(inspected.buffer);
          organizedImage2 = {
            key: organizedKey(sku, 'image-2', `generated-image-2-replacement-${hash(replacement.buffer)}.png`),
            ...replacement,
          };
          image2ReplacementReason = `Image 2 reprocessed from the existing approved Image 2 because current card coverage ${Number(currentCoverage).toFixed(3)} is below ${IMAGE2_COVERAGE_THRESHOLD}; includes Burj-style narrow/letterboxed issue remediation without using manufacturer imagery.`;
          await uploadBuffer(s3, organizedImage2.key, organizedImage2.buffer, organizedImage2.contentType, {
            store: 'iron-sprue',
            sku: sku.toLowerCase(),
            role: 'catalogue-primary',
            source: 'existing-image2-reprocessed',
            run: RUN_ID,
          });
        } else {
          const ext = extensionFromContentType(inspected.contentType, currentImage2.storageKey);
          organizedImage2 = {
            key: organizedKey(sku, 'image-2', `current-image-2-${hash(inspected.buffer)}.${ext}`),
            ...inspected,
          };
          await copyObject(s3, currentImage2.storageKey, organizedImage2.key, inspected.contentType);
        }
      }

      if (existingWorkshop) {
        organizedWorkshop = {
          key: existingWorkshop.storageKey,
          contentType: existingWorkshop.mimeType,
          byteSize: existingWorkshop.byteSize,
          width: existingWorkshop.width,
          height: existingWorkshop.height,
        };
      } else if (currentWorkshop) {
        const inspected = await inspectR2Object(s3, currentWorkshop.storageKey);
        const ext = extensionFromContentType(inspected.contentType, currentWorkshop.storageKey);
        organizedWorkshop = {
          key: organizedKey(sku, 'workshop', `current-workshop-${hash(inspected.buffer)}.${ext}`),
          ...inspected,
        };
        await copyObject(s3, currentWorkshop.storageKey, organizedWorkshop.key, inspected.contentType);
      }

      const txAction = async (tx) => {
        const archived = [];
        for (const asset of allRoleAssets(product, 'manufacturer-original')) {
          const archivedAsset = await archiveAsset({
            tx,
            s3,
            env,
            product,
            asset,
            reason: `Archived before verified high-quality manufacturer replacement in organized-${RUN_ID}.`,
          });
          if (archivedAsset) archived.push(archivedAsset);
        }

        await upsertMedia({
          tx,
          env,
          product,
          role: 'manufacturer-original',
          key: existingManufacturer?.storageKey ?? manufacturerKey,
          altText: `${product.customerTitle} verified manufacturer image`,
          mimeType: existingManufacturer?.mimeType ?? sourceImage.contentType,
          byteSize: existingManufacturer?.byteSize ?? sourceImage.buffer.length,
          width: existingManufacturer?.width ?? sourceImage.width,
          height: existingManufacturer?.height ?? sourceImage.height,
          sortOrder: 40,
          isPrimary: false,
          note: `Verified high-quality manufacturer source from Tasma Products. Source: ${source.verification.bestImage.url}`,
        });

        if (organizedImage2) {
          for (const asset of allRoleAssets(product, 'catalogue-primary')) {
            const archivedAsset = await archiveAsset({
              tx,
              s3,
              env,
              product,
              asset,
              reason: image2ReplacementReason
                ? `Archived before Image 2 issue remediation in organized-${RUN_ID}.`
                : `Archived after copying current approved Image 2 into organized-${RUN_ID}.`,
            });
            if (archivedAsset) archived.push(archivedAsset);
          }
          await upsertMedia({
            tx,
            env,
            product,
            role: 'catalogue-primary',
            key: organizedImage2.key,
            altText: image2ReplacementReason ? `${product.customerTitle} corrected Image 2` : `${product.customerTitle} organized Image 2`,
            mimeType: organizedImage2.contentType,
            byteSize: organizedImage2.byteSize,
            width: organizedImage2.width,
            height: organizedImage2.height,
            sortOrder: 0,
            isPrimary: true,
            note: image2ReplacementReason ?? `Current approved Image 2 copied into organized-${RUN_ID} media set.`,
          });
        }

        if (organizedWorkshop) {
          for (const asset of allRoleAssets(product, 'workshop-photography')) {
            const archivedAsset = await archiveAsset({
              tx,
              s3,
              env,
              product,
              asset,
              reason: asset.id === currentWorkshop?.id
                ? `Archived after copying current approved workshop image into organized-${RUN_ID}.`
                : `Archived old workshop image before organized-${RUN_ID}; retained for later removal pass.`,
            });
            if (archivedAsset) archived.push(archivedAsset);
          }
          await upsertMedia({
            tx,
            env,
            product,
            role: 'workshop-photography',
            key: organizedWorkshop.key,
            altText: `${product.customerTitle} in the Iron Sprue workshop`,
            mimeType: organizedWorkshop.contentType,
            byteSize: organizedWorkshop.byteSize,
            width: organizedWorkshop.width,
            height: organizedWorkshop.height,
            sortOrder: 40,
            isPrimary: false,
            note: `Current approved workshop image copied into organized-${RUN_ID} media set; old workshop rows archived for later removal.`,
          });
        }
        return archived;
      };

      const archived = APPLY ? await prisma.$transaction(txAction, { timeout: 30_000 }) : [];
      actions.push({
        sku,
        product: product.customerTitle,
        brand: product.brand?.name,
        manufacturer: { key: manufacturerKey, sourceUrl: source.verification.bestImage.url, width: sourceImage.width, height: sourceImage.height },
        image2: organizedImage2 ? {
          key: organizedImage2.key,
          width: organizedImage2.width,
          height: organizedImage2.height,
          replacedForCoverageIssue: Boolean(image2ReplacementReason),
        } : null,
        workshop: organizedWorkshop ? { key: organizedWorkshop.key, width: organizedWorkshop.width, height: organizedWorkshop.height } : null,
        archived,
      });
      reviewRows.push({
        sku,
        product: product.customerTitle,
        brand: product.brand?.name,
        manufacturerKey,
        manufacturerSource: source.verification.bestImage.url,
        image2Key: organizedImage2?.key ?? null,
        image2Fixed: Boolean(image2ReplacementReason),
        workshopKey: organizedWorkshop?.key ?? null,
      });
    } catch (error) {
      errors.push({ sku, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const summary = {
    mode: APPLY ? 'applied' : 'dry-run',
    products: skus.length,
    manufacturerImagesPrepared: actions.filter((item) => item.manufacturer).length,
    modelBrandProductsWithImage2Organized: actions.filter((item) => item.image2).length,
    modelBrandProductsWithWorkshopOrganized: actions.filter((item) => item.workshop).length,
    image2CoverageIssuesFixed: actions.filter((item) => item.image2?.replacedForCoverageIssue).length,
    archivedRows: actions.reduce((count, item) => count + item.archived.length, 0),
    errors: errors.length,
  };

  const result = {
    generatedAt: new Date().toISOString(),
    runId: RUN_ID,
    organizedRoot: `products/<sku>/organized-${RUN_ID}/`,
    archiveRoot: `archive/products/<sku>/replaced-${RUN_ID}/`,
    summary,
    image2Audit,
    actions,
    errors,
  };
  await writeFile(reportJsonPath, `${JSON.stringify(result, null, 2)}\n`);

  const markdown = [
    '# Organized Product Media Review',
    '',
    `Generated: ${result.generatedAt}`,
    `Mode: ${summary.mode}`,
    '',
    row(['Metric', 'Value']),
    row(['---', '---']),
    row(['Manufacturer images prepared', summary.manufacturerImagesPrepared]),
    row(['Image 2 files organized for Aoshima/Pintoo/CubicFun', summary.modelBrandProductsWithImage2Organized]),
    row(['Workshop files organized for Aoshima/Pintoo/CubicFun', summary.modelBrandProductsWithWorkshopOrganized]),
    row(['Image 2 coverage issues fixed', summary.image2CoverageIssuesFixed]),
    row(['Archived rows', summary.archivedRows]),
    row(['Errors', summary.errors]),
    '',
    '## Image 2 Coverage Fixes',
    '',
    row(['SKU', 'Product', 'Brand', 'Old coverage', 'Old dimensions']),
    row(['---', '---', '---', '---', '---']),
    ...image2Audit.filter((item) => item.replaced).map((item) => row([item.sku, item.product, item.brand, item.cardCoverage, `${item.currentWidth}x${item.currentHeight}`])),
    '',
    '## New Organized Images',
    '',
    row(['SKU', 'Product', 'Brand', 'Manufacturer image', 'Image 2', 'Workshop']),
    row(['---', '---', '---', '---', '---', '---']),
    ...reviewRows.map((item) => row([
      item.sku,
      item.product,
      item.brand,
      item.manufacturerKey,
      item.image2Key ? `${item.image2Key}${item.image2Fixed ? ' (fixed)' : ''}` : '',
      item.workshopKey ?? '',
    ])),
    '',
    `Full JSON: ${reportJsonPath}`,
  ].join('\n');
  await writeFile(reviewPath, `${markdown}\n`);
  console.log(JSON.stringify({ reportJsonPath, reviewPath, summary, errors }, null, 2));
} finally {
  await prisma.$disconnect();
}
