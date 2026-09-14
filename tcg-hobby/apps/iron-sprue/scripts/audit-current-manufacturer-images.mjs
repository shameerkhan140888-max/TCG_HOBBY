import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const reportsDir = path.join(appRoot, 'reports');
const dataDir = path.join(appRoot, 'data');
const today = new Date().toISOString().slice(0, 10);
const jsonPath = path.join(dataDir, `current-manufacturer-image-audit-${today}.json`);
const reportPath = path.join(reportsDir, `current-manufacturer-image-audit-${today}.md`);
const contactSheetPath = path.join(reportsDir, `current-manufacturer-image-contact-sheet-${today}.png`);
const STOREFRONT_BASE = process.env.IRON_SPRUE_AUDIT_STOREFRONT_BASE_URL?.trim().replace(/\/+$/, '')
  || 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev';

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

function mediaPath(asset) {
  const rawUrl = asset?.url?.trim();
  if (rawUrl?.startsWith('/media/iron-sprue/')) return rawUrl;
  if (rawUrl?.startsWith('https://media.ironsprue.co.uk/')) return `/media/iron-sprue/${rawUrl.slice('https://media.ironsprue.co.uk/'.length)}`;
  if (rawUrl?.startsWith('r2://')) return `/media/iron-sprue/${rawUrl.slice('r2://'.length).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`;
  const key = asset?.storageKey?.trim().replace(/^\/+/, '');
  if (key) return `/media/iron-sprue/${key.split('/').map(encodeURIComponent).join('/')}`;
  return rawUrl || null;
}

function storefrontUrl(asset, width = null) {
  const value = mediaPath(asset);
  if (!value) return null;
  let url = value;
  if (url.startsWith('/')) url = `${STOREFRONT_BASE}${url}`;
  try {
    const parsed = new URL(url);
    if (width) parsed.searchParams.set('w', String(width));
    return parsed.toString();
  } catch {
    return null;
  }
}

async function inspectImage(asset, width = null) {
  const url = storefrontUrl(asset, width);
  if (!url) return { ok: false, error: 'missing-url' };
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'IronSprueCurrentManufacturerImageAudit/1.0', accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok) return { ok: false, url, status: response.status, bytes: buffer.length };
    const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
    return {
      ok: true,
      url,
      status: response.status,
      contentType: response.headers.get('content-type')?.split(';')[0]?.trim() ?? null,
      bytes: buffer.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
    };
  } catch (error) {
    return { ok: false, url, error: error instanceof Error ? error.message : String(error) };
  }
}

function coverage(width, height) {
  if (!width || !height) return null;
  const frameAspect = 1 / 0.88;
  const imageAspect = width / height;
  return imageAspect >= frameAspect ? frameAspect / imageAspect : imageAspect / frameAspect;
}

function quality(asset, inspected) {
  const width = inspected?.width ?? asset.width ?? null;
  const height = inspected?.height ?? asset.height ?? null;
  const pixels = width && height ? width * height : null;
  const minEdge = width && height ? Math.min(width, height) : null;
  const fill = width && height ? coverage(width, height) : null;
  const flags = [];
  if (!inspected?.ok) flags.push('not-fetchable');
  if (!width || !height) flags.push('missing-dimensions');
  if (minEdge !== null && minEdge < 500) flags.push('very-low-resolution');
  else if (minEdge !== null && minEdge < 900) flags.push('low-resolution');
  if (pixels !== null && pixels >= 900_000) flags.push('high-resolution');
  if (fill !== null && fill < 0.55) flags.push('severe-card-letterboxing');
  else if (fill !== null && fill < 0.7) flags.push('visible-card-letterboxing');
  if (width && height && width / height < 0.55) flags.push('portrait/tall-source');
  if (width && height && width / height > 1.9) flags.push('wide-source');
  const grade = !inspected?.ok ? 'broken'
    : minEdge === null ? 'unknown'
    : minEdge < 500 ? 'poor'
    : minEdge < 900 ? 'low'
    : pixels >= 900_000 ? 'high'
    : 'usable';
  return {
    grade,
    width,
    height,
    pixels,
    cardCoverage: fill === null ? null : Number(fill.toFixed(3)),
    flags,
  };
}

