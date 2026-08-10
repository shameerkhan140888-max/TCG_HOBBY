import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const missingReportPath = path.join(appRoot, 'data', 'missing-source-media-report.json');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const recoveryReportPath = path.join(appRoot, 'data', 'tasma-source-recovery-report.json');
const STORE_CODE = 'IRON_SPRUE';
const BUCKET = 'iron-sprue-product-media';
const TASMA = 'https://www.tasmaproducts.com';
const USER_AGENT = 'IronSprueSourceRecovery/1.0 (+owner-authorised Tasma catalogue preparation)';
const APPLY = process.argv.includes('--apply');
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : Infinity;

const CATEGORY_BY_BRAND = {
  Aoshima: ['aoshima-plastic-kits'],
  CubicFun: ['cubic-fun', 'end-of-line'],
  Pintoo: ['pintoo', 'end-of-line'],
  'Deluxe Materials': ['deluxe-materials'],
  Tasma: ['tools', 'accessories', 'end-of-line'],
  'OcCre Creations': ['occre', 'occre-creations', 'tools'],
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

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function codeForms(product) {
  const raw = [product.supplierSku, product.manufacturerReference, product.sku.replace(/^IS-[A-Z]+-/, '')].filter(Boolean);
  const forms = new Set();
  for (const value of raw) {
    const upper = String(value).trim();
    forms.add(upper);
    forms.add(slugify(upper));
    forms.add(upper.replace(/-/g, ''));
    forms.add(upper.toLowerCase());
    forms.add(slugify(upper.toLowerCase()));
    forms.add(upper.toLowerCase().replace(/-/g, ''));
  }
  return [...forms].filter(Boolean);
}

function pageCandidates(product, previousUrls) {
  const candidates = new Set();
  const categories = CATEGORY_BY_BRAND[product.brand] ?? ['end-of-line'];
  const nameSlug = slugify(product.name);
  const slugTail = slugify(product.slug.replace(/^[^-]+-/, ''));
  for (const category of categories) {
    for (const code of codeForms(product)) {
      const lowerCode = code.toLowerCase();
      candidates.add(`${TASMA}/${category}/${lowerCode}-${nameSlug}`);
      candidates.add(`${TASMA}/${category}/${lowerCode}-${slugTail}`);
      candidates.add(`${TASMA}/${category}/${lowerCode}`);
    }
  }
  for (const code of codeForms(product)) {
    candidates.add(`${TASMA}/index.php?route=product/search&search=${encodeURIComponent(code)}`);
  }
  candidates.add(`${TASMA}/index.php?route=product/search&search=${encodeURIComponent(product.name)}`);
  for (const url of previousUrls ?? []) {
    if (/tasmaproducts\.com/i.test(url)) candidates.add(url);
  }
  return [...candidates].slice(0, 16);
}

function absoluteUrl(raw, base) {
  try {
    return new URL(raw.replace(/&amp;/g, '&'), base).toString();
  } catch {
    return null;
  }
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12_000), headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' } });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  return { url: response.url, contentType, text };
}

async function fetchBuffer(url) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12_000), headers: { 'user-agent': USER_AGENT, accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' } });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return {
    url: response.url,
    contentType: response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream',
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

function titleFromHtml(html) {
  return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim()
    ?? '';
}

function productLinksFromSearch(html, baseUrl, product) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = absoluteUrl(match[1], baseUrl);
    if (!href || !href.startsWith(TASMA)) continue;
    if (/route=product\/search/i.test(href)) continue;
    const text = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const haystack = `${href} ${text}`.toLowerCase();
    const hasCode = codeForms(product).some((code) => code.length >= 3 && haystack.includes(code.toLowerCase()));
    const tokenHits = nameTokens(product.name).filter((token) => haystack.includes(token)).length;
    if (hasCode || tokenHits >= Math.min(3, nameTokens(product.name).length)) links.push(href);
  }
  return [...new Set(links)].slice(0, 8);
}

function nameTokens(value) {
  return slugify(value).split('-').filter((token) => token.length >= 3 && !['and', 'with', 'the', 'new', 'set', 'pcs'].includes(token));
}

function verifyPageIdentity(product, html, url) {
  const haystack = `${url} ${titleFromHtml(html)} ${html.slice(0, 20000)}`.toLowerCase().replace(/&amp;/g, '&');
  const compact = haystack.replace(/[^a-z0-9]+/g, '');
  const codes = codeForms(product).map((code) => code.toLowerCase().replace(/[^a-z0-9]+/g, '')).filter((code) => code.length >= 3);
  const hasCode = codes.some((code) => compact.includes(code));
  const tokens = nameTokens(product.name);
  const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
  const brandHit = haystack.includes(product.brand.toLowerCase().split(/\s+/)[0]);
  const ok = hasCode || (brandHit && tokenHits >= Math.min(3, tokens.length)) || tokenHits >= Math.min(4, tokens.length);
  return { ok, hasCode, brandHit, tokenHits, title: titleFromHtml(html) };
}

