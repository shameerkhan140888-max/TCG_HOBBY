import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportsDir = path.join(appRoot, 'reports');
const dataDir = path.join(appRoot, 'data');

const STORE_CODE = 'IRON_SPRUE';
const API_BASE = process.env.IRON_SPRUE_AUDIT_API_BASE_URL?.trim().replace(/\/+$/, '')
  || 'https://considerate-unity-production-b734.up.railway.app';
const STOREFRONT_BASE = process.env.IRON_SPRUE_AUDIT_STOREFRONT_BASE_URL?.trim().replace(/\/+$/, '')
  || 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev';
const TODAY = new Date().toISOString().slice(0, 10);
const jsonPath = path.join(dataDir, `live-media-visual-audit-${TODAY}.json`);
const reportPath = path.join(reportsDir, `live-media-visual-audit-${TODAY}.md`);
const cardSheetPath = path.join(reportsDir, `live-card-image-contact-sheet-${TODAY}.png`);
const burjSheetPath = path.join(reportsDir, `burj-khalifa-media-contact-sheet-${TODAY}.png`);

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
  };
}

function publicMediaUrl(asset) {
  if (asset?.url?.trim().startsWith('/media/iron-sprue/') || asset?.url?.trim().startsWith('http')) {
    return asset.url.trim();
  }
  const storageKeyFromUrl = asset?.url?.trim().startsWith('r2://')
    ? asset.url.trim().slice('r2://'.length).replace(/^\/+/, '')
    : null;
  const storageKey = (storageKeyFromUrl ?? asset?.storageKey?.trim().replace(/^\/+/, '') ?? '').trim();
  if (storageKey) return `/media/iron-sprue/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
  return asset?.url?.trim() || null;
}

function storefrontUrl(value, width) {
  if (!value) return null;
  let url = value;
  if (url.startsWith('https://media.ironsprue.co.uk/')) {
    url = `/media/iron-sprue/${url.slice('https://media.ironsprue.co.uk/'.length)}`;
  }
  if (url.startsWith('/')) url = `${STOREFRONT_BASE}${url}`;
  try {
    const parsed = new URL(url);
    if (width) parsed.searchParams.set('w', String(width));
    return parsed.toString();
  } catch {
    return null;
  }
}

function isDisplayable(asset) {
  const mediaPath = ((asset?.url ?? asset?.storageKey ?? '').split('?')[0] ?? '').trim().toLowerCase();
  if (!mediaPath || /\.json$/.test(mediaPath) || /(?:^|[/_-])(?:source-required|placeholder|manifest)(?:[/_.-]|$)/.test(mediaPath)) return false;
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/.test(mediaPath)) return true;
  return asset?.mimeType?.trim().toLowerCase().startsWith('image/') ?? false;
}

function roleRank(role) {
  if (role === 'catalogue-primary') return 0;
  if (role === 'manufacturer-original') return 1;
  if (role === 'workshop-photography') return 2;
  return 99;
}

function pickPrimaryAsset(product) {
  const approved = product.mediaAssets.filter((asset) => asset.approvalState === 'APPROVED' && isDisplayable(asset));
  const canonical = approved
    .filter((asset) => asset.role === 'catalogue-primary' && asset.isPrimary)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))[0];
  if (canonical) return canonical;
  return approved
    .filter((asset) => ['catalogue-primary', 'manufacturer-original', 'workshop-photography'].includes(asset.role))
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))[0] ?? null;
}

function galleryAssets(product) {
  const selected = [];
  const primary = pickPrimaryAsset(product);
  if (primary) selected.push(primary);
  for (const role of ['workshop-photography', 'manufacturer-original']) {
    const asset = product.mediaAssets
      .filter((candidate) => candidate.role === role && candidate.approvalState === 'APPROVED' && isDisplayable(candidate))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))[0];
    if (asset && !selected.some((item) => item.id === asset.id)) selected.push(asset);
  }
  return selected.sort((a, b) => roleRank(a.role) - roleRank(b.role));
}

function cardCoverage(width, height) {
  if (!width || !height) return null;
  const frameAspect = 1 / 0.88;
  const imageAspect = width / height;
  return imageAspect >= frameAspect ? frameAspect / imageAspect : imageAspect / frameAspect;
}

function galleryCoverage(width, height) {
  if (!width || !height) return null;
  const aspect = width / height;
  return aspect >= 1 ? 1 / aspect : aspect;
}

function classifyAsset(asset) {
  const width = asset.width ?? null;
  const height = asset.height ?? null;
  const aspect = width && height ? width / height : null;
  const card = cardCoverage(width, height);
  const gallery = galleryCoverage(width, height);
  const flags = [];
  if (!width || !height) flags.push('missing-dimensions');
  if ((width && width < 900) || (height && height < 900)) flags.push('low-source-resolution');
  if (asset.byteSize && asset.byteSize > 2_500_000) flags.push('heavy-source-file');
  if (card !== null && card < 0.55) flags.push('severe-card-letterboxing');
  else if (card !== null && card < 0.7) flags.push('visible-card-letterboxing');
  if (gallery !== null && gallery < 0.45) flags.push('severe-gallery-letterboxing');
  else if (gallery !== null && gallery < 0.6) flags.push('visible-gallery-letterboxing');
  if (aspect !== null && aspect < 0.55) flags.push('portrait/tall-source');
  if (aspect !== null && aspect > 1.9) flags.push('wide-source');
  if (!isDisplayable(asset)) flags.push('not-displayable-image');
  return {
    width,
    height,
    byteSize: asset.byteSize ?? null,
    aspect: aspect ? Number(aspect.toFixed(3)) : null,
    cardCoverage: card ? Number(card.toFixed(3)) : null,
    galleryCoverage: gallery ? Number(gallery.toFixed(3)) : null,
    flags,
  };
}

function roleFromUrl(value) {
  const url = String(value ?? '').toLowerCase();
  if (url.includes('/image-2/')) return 'catalogue-primary';
  if (url.includes('/workshop/')) return 'workshop-photography';
  if (url.includes('/manufacturer-original/') || url.includes('/original/')) return 'manufacturer-original';
  return 'unknown';
}

function classifyLiveImage(image, originalInspection) {
  const source = {
    width: originalInspection?.width ?? null,
    height: originalInspection?.height ?? null,
    byteSize: originalInspection?.bytes ?? null,
    mimeType: originalInspection?.contentType ?? null,
    storageKey: image?.url ?? null,
    url: image?.url ?? null,
  };
  return classifyAsset(source);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function inspectRendered(url) {
  if (!url) return { ok: false, error: 'missing-url' };
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok) return { ok: false, status: response.status, bytes: buffer.length };
    const metadata = await sharp(buffer).metadata();
    return {
      ok: true,
      status: response.status,
      contentType: response.headers.get('content-type'),
      bytes: buffer.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function makeThumb(asset, label, size = 190) {
  const url = storefrontUrl(publicMediaUrl(asset), 480);
  const header = 44;
  const canvas = sharp({
    create: {
      width: size,
      height: size + header,
      channels: 4,
      background: '#f4eee4',
    },
  });
  let image;
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    image = await sharp(buffer)
      .resize({ width: size - 24, height: size - 24, fit: 'contain', background: '#ffffff' })
      .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' })
      .png()
      .toBuffer();
  } catch {
    image = await sharp({
      create: { width: size, height: size, channels: 4, background: '#f6d1d1' },
    }).png().toBuffer();
  }
  const safe = label.replace(/[<&>]/g, '');
  const textSvg = Buffer.from(`
    <svg width="${size}" height="${header}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#121212"/>
      <text x="8" y="18" font-family="Arial" font-size="12" fill="#ffffff">${safe.slice(0, 25)}</text>
      <text x="8" y="36" font-family="Arial" font-size="11" fill="#c28a34">${safe.slice(25, 55)}</text>
    </svg>
  `);
  return await canvas.composite([{ input: image, top: 0, left: 0 }, { input: textSvg, top: size, left: 0 }]).png().toBuffer();
}

async function contactSheet(items, outputPath, columns = 5) {
  if (!items.length) return null;
  const tileWidth = 190;
  const tileHeight = 234;
  const gap = 12;
  const rows = Math.ceil(items.length / columns);
  const width = columns * tileWidth + (columns + 1) * gap;
  const height = rows * tileHeight + (rows + 1) * gap;
  const base = sharp({
    create: { width, height, channels: 4, background: '#0d0d0d' },
  });
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const input = await makeThumb(item.asset, item.label, tileWidth);
    composites.push({
      input,
      left: gap + (index % columns) * (tileWidth + gap),
      top: gap + Math.floor(index / columns) * (tileHeight + gap),
    });
  }
  await base.composite(composites).png().toFile(outputPath);
  return outputPath;
}

function countBy(items, pick) {
  return items.reduce((counts, item) => {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function pct(value) {
  return value === null || value === undefined ? 'n/a' : `${Math.round(value * 100)}%`;
}

function bytes(value) {
  if (!value) return 'n/a';
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} MB` : `${Math.round(value / 1000)} KB`;
}

