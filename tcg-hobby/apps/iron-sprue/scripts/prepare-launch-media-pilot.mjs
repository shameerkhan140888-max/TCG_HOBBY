import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const envPath = path.join(appRoot, '.env.local');
const STORE_CODE = 'IRON_SPRUE';
const SYSTEM_ACTOR_ID = 'iron-sprue-media-pilot';
const BUCKET = 'iron-sprue-product-media';
const PILOT_BRANDS = ['Aoshima', 'Deluxe Materials', 'Expo Tools', 'OcCre Creations', 'Pintoo', 'CubicFun'];
const DERIVATIVE_WIDTHS = [320, 640, 960, 1280, 1600];
const FALLBACK_SOURCE_URLS_BY_SKU = {
  'IS-CUB-C007H': 'https://www.tasmaproducts.com/cubic-fun/c007h-era-of-navigation',
};
const WORKSHOP_PLACEHOLDERS = {
  Aoshima: path.join(appRoot, 'public', 'assets', 'hero-aoshima-lamborghini-workshop.png'),
  CubicFun: path.join(appRoot, 'public', 'assets', 'promo-cubicfun-landmark-workshop.png'),
  Pintoo: path.join(appRoot, 'public', 'assets', 'promo-pintoo-vase-workshop.png'),
  'Expo Tools': path.join(appRoot, 'public', 'assets', 'promo-tools.png'),
  'Deluxe Materials': path.join(appRoot, 'public', 'assets', 'promo-tools.png'),
};

function parseEnvFile(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

async function loadEnv() {
  const fileEnv = parseEnvFile(await readFile(envPath, 'utf8'));
  return {
    databaseUrl: process.env.IRON_SPRUE_DATABASE_URL?.trim() || fileEnv.IRON_SPRUE_DATABASE_URL?.trim(),
    r2Endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    r2AccessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    r2SecretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    r2Bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
    publicBaseUrl: process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, '') || fileEnv.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, ''),
  };
}

function assertConfig(env) {
  if (!env.databaseUrl) throw new Error('IRON_SPRUE_DATABASE_URL is required.');
  if (!env.r2Endpoint || !env.r2AccessKeyId || !env.r2SecretAccessKey) throw new Error('Iron Sprue R2 write credentials are required.');
  if (env.r2Bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  const db = new URL(env.databaseUrl);
  if (!/neon\.tech$/i.test(db.hostname)) throw new Error('Iron Sprue media pilot must target the dedicated Neon host.');
  if (/tcg[-_]?hobby/i.test(db.hostname) || /tcg[-_]?hobby/i.test(db.pathname)) throw new Error('Refusing a TCG Hobby-looking database target.');
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickPilotProducts(products) {
  if (process.argv.includes('--all-linked')) {
    return products.filter((product) => product.sourceMediaLinks?.some((link) => link.url?.startsWith('https://')) || FALLBACK_SOURCE_URLS_BY_SKU[product.sku]);
  }
  return PILOT_BRANDS.map((brand) => {
    const product = products.find((item) => item.brand === brand && item.publicationState !== 'REVIEW_REQUIRED') || products.find((item) => item.brand === brand);
    if (!product) throw new Error(`No pilot product found for ${brand}.`);
    return product;
  });
}

function sourcePageFor(product) {
  const firstLink = product.sourceMediaLinks?.find((link) => link.url?.startsWith('https://'))?.url;
  return firstLink || FALLBACK_SOURCE_URLS_BY_SKU[product.sku] || null;
}

function absoluteUrl(raw, base) {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function imageCandidatesFromHtml(html, baseUrl) {
  const candidates = [];
  const add = (raw, source) => {
    if (!raw) return;
    const url = absoluteUrl(raw.replace(/&amp;/g, '&'), baseUrl);
    if (!url || !url.startsWith('https://')) return;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) return;
    candidates.push({ url, source });
  };

  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)) {
    add(match[1], 'meta');
  }
  for (const match of html.matchAll(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    add(match[1], 'link');
  }
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src|data-largeimg)=["']([^"']+)["'][^>]*>/gi)) {
    add(match[1], 'img');
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

async function fetchBuffer(url) {
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'IronSprueMediaPilot/1.0 (+owner-authorised catalogue preparation)' } });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream',
  };
}