function imageCandidatesFromHtml(html, baseUrl) {
  const candidates = [];
  const add = (raw, source) => {
    if (!raw) return;
    for (const part of String(raw).split(',')) {
      const first = part.trim().split(/\s+/)[0];
      const url = absoluteUrl(first, baseUrl);
      if (!url || !url.startsWith('https://')) continue;
      if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
      candidates.push({ url, source });
    }
  };
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'meta');
  for (const match of html.matchAll(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'link');
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src|data-original|data-largeimg|data-zoom-image)=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'img');
  for (const match of html.matchAll(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'srcset');
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

function imageScore(product, candidate) {
  const url = candidate.url.toLowerCase();
  if (/logo|icon|sprite|placeholder|loading|menu|banner|paypal|visa|mastercard|no_image|spacer/i.test(url)) return -100;
  let score = candidate.source === 'meta' ? 30 : candidate.source === 'srcset' ? 18 : 10;
  const compactUrl = url.replace(/[^a-z0-9]+/g, '');
  for (const code of codeForms(product)) {
    const clean = code.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (clean.length >= 3 && compactUrl.includes(clean)) score += 25;
  }
  for (const token of nameTokens(product.name)) {
    if (compactUrl.includes(token)) score += 5;
  }
  if (/cache|catalog|product|products|image|photo|shop|data|cdn|media/i.test(url)) score += 4;
  return score;
}

async function listExistingOriginals(s3) {
  const keys = new Set();
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'archive/products/', ContinuationToken }));
    for (const item of page.Contents ?? []) {
      if (/^archive\/products\/[^/]+\/original\/[^/]+\.(?:jpe?g|png|webp)$/i.test(item.Key ?? '')) keys.add(item.Key);
    }
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return keys;
}

function productPart(product) {
  return `${slugify(product.sku)}-${slugify(product.slug)}`;
}

function extensionFor(contentType, url) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return url.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/)?.[1] || 'jpg';
}

function publicUrl(env, key) {
  return env.publicBaseUrl ? `${env.publicBaseUrl}/${key}` : null;
}

async function resolveProduct(product, previousUrls) {
  const attempts = [];
  const queue = pageCandidates(product, previousUrls);
  const seenPages = new Set();

  for (let index = 0; index < queue.length && index < 24; index += 1) {
    const candidateUrl = queue[index];
    if (!candidateUrl || seenPages.has(candidateUrl)) continue;
    seenPages.add(candidateUrl);
    let page;
    try {
      page = await fetchText(candidateUrl);
    } catch (error) {
      attempts.push({ url: candidateUrl, status: 'page-failed', error: error instanceof Error ? error.message : 'UNKNOWN' });
      continue;
    }

    if (/route=product\/search/i.test(candidateUrl) || /route=product\/search/i.test(page.url)) {
      const links = productLinksFromSearch(page.text, page.url, product);
      for (const link of links) {
        if (!seenPages.has(link)) queue.push(link);
      }
      attempts.push({ url: candidateUrl, status: 'search-page', discoveredLinks: links.length });
      continue;
    }

    const identity = verifyPageIdentity(product, page.text, page.url);
    if (!identity.ok) {
      attempts.push({ url: page.url, status: 'identity-mismatch', identity });
      continue;
    }

    const candidates = imageCandidatesFromHtml(page.text, page.url)
      .map((candidate) => ({ ...candidate, score: imageScore(product, candidate) }))
      .filter((candidate) => candidate.score >= 0)
      .sort((a, b) => b.score - a.score);
    if (candidates.length === 0) {
      attempts.push({ url: page.url, status: 'no-image-candidate', identity });
      continue;
    }

    for (const candidate of candidates.slice(0, 6)) {
      try {
        const image = await fetchBuffer(candidate.url);
        const metadata = await sharp(image.buffer, { failOn: 'none' }).metadata();
        if ((metadata.width ?? 0) < 220 || (metadata.height ?? 0) < 220) {
          attempts.push({ url: page.url, status: 'image-too-small', imageUrl: candidate.url, width: metadata.width, height: metadata.height });
          continue;
        }
        return { status: 'recovered', pageUrl: page.url, identity, imageUrl: image.url, imageSource: candidate.source, imageScore: candidate.score, contentType: image.contentType, buffer: image.buffer, width: metadata.width, height: metadata.height, attempts };
      } catch (error) {
        attempts.push({ url: page.url, status: 'image-fetch-failed', imageUrl: candidate.url, error: error instanceof Error ? error.message : 'UNKNOWN' });
      }
    }
  }

  return { status: 'unresolved', attempts };
}

