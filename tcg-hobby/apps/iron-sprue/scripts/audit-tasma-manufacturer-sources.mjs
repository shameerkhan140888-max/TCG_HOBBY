import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const manifestPath = path.join(appRoot, 'data', 'final-launch-catalogue-manifest.json');
const recoveryPath = path.join(appRoot, 'data', 'tasma-source-recovery-report.json');
const outputPath = path.join(appRoot, 'data', `tasma-manufacturer-source-audit-${new Date().toISOString().slice(0, 10)}.json`);
const reportPath = path.join(appRoot, 'reports', `tasma-manufacturer-source-audit-${new Date().toISOString().slice(0, 10)}.md`);

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

function originalFromCache(url) {
  return String(url ?? '')
    .replace('/image/cache/catalog/', '/image/catalog/')
    .replace(/-\d+x\d+w(?=\.[a-z0-9]+(?:\?|$))/i, '');
}

function isTasmaUrl(url) {
  return /https:\/\/www\.tasmaproducts\.com\//i.test(String(url ?? ''));
}

async function inspectImage(url) {
  if (!isTasmaUrl(url)) return null;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: { 'user-agent': 'IronSprueTasmaManufacturerAudit/1.0', accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok) return { url, ok: false, status: response.status, bytes: buffer.length };
    const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
    return {
      url: response.url,
      ok: true,
      status: response.status,
      contentType: response.headers.get('content-type')?.split(';')[0]?.trim() ?? null,
      bytes: buffer.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
    };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function quality(inspected) {
  if (!inspected?.ok || !inspected.width || !inspected.height) return 'not-verified';
  const minEdge = Math.min(inspected.width, inspected.height);
  const pixels = inspected.width * inspected.height;
  if (minEdge >= 900 || pixels >= 900_000) return 'high';
  if (minEdge >= 600 || pixels >= 350_000) return 'usable';
  return 'low';
}

function row(cells) {
  return `| ${cells.join(' | ')} |`;
}

const env = parseEnvFile(await readFile(envPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const recovery = JSON.parse(await readFile(recoveryPath, 'utf8'));
const manifestProducts = manifest.products ?? manifest.items ?? manifest.catalogue ?? [];
const skus = manifestProducts.map((product) => product.sku);
const recoveredBySku = new Map((recovery.recovered ?? []).map((item) => [item.sku, item]));

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: env.IRON_SPRUE_DATABASE_URL,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
    max: 5,
  }),
});

try {
  const dbProducts = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: 'IRON_SPRUE', sku: { in: skus } },
    select: {
      sku: true,
      customerTitle: true,
      slug: true,
      brand: { select: { name: true } },
      supplier: { select: { name: true } },
      mediaAssets: {
        where: { role: 'manufacturer-original' },
        select: {
          approvalState: true,
          url: true,
          storageKey: true,
          width: true,
          height: true,
          byteSize: true,
          lastError: true,
        },
        orderBy: [{ approvalState: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  });
  const dbBySku = new Map(dbProducts.map((product) => [product.sku, product]));
  const rows = [];

  for (const manifestProduct of manifestProducts) {
    const dbProduct = dbBySku.get(manifestProduct.sku);
    const recovered = recoveredBySku.get(manifestProduct.sku);
    const candidateUrls = [];
    if (recovered?.sourceImageUrl) {
      candidateUrls.push(originalFromCache(recovered.sourceImageUrl));
      candidateUrls.push(recovered.sourceImageUrl);
    }
    for (const asset of dbProduct?.mediaAssets ?? []) {
      const sourceMatch = asset.lastError?.match(/source image (https:\/\/www\.tasmaproducts\.com\/[^;\s]+)/i)?.[1];
      if (sourceMatch) {
        candidateUrls.push(originalFromCache(sourceMatch));
        candidateUrls.push(sourceMatch);
      }
      if (isTasmaUrl(asset.url)) candidateUrls.push(originalFromCache(asset.url), asset.url);
    }
    const uniqueCandidates = [...new Set(candidateUrls.filter(Boolean))];
    const inspected = [];
    for (const url of uniqueCandidates.slice(0, 6)) inspected.push(await inspectImage(url));
    const best = inspected
      .filter(Boolean)
      .sort((left, right) => ((right.width ?? 0) * (right.height ?? 0)) - ((left.width ?? 0) * (left.height ?? 0)))[0] ?? null;
    rows.push({
      sku: manifestProduct.sku,
      title: manifestProduct.title ?? manifestProduct.name ?? dbProduct?.customerTitle ?? null,
      brand: manifestProduct.brand ?? dbProduct?.brand?.name ?? null,
      slug: manifestProduct.slug ?? dbProduct?.slug ?? null,
      pageUrl: recovered?.pageUrl ?? null,
      locatedOnTasma: Boolean(best?.ok),
      bestImage: best,
      quality: quality(best),
      dbManufacturerOriginals: (dbProduct?.mediaAssets ?? []).map((asset) => ({
        approvalState: asset.approvalState,
        width: asset.width,
        height: asset.height,
        byteSize: asset.byteSize,
        url: asset.url,
        storageKey: asset.storageKey,
        lastError: asset.lastError,
      })),
    });
  }

  const summary = {
    totalProducts: rows.length,
    locatedOnTasma: rows.filter((item) => item.locatedOnTasma).length,
    highQuality: rows.filter((item) => item.quality === 'high').length,
    usable: rows.filter((item) => item.quality === 'usable').length,
    low: rows.filter((item) => item.quality === 'low').length,
    notVerified: rows.filter((item) => item.quality === 'not-verified').length,
  };
  const result = { generatedAt: new Date().toISOString(), summary, rows };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);

  const highRows = rows.filter((item) => item.quality === 'high');
  const usableRows = rows.filter((item) => item.quality === 'usable');
  const markdown = [
    '# Tasma Products Manufacturer Source Audit',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    row(['Metric', 'Value']),
    row(['---', '---']),
    row(['81-product manifest rows audited', String(summary.totalProducts)]),
    row(['Located on tasmaproducts.com', String(summary.locatedOnTasma)]),
    row(['High-quality source images', String(summary.highQuality)]),
    row(['Usable but not high-quality source images', String(summary.usable)]),
    row(['Low-quality located images', String(summary.low)]),
    row(['Not verified / not safely located', String(summary.notVerified)]),
    '',
    'High-quality here means the verified Tasma image is at least 900px on its shortest edge, or at least 900,000 total pixels.',
    '',
    '## High-Quality Located',
    '',
    row(['SKU', 'Product', 'Brand', 'Dimensions', 'Tasma page', 'Image URL']),
    row(['---', '---', '---', '---', '---', '---']),
    ...highRows.map((item) => row([
      item.sku,
      String(item.title).replace(/\|/g, '/'),
      item.brand,
      `${item.bestImage.width}x${item.bestImage.height}`,
      item.pageUrl ?? '',
      item.bestImage.url,
    ])),
    '',
    '## Usable But Not High-Quality',
    '',
    row(['SKU', 'Product', 'Brand', 'Dimensions']),
    row(['---', '---', '---', '---']),
    ...usableRows.map((item) => row([
      item.sku,
      String(item.title).replace(/\|/g, '/'),
      item.brand,
      `${item.bestImage.width}x${item.bestImage.height}`,
    ])),
    '',
    `Full JSON: ${outputPath}`,
  ].join('\n');
  await writeFile(reportPath, `${markdown}\n`);
  console.log(JSON.stringify({ outputPath, reportPath, summary }, null, 2));
} finally {
  await prisma.$disconnect();
}