function imageCandidateScore(product, candidate) {
  const url = candidate.url.toLowerCase();
  if (/logo|icon|sprite|placeholder|loading|menu|banner|paypal|visa|mastercard/i.test(url)) return -100;
  let score = candidate.source === 'meta' ? 20 : 0;
  for (const token of [product.supplierSku, product.manufacturerReference, ...String(product.name).split(/\s+/)].filter(Boolean)) {
    const clean = String(token).toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (clean.length >= 3 && url.replace(/[^a-z0-9]+/g, '').includes(clean)) score += 8;
  }
  if (/product|products|catalog|image|photo|shop|wp-content|cdn/i.test(url)) score += 4;
  return score;
}

async function resolveSourceImage(product) {
  const pageUrl = sourcePageFor(product);
  if (!pageUrl) return { product, status: 'unresolved', reason: 'No source URL available.' };

  const page = await fetchBuffer(pageUrl);
  const html = page.buffer.toString('utf8');
  const candidates = imageCandidatesFromHtml(html, pageUrl)
    .map((candidate) => ({ ...candidate, score: imageCandidateScore(product, candidate) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (candidates.length === 0) return { product, status: 'unresolved', pageUrl, reason: 'No credible HTTPS JPEG/PNG/WebP image candidate found on source page.' };

  let sourceImage;
  let image;
  let metadata;
  for (const candidate of candidates.slice(0, 8)) {
    try {
      const fetched = await fetchBuffer(candidate.url);
      const decoded = await sharp(fetched.buffer).metadata();
      if ((decoded.width ?? 0) < 220 || (decoded.height ?? 0) < 220) continue;
      sourceImage = candidate;
      image = fetched;
      metadata = decoded;
      break;
    } catch {
      // Try the next credible candidate.
    }
  }

  if (!sourceImage || !image || !metadata?.width || !metadata?.height) {
    return { product, status: 'unresolved', pageUrl, reason: 'No credible product-sized source image could be decoded.' };
  }

  return {
    product,
    status: 'resolved',
    pageUrl,
    sourceImageUrl: sourceImage.url,
    sourceImageType: image.contentType,
    sourceImageBuffer: image.buffer,
    width: metadata.width,
    height: metadata.height,
  };
}

function extensionFor(contentType, fallbackUrl) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/jpeg' || contentType === 'image/jpg') return 'jpg';
  return fallbackUrl.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/)?.[1] || 'jpg';
}

function publicUrl(env, key) {
  return env.publicBaseUrl ? `${env.publicBaseUrl}/${key}` : null;
}

async function putObject(s3, key, body, contentType, cacheControl = 'public, max-age=31536000, immutable') {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }));
}