async function main() {
  const env = await loadEnv();
  if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }) });
  const launchProducts = JSON.parse(await readFile(launchProductsPath, 'utf8'));
  const missingReport = JSON.parse(await readFile(missingReportPath, 'utf8'));
  const missingBySku = new Map((missingReport.rows ?? []).map((row) => [row.sku, row]));
  const products = launchProducts.filter((product) => missingBySku.has(product.sku));
  const existingOriginals = await listExistingOriginals(s3);
  const report = { generatedAt: new Date().toISOString(), mode: APPLY ? 'applied' : 'dry-run', recovered: [], unresolved: [], skippedExistingOriginal: [] };
  let processed = 0;

  try {
    for (const product of products) {
      if (processed >= LIMIT) break;
      processed += 1;
      const part = productPart(product);
      const previous = missingBySku.get(product.sku)?.sourceUrls ?? [];
      const result = await resolveProduct(product, previous);
      if (result.status !== 'recovered') {
        report.unresolved.push({
          sku: product.sku,
          product: product.name,
          brand: product.brand,
          reason: 'TASMA_RECOVERY_FAILED',
          attempts: result.attempts.slice(-12),
        });
        await writeFile(recoveryReportPath, `${JSON.stringify(report, null, 2)}\n`);
        continue;
      }

      const checksum = createHash('sha256').update(result.buffer).digest('hex');
      const extension = extensionFor(result.contentType, result.imageUrl);
      const originalKey = `archive/products/${part}/original/${checksum}.${extension}`;

      if (APPLY) {
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: originalKey, Body: result.buffer, ContentType: result.contentType, CacheControl: 'public, max-age=31536000, immutable', Metadata: { store: 'iron-sprue', sku: product.sku.toLowerCase(), source: 'tasma-products', role: 'canonical-original' } }));
        const adminProduct = await prisma.ironSprueAdminProduct.findUnique({ where: { storeCode_sku: { storeCode: STORE_CODE, sku: product.sku } } });
        if (!adminProduct) throw new Error(`Missing Iron Sprue Admin product ${product.sku}`);
        await prisma.ironSprueAdminMediaAsset.upsert({
          where: { storeCode_storageKey: { storeCode: STORE_CODE, storageKey: originalKey } },
          create: {
            storeCode: STORE_CODE,
            product: { connect: { id: adminProduct.id } },
            role: 'manufacturer-original',
            url: publicUrl(env, originalKey),
            storageKey: originalKey,
            altText: `${product.name} authorised Tasma source image`,
            mimeType: result.contentType,
            byteSize: result.buffer.length,
            width: result.width,
            height: result.height,
            approvalState: 'REVIEW_REQUIRED',
            isPrimary: false,
            sortOrder: 5,
            uploadedById: 'iron-sprue-tasma-source-recovery',
            lastError: `Recovered canonical original from Tasma page ${result.pageUrl}; source image ${result.imageUrl}; checksum ${checksum}.`,
          },
          update: {
            url: publicUrl(env, originalKey),
            altText: `${product.name} authorised Tasma source image`,
            mimeType: result.contentType,
            byteSize: result.buffer.length,
            width: result.width,
            height: result.height,
            approvalState: 'REVIEW_REQUIRED',
            isPrimary: false,
            sortOrder: 5,
            uploadedById: 'iron-sprue-tasma-source-recovery',
            lastError: `Recovered canonical original from Tasma page ${result.pageUrl}; source image ${result.imageUrl}; checksum ${checksum}.`,
          },
        });
      }

      report.recovered.push({
        sku: product.sku,
        product: product.name,
        brand: product.brand,
        pageUrl: result.pageUrl,
        sourceImageUrl: result.imageUrl,
        identity: result.identity,
        width: result.width,
        height: result.height,
        contentType: result.contentType,
        checksum,
        originalKey,
        image2Key: null,
        image2Status: 'NOT_GENERATED_REQUIRES_VISUAL_ACCEPTANCE_BATCH',
        workshopKey: null,
        workshopStatus: 'NOT_GENERATED_REQUIRES_APPROVED_IMAGE2_TO_WORKSHOP_IMAGEGEN_PASS',
      });
      await writeFile(recoveryReportPath, `${JSON.stringify(report, null, 2)}\n`);
    }
  } finally {
    await prisma.$disconnect();
  }

  await writeFile(recoveryReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ reportPath: recoveryReportPath, mode: report.mode, recovered: report.recovered.length, unresolved: report.unresolved.length, skippedExistingOriginal: report.skippedExistingOriginal.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