function countBy(items, pick) {
  return items.reduce((counts, item) => {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
}

async function makeThumb(asset, label, size = 180) {
  const header = 50;
  const url = storefrontUrl(asset, 480);
  let image;
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'IronSprueCurrentManufacturerImageAudit/1.0' } });
    const buffer = Buffer.from(await response.arrayBuffer());
    image = await sharp(buffer, { failOn: 'none' })
      .resize({ width: size - 18, height: size - 18, fit: 'contain', background: '#ffffff' })
      .extend({ top: 9, bottom: 9, left: 9, right: 9, background: '#ffffff' })
      .png()
      .toBuffer();
  } catch {
    image = await sharp({ create: { width: size, height: size, channels: 4, background: '#f6d1d1' } }).png().toBuffer();
  }
  const safe = label.replace(/[<&>]/g, '');
  const text = Buffer.from(`
    <svg width="${size}" height="${header}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#121212"/>
      <text x="7" y="18" font-family="Arial" font-size="11" fill="#fff">${safe.slice(0, 25)}</text>
      <text x="7" y="36" font-family="Arial" font-size="10" fill="#c28a34">${safe.slice(25, 58)}</text>
    </svg>
  `);
  return await sharp({ create: { width: size, height: size + header, channels: 4, background: '#111111' } })
    .composite([{ input: image, top: 0, left: 0 }, { input: text, top: size, left: 0 }])
    .png()
    .toBuffer();
}

async function contactSheet(items) {
  const columns = 6;
  const tileWidth = 180;
  const tileHeight = 230;
  const gap = 10;
  const rows = Math.ceil(items.length / columns);
  const canvas = sharp({ create: { width: columns * tileWidth + (columns + 1) * gap, height: rows * tileHeight + (rows + 1) * gap, channels: 4, background: '#080808' } });
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    composites.push({
      input: await makeThumb(items[index].asset, items[index].label, tileWidth),
      left: gap + (index % columns) * (tileWidth + gap),
      top: gap + Math.floor(index / columns) * (tileHeight + gap),
    });
  }
  await canvas.composite(composites).png().toFile(contactSheetPath);
}

await mkdir(dataDir, { recursive: true });
await mkdir(reportsDir, { recursive: true });
const env = parseEnvFile(await readFile(envPath, 'utf8'));
const products = JSON.parse(await readFile(launchProductsPath, 'utf8'));
const skus = products.map((product) => product.sku);
const manifestBySku = new Map(products.map((product) => [product.sku, product]));
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: env.IRON_SPRUE_DATABASE_URL, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
});