async function derivative(buffer, width, format) {
  const image = sharp(buffer, { failOn: 'none' })
    .resize({ width, height: width, fit: 'contain', background: '#ffffff', withoutEnlargement: true })
    .flatten({ background: '#ffffff' });
  if (format === 'avif') return image.avif({ quality: 55 }).toBuffer();
  if (format === 'webp') return image.webp({ quality: 82 }).toBuffer();
  return image.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

async function uploadSourceAndDerivatives(input, env, s3) {
  const hash = createHash('sha256').update(input.sourceImageBuffer).digest('hex');
  const productPart = `${slugify(input.product.sku)}-${slugify(input.product.slug)}`;
  const extension = extensionFor(input.sourceImageType, input.sourceImageUrl);
  const originalKey = `archive/products/${productPart}/original/${hash}.${extension}`;
  await putObject(s3, originalKey, input.sourceImageBuffer, input.sourceImageType);

  const derivativeRecords = [];
  for (const width of DERIVATIVE_WIDTHS) {
    for (const format of ['webp', 'avif', 'jpg']) {
      const output = await derivative(input.sourceImageBuffer, width, format);
      const key = `published/products/${productPart}/image-2/${width}.${format}`;
      await putObject(s3, key, output, format === 'jpg' ? 'image/jpeg' : `image/${format}`);
      const meta = await sharp(output).metadata();
      derivativeRecords.push({
        key,
        url: publicUrl(env, key),
        format,
        width: meta.width,
        height: meta.height,
        byteSize: output.length,
      });
    }
  }

  return {
    hash,
    original: {
      key: originalKey,
      url: publicUrl(env, originalKey),
      width: input.width,
      height: input.height,
      byteSize: input.sourceImageBuffer.length,
      mimeType: input.sourceImageType,
    },
    derivatives: derivativeRecords,
  };
}

async function uploadWorkshopPlaceholder(product, env, s3) {
  const placeholderPath = WORKSHOP_PLACEHOLDERS[product.brand];
  if (!placeholderPath) return null;
  let buffer;
  try {
    buffer = await readFile(placeholderPath);
  } catch {
    return null;
  }
  const output = await sharp(buffer, { failOn: 'none' }).resize({ width: 1600, height: 900, fit: 'cover' }).webp({ quality: 84 }).toBuffer();
  const productPart = `${slugify(product.sku)}-${slugify(product.slug)}`;
  const key = `processed/products/${productPart}/workshop/workshop-placeholder.webp`;
  await putObject(s3, key, output, 'image/webp');
  const meta = await sharp(output).metadata();
  return { key, url: publicUrl(env, key), width: meta.width, height: meta.height, byteSize: output.length };
}

async function updateNeon(prisma, product, uploaded, workshop) {
  const record = await prisma.ironSprueAdminProduct.findUnique({ where: { storeCode_sku: { storeCode: STORE_CODE, sku: product.sku } } });
  if (!record) throw new Error(`No Iron Sprue Admin product exists for ${product.sku}.`);

  await prisma.$transaction(async (tx) => {
    await tx.ironSprueAdminMediaAsset.deleteMany({
      where: {
        storeCode: STORE_CODE,
        productId: record.id,
        role: { in: ['manufacturer-original', 'catalogue-primary', 'catalogue-derivative', 'workshop-photography'] },
      },
    });

    await tx.ironSprueAdminMediaAsset.create({
      data: {
        storeCode: STORE_CODE,
        productId: record.id,
        role: 'manufacturer-original',
        url: uploaded.original.url,
        storageKey: uploaded.original.key,
        altText: `${product.brand} ${product.name} authorised source reference`,
        mimeType: uploaded.original.mimeType,
        byteSize: uploaded.original.byteSize,
        width: uploaded.original.width,
        height: uploaded.original.height,
        approvalState: 'PENDING',
        isPrimary: false,
        sortOrder: 90,
        uploadedById: SYSTEM_ACTOR_ID,
        lastError: null,
      },
    });

    const primary = uploaded.derivatives.find((item) => item.width === 1280 && item.format === 'webp') || uploaded.derivatives[0];
    await tx.ironSprueAdminMediaAsset.create({
      data: {
        storeCode: STORE_CODE,
        productId: record.id,
        role: 'catalogue-primary',
        url: primary.url,
        storageKey: primary.key,
        altText: `${product.name} clean catalogue primary image`,
        mimeType: `image/${primary.format === 'jpg' ? 'jpeg' : primary.format}`,
        byteSize: primary.byteSize,
        width: primary.width,
        height: primary.height,
        approvalState: 'PENDING',
        isPrimary: false,
        sortOrder: 10,
        uploadedById: SYSTEM_ACTOR_ID,
        lastError: 'Generated from source by deterministic canvas/format processing; requires visual Image 2 approval before publication.',
      },
    });

    for (const derivativeItem of uploaded.derivatives.filter((item) => item.key !== primary.key)) {
      await tx.ironSprueAdminMediaAsset.create({
        data: {
          storeCode: STORE_CODE,
          productId: record.id,
          role: 'catalogue-derivative',
          url: derivativeItem.url,
          storageKey: derivativeItem.key,
          altText: `${product.name} catalogue derivative ${derivativeItem.width}px ${derivativeItem.format}`,
          mimeType: `image/${derivativeItem.format === 'jpg' ? 'jpeg' : derivativeItem.format}`,
          byteSize: derivativeItem.byteSize,
          width: derivativeItem.width,
          height: derivativeItem.height,
          approvalState: 'PENDING',
          isPrimary: false,
          sortOrder: 20,
          uploadedById: SYSTEM_ACTOR_ID,
        },
      });
    }

    if (workshop) {
      await tx.ironSprueAdminMediaAsset.create({
        data: {
          storeCode: STORE_CODE,
          productId: record.id,
          role: 'workshop-photography',
          url: workshop.url,
          storageKey: workshop.key,
          altText: `${product.name} Iron Sprue workshop placeholder image`,
          mimeType: 'image/webp',
          byteSize: workshop.byteSize,
          width: workshop.width,
          height: workshop.height,
          approvalState: 'PENDING',
          isPrimary: false,
          sortOrder: 30,
          uploadedById: SYSTEM_ACTOR_ID,
          lastError: 'Placeholder workshop artwork; replace with product-specific approved workshop media before publication.',
        },
      });
    }

    await tx.ironSprueAdminContentReview.create({
      data: {
        storeCode: STORE_CODE,
        productId: record.id,
        fieldName: 'media-pilot',
        proposedValue: {
          sourcePageUrl: uploaded.sourcePageUrl,
          sourceImageUrl: uploaded.sourceImageUrl,
          sourceChecksum: uploaded.hash,
          retrievedAt: uploaded.retrievedAt,
          originalKey: uploaded.original.key,
          image2DerivativeCount: uploaded.derivatives.length,
          image2ApprovalRequired: true,
          workshopPlaceholderKey: workshop?.key ?? null,
        },
        sourceReference: uploaded.sourcePageUrl,
        status: 'PENDING',
      },
    });
  });
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const env = await loadEnv();
  assertConfig(env);

  const tempRoot = path.join(appRoot, '.media-work', 'pilot');
  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });

  const s3 = new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
  });
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: env.databaseUrl,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
      max: 5,
    }),
  });

  const report = {
    bucket: BUCKET,
    productsAttempted: 0,
    sourceResolved: 0,
    sourceOriginalsDownloaded: 0,
    localImage2DerivativeFiles: 0,
    originalsUploaded: 0,
    image2DerivativeFiles: 0,
    workshopPlaceholdersUploaded: 0,
    r2WriteErrors: [],
    unresolved: [],
    processed: [],
  };

  try {
    for (const product of pickPilotProducts(manifest.products)) {
      report.productsAttempted += 1;
      const resolved = await resolveSourceImage(product).catch((error) => ({
        product,
        status: 'unresolved',
        pageUrl: sourcePageFor(product),
        reason: error instanceof Error ? error.message : 'Unknown source resolution error.',
      }));
      if (resolved.status !== 'resolved') {
        report.unresolved.push({ sku: product.sku, brand: product.brand, title: product.name, sourcePageUrl: resolved.pageUrl, reason: resolved.reason });
        continue;
      }

      report.sourceResolved += 1;
      report.sourceOriginalsDownloaded += 1;
      const sourceHash = createHash('sha256').update(resolved.sourceImageBuffer).digest('hex');
      const sourceExtension = extensionFor(resolved.sourceImageType, resolved.sourceImageUrl);
      const productWorkDir = path.join(tempRoot, slugify(product.sku));
      await mkdir(path.join(productWorkDir, 'originals'), { recursive: true });
      await mkdir(path.join(productWorkDir, 'image-2'), { recursive: true });
      await writeFile(path.join(productWorkDir, 'originals', `${sourceHash}.${sourceExtension}`), resolved.sourceImageBuffer);
      for (const width of DERIVATIVE_WIDTHS) {
        for (const format of ['webp', 'avif', 'jpg']) {
          const output = await derivative(resolved.sourceImageBuffer, width, format);
          await writeFile(path.join(productWorkDir, 'image-2', `${width}.${format}`), output);
          report.localImage2DerivativeFiles += 1;
        }
      }

      let uploaded;
      try {
        uploaded = await uploadSourceAndDerivatives(resolved, env, s3);
      } catch (error) {
        report.r2WriteErrors.push({
          sku: product.sku,
          brand: product.brand,
          title: product.name,
          sourcePageUrl: resolved.pageUrl,
          sourceImageUrl: resolved.sourceImageUrl,
          sourceChecksum: sourceHash,
          error: error instanceof Error ? error.name || error.message : 'Unknown R2 upload error.',
        });
        continue;
      }

      uploaded.sourcePageUrl = resolved.pageUrl;
      uploaded.sourceImageUrl = resolved.sourceImageUrl;
      uploaded.retrievedAt = new Date().toISOString();
      const workshop = await uploadWorkshopPlaceholder(product, env, s3);
      await updateNeon(prisma, product, uploaded, workshop);

      report.originalsUploaded += 1;
      report.image2DerivativeFiles += uploaded.derivatives.length;
      if (workshop) report.workshopPlaceholdersUploaded += 1;
      report.processed.push({
        sku: product.sku,
        brand: product.brand,
        title: product.name,
        sourcePageUrl: resolved.pageUrl,
        sourceImageUrl: resolved.sourceImageUrl,
        originalKey: uploaded.original.key,
        image2DerivativeCount: uploaded.derivatives.length,
        workshopPlaceholderKey: workshop?.key ?? null,
      });
    }

    await writeFile(path.join(tempRoot, 'report.json'), JSON.stringify(report, null, 2));
    await writeFile(path.join(appRoot, 'data', 'media-pilot-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
