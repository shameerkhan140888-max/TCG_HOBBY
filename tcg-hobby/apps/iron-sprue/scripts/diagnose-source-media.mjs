import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const manifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const reportPath = path.join(appRoot, 'data', 'missing-source-media-report.json');
const BUCKET = 'iron-sprue-product-media';

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
    endpoint: process.env.IRON_SPRUE_R2_ENDPOINT?.trim() || fileEnv.IRON_SPRUE_R2_ENDPOINT?.trim(),
    accessKeyId: process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() || fileEnv.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim() || fileEnv.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() || fileEnv.IRON_SPRUE_R2_BUCKET_NAME?.trim(),
  };
}

function sourceUrls(product) {
  const urls = new Set();
  if (product.benchmarkUrl?.startsWith('https://')) urls.add(product.benchmarkUrl);
  for (const item of product.sourceMediaLinks ?? []) {
    if (item.url?.startsWith('https://')) urls.add(item.url);
  }
  return [...urls];
}

function imageCandidatesFromHtml(html, baseUrl) {
  const candidates = [];
  const add = (raw, source) => {
    if (!raw) return;
    try {
      const url = new URL(raw.replace(/&amp;/g, '&'), baseUrl).toString();
      if (url.startsWith('https://') && /\.(jpe?g|png|webp)(\?|$)/i.test(url)) candidates.push({ url, source });
    } catch {
      // Ignore malformed markup candidates.
    }
  };
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'meta');
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src|data-largeimg)=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'img');
  return [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()];
}

function expectedCodeTokens(product) {
  return [product.supplierSku, product.manufacturerReference, product.sku?.replace(/^IS-[A-Z]+-/, '')]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter((value) => value.length >= 3);
}

function classifyUrl(url) {
  const host = new URL(url).hostname.toLowerCase();
  return {
    manufacturer: /aoshima|cubicfun|pintoo|deluxematerials|occre/i.test(host),
    tasma: /tasmaproducts\.com/i.test(host),
  };
}

async function listOriginalKeys(s3) {
  const keys = [];
  let ContinuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'archive/products/', ContinuationToken }));
    for (const item of page.Contents ?? []) {
      if (/^archive\/products\/[^/]+\/original\/[^/]+\.(?:jpe?g|png|webp)$/i.test(item.Key ?? '')) keys.push(item.Key);
    }
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return keys;
}

async function inspectSource(product, url) {
  const result = { url, imageDiscovered: false, retrievalAttempted: true, retrievalStatus: null, reason: null };
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'IronSprueMediaDiagnosis/1.0 (+owner-authorised catalogue preparation)' } });
    result.retrievalStatus = response.status;
    if (!response.ok) {
      result.reason = response.status === 403 || response.status === 401 ? 'REMOTE_ACCESS_BLOCKED' : 'BROKEN_SOURCE_URL';
      return result;
    }
    const html = await response.text();
    const candidates = imageCandidatesFromHtml(html, url);
    result.imageDiscovered = candidates.length > 0;
    if (!candidates.length) {
      result.reason = classifyUrl(url).tasma ? 'TASMA_PAGE_IMAGE_RETRIEVAL_FAILED' : 'SOURCE_URL_PRESENT_BUT_IMAGE_NOT_FOUND';
      return result;
    }
    const haystack = candidates.map((candidate) => candidate.url.toLowerCase().replace(/[^a-z0-9]+/g, '')).join(' ');
    const tokens = expectedCodeTokens(product);
    if (tokens.length && !tokens.some((token) => haystack.includes(token))) {
      result.reason = 'SOURCE_EXISTS_BUT_NOT_USABLE';
      return result;
    }
    result.reason = 'SOURCE_EXISTS_BUT_NOT_USABLE';
    return result;
  } catch (error) {
    result.reason = /fetch failed|ENOTFOUND|ECONN|ETIMEDOUT|timeout/i.test(String(error?.message ?? error))
      ? 'REMOTE_ACCESS_BLOCKED'
      : 'IMAGE_FORMAT_OR_DOWNLOAD_FAILURE';
    result.error = String(error?.message ?? error);
    return result;
  }
}

async function main() {
  const env = await loadEnv();
  if (env.bucket !== BUCKET) throw new Error(`IRON_SPRUE_R2_BUCKET_NAME must be ${BUCKET}.`);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const s3 = new S3Client({ region: 'auto', endpoint: env.endpoint, credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey } });
  const originalKeys = await listOriginalKeys(s3);
  const hasOriginal = (product) => originalKeys.some((key) => key.toLowerCase().startsWith(`archive/products/${product.sku.toLowerCase()}-`));
  const missing = manifest.products.filter((product) => !hasOriginal(product));
  const rows = [];

  for (const product of missing) {
    const urls = sourceUrls(product);
    const urlKinds = urls.map((url) => classifyUrl(url));
    let inspection = null;
    if (urls.length) inspection = await inspectSource(product, urls[0]);
    const reason = !urls.length ? 'NO_SOURCE_URL' : inspection?.reason ?? 'OTHER';
    rows.push({
      sku: product.sku,
      product: product.customerTitle ?? product.name,
      brand: product.brand,
      supplier: 'Tasma Products',
      sourceUrlPresent: urls.length > 0,
      manufacturerUrlPresent: urlKinds.some((item) => item.manufacturer),
      tasmaUrlPresent: urlKinds.some((item) => item.tasma),
      sourceUrls: urls,
      imageDiscovered: inspection?.imageDiscovered ?? false,
      retrievalAttempted: Boolean(inspection),
      failureReason: reason,
      explanation: inspection?.error ?? inspection?.url ?? (urls.length ? 'Source URL did not produce a usable verified product image.' : 'No product source URL was supplied in the manifest/import metadata.'),
      recommendedRecoveryAction:
        reason === 'NO_SOURCE_URL'
          ? 'Locate and verify the authorised supplier/manufacturer product page before media generation.'
          : reason === 'REMOTE_ACCESS_BLOCKED'
            ? 'Open the source manually or use an approved browser/export workflow to capture the authorised original.'
            : reason === 'TASMA_PAGE_IMAGE_RETRIEVAL_FAILED'
              ? 'Verify the Tasma page in browser and update scraper selectors or manually archive the visible image.'
              : 'Manually verify product identity and archive a usable manufacturer/supplier original.',
    });
  }

  const breakdown = rows.reduce((acc, row) => {
    acc[row.failureReason] = (acc[row.failureReason] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    productsTotal: manifest.products.length,
    productsWithUsableOriginals: manifest.products.length - rows.length,
    productsWithoutUsableOriginals: rows.length,
    breakdown,
    rows,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ reportPath, productsWithoutUsableOriginals: rows.length, breakdown }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