function row(cells) {
  return `| ${cells.join(' | ')} |`;
}

async function main() {
  await mkdir(reportsDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  const env = await loadEnv();
  if (!env.databaseUrl) throw new Error('IRON_SPRUE_DATABASE_URL is required for the media audit.');

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: env.databaseUrl, allowExitOnIdle: true, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 5_000, max: 5 }),
  });

  try {
    const [catalogue, products] = await Promise.all([
      fetchJson(`${API_BASE}/v1/catalogue?pageSize=100&sort=featured`),
      prisma.ironSprueAdminProduct.findMany({
        where: { storeCode: STORE_CODE, archivedAt: null },
        select: {
          id: true,
          sku: true,
          slug: true,
          customerTitle: true,
          publicationState: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          mediaAssets: {
            select: {
              id: true,
              role: true,
              url: true,
              storageKey: true,
              altText: true,
              mimeType: true,
              byteSize: true,
              width: true,
              height: true,
              approvalState: true,
              isPrimary: true,
              sortOrder: true,
              createdAt: true,
              updatedAt: true,
              approvedAt: true,
              lastError: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ sku: 'asc' }],
      }),
    ]);

    const liveProducts = catalogue.products ?? catalogue.data?.products ?? [];
    const liveBySlug = new Map(liveProducts.map((product) => [product.slug, product]));
    const dbBySku = new Map(products.map((product) => [product.sku, product]));
    const liveDetails = [];
    for (const product of liveProducts) {
      liveDetails.push(await fetchJson(`${API_BASE}/v1/catalogue/${encodeURIComponent(product.slug)}`));
    }
    const audited = [];

    for (const detail of liveDetails) {
      const live = liveBySlug.get(detail.slug) ?? detail;
      const dbProduct = dbBySku.get(detail.sku) ?? null;
      const dbPrimary = dbProduct ? pickPrimaryAsset(dbProduct) : null;
      const primaryLiveImage = detail.image ?? live.image ?? detail.images?.[0] ?? null;
      const detailImages = detail.images?.length ? detail.images : (primaryLiveImage ? [primaryLiveImage] : []);
      const liveGallery = [];
      for (const image of detailImages) {
        const original = await inspectRendered(storefrontUrl(image.url, null));
        const card = await inspectRendered(storefrontUrl(image.url, 480));
        liveGallery.push({
          id: image.id,
          role: roleFromUrl(image.url),
          url: image.url,
          altText: image.altText ?? null,
          sortOrder: image.sortOrder ?? null,
          isPrimary: Boolean(image.isPrimary),
          original,
          renderedCard: card,
          classification: classifyLiveImage(image, original.ok ? original : card),
        });
      }
      const primary = liveGallery.find((image) => image.id === primaryLiveImage?.id) ?? liveGallery.find((image) => image.isPrimary) ?? liveGallery[0] ?? null;
      const roles = (dbProduct?.mediaAssets ?? []).map((asset) => ({
        id: asset.id,
        role: asset.role,
        approvalState: asset.approvalState,
        isPrimary: asset.isPrimary,
        sortOrder: asset.sortOrder,
        storageKey: asset.storageKey,
        url: publicMediaUrl(asset),
        classification: classifyAsset(asset),
      }));
      audited.push({
        sku: detail.sku,
        slug: detail.slug,
        title: detail.name,
        brand: detail.brand ?? null,
        category: detail.category?.name ?? null,
        liveCataloguePresent: Boolean(live),
        liveCardImageUrl: live?.image?.url ?? null,
        liveCardMatchesDbPrimary: Boolean(dbPrimary && live?.image?.url && publicMediaUrl(dbPrimary) === live.image.url),
        dbRecordPresentInLocalEnv: Boolean(dbProduct),
        primary,
        gallery: liveGallery,
        media: roles,
      });
    }

    const displayed = audited;
    const allApprovedMedia = products.flatMap((product) => product.mediaAssets
      .filter((asset) => asset.approvalState === 'APPROVED' && ['catalogue-primary', 'workshop-photography', 'manufacturer-original'].includes(asset.role))
      .map((asset) => ({ product, asset, classification: classifyAsset(asset) })));
    const flaggedPrimary = displayed.filter((item) => item.primary?.classification.flags.length);
    const roleSummary = countBy(allApprovedMedia, (item) => item.asset.role);
    const approvalSummary = countBy(products.flatMap((product) => product.mediaAssets), (asset) => `${asset.role}:${asset.approvalState}`);
    const severeCard = displayed.filter((item) => item.primary?.classification.flags.includes('severe-card-letterboxing'));
    const visibleCard = displayed.filter((item) => item.primary?.classification.flags.includes('visible-card-letterboxing'));
    const lowResolution = displayed.filter((item) => item.primary?.classification.flags.includes('low-source-resolution'));
    const fallbackManufacturerCards = displayed.filter((item) => item.primary?.role === 'manufacturer-original');
    const burj = audited.find((item) => item.slug.includes('burj') || item.sku === 'IS-CUB-MC133H') ?? null;

    const cardItems = [
      ...severeCard,
      ...visibleCard.filter((item) => !severeCard.some((severe) => severe.sku === item.sku)),
      ...fallbackManufacturerCards.filter((item) => !severeCard.some((severe) => severe.sku === item.sku)),
    ].slice(0, 30).map((item) => ({
      asset: { url: item.primary?.url, storageKey: item.primary?.url, mimeType: item.primary?.original?.contentType },
      label: `${item.sku} ${item.primary?.role} ${item.primary?.classification.width}x${item.primary?.classification.height}`,
    })).filter((item) => item.asset);
    await contactSheet(cardItems, cardSheetPath, 5);
    if (burj) {
      const burjItems = burj.gallery
        .map((image) => ({ asset: { url: image.url, storageKey: image.url, mimeType: image.original?.contentType }, label: `${image.role} ${image.classification.width}x${image.classification.height}` }));
      await contactSheet(burjItems, burjSheetPath, 3);
    }

    const result = {
      generatedAt: new Date().toISOString(),
      apiBase: API_BASE,
      storefrontBase: STOREFRONT_BASE,
      counts: {
        productsInLocalAuditDb: products.length,
        liveCatalogueProducts: liveProducts.length,
        displayedProductsAudited: displayed.length,
        liveDisplayedPrimaryByRole: countBy(displayed, (item) => item.primary?.role ?? 'none'),
        liveGalleryImagesByRole: countBy(displayed.flatMap((item) => item.gallery), (image) => image.role),
        approvedMediaByRoleInLocalAuditDb: roleSummary,
        mediaApprovalStateByRole: approvalSummary,
        flaggedPrimary: flaggedPrimary.length,
        severeCardLetterboxing: severeCard.length,
        visibleCardLetterboxing: visibleCard.length,
        lowResolutionPrimary: lowResolution.length,
        manufacturerOriginalUsedAsCardPrimary: fallbackManufacturerCards.length,
      },
      products: audited,
      focus: { burjKhalifa: burj },
    };
    await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);

    const topFlags = flaggedPrimary
      .sort((a, b) => (a.primary?.classification.cardCoverage ?? 1) - (b.primary?.classification.cardCoverage ?? 1))
      .slice(0, 18);
    const burjMediaRows = burj?.gallery ?? [];
    const markdown = [
      '# Iron Sprue Live Media Visual Audit',
      '',
      `Generated: ${result.generatedAt}`,
      '',
      `Live API: ${API_BASE}`,
      `Storefront renderer checked: ${STOREFRONT_BASE}`,
      '',
      '## Scope',
      '',
      '- Live displayed product-card images from the Railway catalogue API.',
      '- Approved Image 2 / `catalogue-primary` rows.',
      '- Approved workshop photography rows.',
      '- Approved manufacturer-original rows that are eligible for gallery display or fallback.',
      '- Burj Khalifa / `IS-CUB-MC133H` called out separately because the live page shows a narrow Image 2 and a drawer-like manufacturer image.',
      '',
      '## Summary',
      '',
      row(['Metric', 'Value']),
      row(['---', '---']),
      row(['Products in local audit database', String(products.length)]),
      row(['Live catalogue products returned', String(liveProducts.length)]),
      row(['Displayed products audited', String(displayed.length)]),
      row(['Live primary Image 2 cards', String(countBy(displayed, (item) => item.primary?.role ?? 'none')['catalogue-primary'] ?? 0)]),
      row(['Live primary manufacturer-original cards', String(countBy(displayed, (item) => item.primary?.role ?? 'none')['manufacturer-original'] ?? 0)]),
      row(['Live gallery Image 2 entries', String(countBy(displayed.flatMap((item) => item.gallery), (image) => image.role)['catalogue-primary'] ?? 0)]),
      row(['Live gallery workshop entries', String(countBy(displayed.flatMap((item) => item.gallery), (image) => image.role)['workshop-photography'] ?? 0)]),
      row(['Live gallery manufacturer-original entries', String(countBy(displayed.flatMap((item) => item.gallery), (image) => image.role)['manufacturer-original'] ?? 0)]),
      row(['Primary card images with flags', String(flaggedPrimary.length)]),
      row(['Severe card letterboxing', String(severeCard.length)]),
      row(['Visible card letterboxing', String(visibleCard.length)]),
      row(['Low-resolution primary images', String(lowResolution.length)]),
      row(['Cards using manufacturer-original as primary', String(fallbackManufacturerCards.length)]),
      '',
      '## Display Rules Confirmed',
      '',
      '- Product cards use the live catalogue primary image inside a white frame with `object-fit: contain` and an aspect ratio of `1 / 0.88`.',
      '- Product detail galleries use a square white frame with `object-fit: contain`.',
      '- Tall, narrow Image 2 sources therefore render as small/narrow objects with large white space. They are not cropped into a fuller product image by the storefront.',
      '- The live catalogue should prefer an approved primary `catalogue-primary` Image 2. Approved manufacturer-original media can still appear in the gallery, and can become the card primary where the single-source fallback permits it.',
      '- The live source of truth for this report is the Railway API. The local `.env.local` database available to this task did not contain the full 59-product live published set, so database approval-state counts are shown separately and not treated as the live catalogue count.',
      '',
      '## Highest Priority Card Image Flags',
      '',
      row(['SKU', 'Product', 'Primary role', 'Dimensions', 'Card fill', 'Gallery fill', 'Flags']),
      row(['---', '---', '---', '---', '---', '---', '---']),
      ...topFlags.map((item) => row([
        item.sku,
        item.title.replace(/\|/g, '/'),
        item.primary?.role ?? 'n/a',
        `${item.primary?.classification.width ?? '?'}x${item.primary?.classification.height ?? '?'}`,
        pct(item.primary?.classification.cardCoverage),
        pct(item.primary?.classification.galleryCoverage),
        item.primary?.classification.flags.join(', ') || 'none',
      ])),
      '',
      '## Burj Khalifa Focus',
      '',
      burj ? [
        row(['Field', 'Value']),
        row(['---', '---']),
        row(['SKU', burj.sku]),
        row(['Slug', burj.slug]),
        row(['Title', burj.title.replace(/\|/g, '/')]),
        row(['Live card image role', burj.primary?.role ?? 'none']),
        row(['Live card image dimensions', `${burj.primary?.classification.width ?? '?'}x${burj.primary?.classification.height ?? '?'}`]),
        row(['Live card fill', pct(burj.primary?.classification.cardCoverage)]),
        row(['Primary flags', burj.primary?.classification.flags.join(', ') || 'none']),
        '',
        '### Burj Approved Gallery Assets',
        '',
        row(['Role', 'Dimensions', 'Card fill', 'Gallery fill', 'Storage key', 'Flags']),
        row(['---', '---', '---', '---', '---', '---']),
        ...burjMediaRows.map((asset) => row([
          asset.role,
          `${asset.classification.width ?? '?'}x${asset.classification.height ?? '?'}`,
          pct(asset.classification.cardCoverage),
          pct(asset.classification.galleryCoverage),
          asset.storageKey ?? 'n/a',
          asset.classification.flags.join(', ') || 'none',
        ])),
        '',
        'Burj diagnosis: the Image 2 row is a portrait/tall source, so the current `object-fit: contain` treatment shows the tower as a narrow object rather than filling the frame. The drawer/chest visual is present as an approved manufacturer-original gallery asset for this SKU; because manufacturer originals are included after workshop assets, it is being displayed on the product gallery even though it does not visually match Burj Khalifa.',
      ].join('\n') : 'Burj Khalifa was not found in the live product set.',
      '',
      '## Contact Sheets',
      '',
      `- Live card image flags: ${cardSheetPath}`,
      `- Burj Khalifa approved gallery assets: ${burjSheetPath}`,
      '',
      '## Audit Data',
      '',
      `Full JSON: ${jsonPath}`,
      '',
      '## Recommended Remediation Queue',
      '',
      '1. Replace or reprocess severe portrait Image 2 assets into a consistent canvas before approval/publication, especially Burj Khalifa.',
      '2. Quarantine manufacturer-original images that are packaging/source references or mismatched source media from public galleries unless explicitly approved as customer-facing.',
      '3. For Burj Khalifa, remove or reject the drawer/chest manufacturer-original row and upload the correct manufacturer source/package image.',
      '4. Add a publication/admin warning for card fill below 70% and a blocking warning below 55% for Image 2 approvals.',
    ].flat().join('\n');

    await writeFile(reportPath, `${markdown}\n`);
    console.log(JSON.stringify({
      reportPath,
      jsonPath,
      cardSheetPath,
      burjSheetPath,
      counts: result.counts,
      burj: burj ? {
        sku: burj.sku,
        primary: burj.primary,
        galleryCount: burj.gallery.length,
      } : null,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

await main();