try {
  const dbProducts = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: 'IRON_SPRUE', sku: { in: skus } },
    select: {
      sku: true,
      customerTitle: true,
      slug: true,
      brand: { select: { name: true } },
      mediaAssets: {
        where: { role: 'manufacturer-original' },
        select: {
          id: true,
          approvalState: true,
          isPrimary: true,
          sortOrder: true,
          url: true,
          storageKey: true,
          width: true,
          height: true,
          byteSize: true,
          mimeType: true,
          altText: true,
          lastError: true,
          updatedAt: true,
        },
        orderBy: [{ approvalState: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  });
  const dbBySku = new Map(dbProducts.map((product) => [product.sku, product]));
  const rows = [];
  const sheetItems = [];

  for (const sku of skus) {
    const manifest = manifestBySku.get(sku);
    const product = dbBySku.get(sku);
    const assets = product?.mediaAssets ?? [];
    const auditedAssets = [];
    for (const asset of assets) {
      const inspected = await inspectImage(asset, null);
      const rendered480 = await inspectImage(asset, 480);
      const assessment = quality(asset, inspected.ok ? inspected : rendered480);
      auditedAssets.push({
        id: asset.id,
        approvalState: asset.approvalState,
        isPrimary: asset.isPrimary,
        sortOrder: asset.sortOrder,
        url: mediaPath(asset),
        storageKey: asset.storageKey,
        dbWidth: asset.width,
        dbHeight: asset.height,
        dbByteSize: asset.byteSize,
        mimeType: asset.mimeType,
        altText: asset.altText,
        lastError: asset.lastError,
        inspected,
        rendered480,
        assessment,
      });
    }
    const publicApproved = auditedAssets.filter((asset) => asset.approvalState === 'APPROVED');
    const best = [...auditedAssets].sort((left, right) => {
      const approved = Number(right.approvalState === 'APPROVED') - Number(left.approvalState === 'APPROVED');
      if (approved) return approved;
      return (right.assessment.pixels ?? 0) - (left.assessment.pixels ?? 0);
    })[0] ?? null;
    if (best) sheetItems.push({ asset: assets.find((asset) => asset.id === best.id), label: `${sku} ${best.assessment.grade} ${best.assessment.width ?? '?'}x${best.assessment.height ?? '?'}` });
    rows.push({
      sku,
      title: manifest?.name ?? product?.customerTitle ?? null,
      brand: manifest?.brand ?? product?.brand?.name ?? null,
      slug: manifest?.slug ?? product?.slug ?? null,
      manufacturerImageCount: auditedAssets.length,
      approvedManufacturerImageCount: publicApproved.length,
      bestCurrentManufacturerImage: best,
      manufacturerImages: auditedAssets,
    });
  }

  await contactSheet(sheetItems);
  const summary = {
    totalProducts: rows.length,
    noManufacturerImage: rows.filter((rowItem) => rowItem.manufacturerImageCount === 0).length,
    hasManufacturerImage: rows.filter((rowItem) => rowItem.manufacturerImageCount > 0).length,
    hasApprovedManufacturerImage: rows.filter((rowItem) => rowItem.approvedManufacturerImageCount > 0).length,
    bestGradeByProduct: countBy(rows, (rowItem) => rowItem.bestCurrentManufacturerImage?.assessment.grade ?? 'missing'),
    approvalStates: countBy(rows.flatMap((rowItem) => rowItem.manufacturerImages), (asset) => asset.approvalState),
  };
  const result = {
    generatedAt: new Date().toISOString(),
    note: 'This audits only current manufacturer-original media already attached to the 81 launch products. It does not apply the newly verified Tasma source candidates.',
    verifiedTasmaSourceReminder: 'Previous verification found all 81 products have high-quality Tasma-hosted source candidates; use that as the next remediation source set after this current-state audit.',
    storefrontBase: STOREFRONT_BASE,
    summary,
    rows,
  };
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);

  const problemRows = rows
    .filter((rowItem) => rowItem.manufacturerImageCount === 0 || rowItem.bestCurrentManufacturerImage?.assessment.grade !== 'high' || rowItem.bestCurrentManufacturerImage?.assessment.flags.includes('visible-card-letterboxing') || rowItem.bestCurrentManufacturerImage?.assessment.flags.includes('severe-card-letterboxing'))
    .slice(0, 120);
  const markdown = [
    '# Current Manufacturer Image Quality Audit',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    'Scope: current `manufacturer-original` media rows attached to the 81 Iron Sprue launch products. No media was changed.',
    '',
    'Note for later: the expanded Tasma verification found high-quality Tasma-hosted candidates for all 81 products; this report is only the current-state baseline before remediation.',
    '',
    row(['Metric', 'Value']),
    row(['---', '---']),
    row(['Products audited', summary.totalProducts]),
    row(['Products with current manufacturer image', summary.hasManufacturerImage]),
    row(['Products with approved manufacturer image', summary.hasApprovedManufacturerImage]),
    row(['Products missing manufacturer image', summary.noManufacturerImage]),
    row(['Best image grade counts', JSON.stringify(summary.bestGradeByProduct)]),
    row(['Manufacturer approval states', JSON.stringify(summary.approvalStates)]),
    '',
    '## Products Needing Attention',
    '',
    row(['SKU', 'Product', 'Brand', 'Count', 'Approved', 'Best grade', 'Dimensions', 'Flags', 'State']),
    row(['---', '---', '---', '---', '---', '---', '---', '---', '---']),
    ...problemRows.map((item) => row([
      item.sku,
      item.title,
      item.brand,
      item.manufacturerImageCount,
      item.approvedManufacturerImageCount,
      item.bestCurrentManufacturerImage?.assessment.grade ?? 'missing',
      item.bestCurrentManufacturerImage ? `${item.bestCurrentManufacturerImage.assessment.width ?? '?'}x${item.bestCurrentManufacturerImage.assessment.height ?? '?'}` : 'n/a',
      item.bestCurrentManufacturerImage?.assessment.flags.join(', ') ?? 'missing',
      item.bestCurrentManufacturerImage?.approvalState ?? 'missing',
    ])),
    '',
    '## Artifacts',
    '',
    `- Full JSON: ${jsonPath}`,
    `- Contact sheet: ${contactSheetPath}`,
  ].join('\n');
  await writeFile(reportPath, `${markdown}\n`);
  console.log(JSON.stringify({ jsonPath, reportPath, contactSheetPath, summary }, null, 2));
} finally {
  await prisma.$disconnect();
}
