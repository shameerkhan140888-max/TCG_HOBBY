import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const reportsDir = path.join(appRoot, 'reports');
const dataDir = path.join(appRoot, 'data');
const today = new Date().toISOString().slice(0, 10);
const jsonPath = path.join(dataDir, `all-tasma-product-source-verification-${today}.json`);
const reportPath = path.join(reportsDir, `all-tasma-product-source-verification-${today}.md`);

const TASMA = 'https://www.tasmaproducts.com';
const USER_AGENT = 'IronSprueAllTasmaVerifier/1.0';

const CATEGORY_BY_BRAND = {
  Aoshima: ['aoshima-plastic-kits'],
  CubicFun: ['cubic-fun', 'end-of-line'],
  Pintoo: ['pintoo', 'end-of-line'],
  'Deluxe Materials': ['deluxe-materials'],
  Tasma: ['tools', 'accessories', 'end-of-line'],
  'OcCre Creations': ['occre', 'occre-creations', 'tools'],
  'Expo Tools': ['tools', 'accessories', 'end-of-line'],
};

const CATEGORY_LISTING_BY_BRAND = {
  Aoshima: ['aoshima-plastic-kits'],
  CubicFun: ['cubic-fun'],
  Pintoo: ['pintoo-jigsaws', 'pintoo'],
  'Deluxe Materials': ['deluxe-materials', 'deluxe-material-glues-fillers'],
  Tasma: ['tools', 'accessories', 'new-products'],
  'OcCre Creations': ['occre', 'occre-creations', 'tools'],
  'Expo Tools': ['tools', 'accessories'],
};

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nameTokens(value) {
  return slugify(value)
    .split('-')
    .filter((token) => token.length >= 3 && !['and', 'with', 'the', 'new', 'set', 'pcs', 'sold', 'individually'].includes(token));
}

function codeForms(product) {
  const raw = [
    product.supplierSku,
    product.manufacturerReference,
    product.specifications?.manufacturerReference,
    product.sku.replace(/^IS-[A-Z]+-/, ''),
  ].filter(Boolean);
  const forms = new Set();
  for (const value of raw) {
    const text = String(value).trim();
    forms.add(text);
    forms.add(text.toLowerCase());
    forms.add(text.replace(/-/g, ''));
    forms.add(text.toLowerCase().replace(/-/g, ''));
    forms.add(slugify(text));
  }
  return [...forms].filter((value) => value.length >= 2);
}

function pageCandidates(product) {
  const candidates = new Set();
  const categories = CATEGORY_BY_BRAND[product.brand] ?? ['end-of-line'];
  const productSlug = slugify(product.name);
  const slugTail = slugify(String(product.slug).replace(/^[^-]+-/, ''));
  for (const category of categories) {
    for (const code of codeForms(product)) {
      const lowerCode = code.toLowerCase();
      candidates.add(`${TASMA}/${category}/${lowerCode}-${productSlug}`);
      candidates.add(`${TASMA}/${category}/${lowerCode}-${slugTail}`);
      candidates.add(`${TASMA}/${category}/${lowerCode}`);
    }
  }
  for (const code of codeForms(product)) {
    candidates.add(`${TASMA}/index.php?route=product/search&search=${encodeURIComponent(code)}`);
  }
  candidates.add(`${TASMA}/index.php?route=product/search&search=${encodeURIComponent(product.name)}`);
  for (const link of product.sourceMediaLinks ?? []) {
    if (/tasmaproducts\.com/i.test(link.url)) candidates.add(link.url);
  }
  return [...candidates].slice(0, 28);
}

function absoluteUrl(raw, base) {
  try {
    return new URL(String(raw).replace(/&amp;/g, '&'), base).toString();
  } catch {
    return null;
  }
}

function fetchableUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/&/g, '%26');
    return parsed.toString();
  } catch {
    return url;
  }
}

async function fetchText(url) {
  const response = await fetch(fetchableUrl(url), {
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' },
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return { url: response.url, contentType: response.headers.get('content-type') ?? '', text: await response.text() };
}

async function fetchImage(url) {
  const response = await fetch(fetchableUrl(url), {
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: { 'user-agent': USER_AGENT, accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  return {
    url: response.url,
    contentType: response.headers.get('content-type')?.split(';')[0]?.trim() ?? null,
    bytes: buffer.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    format: metadata.format ?? null,
  };
}

function titleFromHtml(html) {
  return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim()
    ?? '';
}

function verifyPageIdentity(product, html, url) {
  const title = titleFromHtml(html);
  const haystack = `${url} ${title} ${html.slice(0, 25_000)}`.toLowerCase().replace(/&amp;/g, '&');
  const compact = haystack.replace(/[^a-z0-9]+/g, '');
  const codes = codeForms(product).map((code) => code.toLowerCase().replace(/[^a-z0-9]+/g, '')).filter((code) => code.length >= 3);
  const hasCode = codes.some((code) => compact.includes(code));
  const tokens = nameTokens(product.name);
  const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
  const brandHit = haystack.includes(String(product.brand).toLowerCase().split(/\s+/)[0]);
  const ok = hasCode || (brandHit && tokenHits >= Math.min(3, tokens.length)) || tokenHits >= Math.min(4, tokens.length);
  return { ok, hasCode, brandHit, tokenHits, title };
}

function productLinksFromSearch(html, baseUrl, product) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = absoluteUrl(match[1], baseUrl);
    if (!href || !href.startsWith(TASMA) || /route=product\/search/i.test(href)) continue;
    const text = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const haystack = `${href} ${text}`.toLowerCase();
    const hasCode = codeForms(product).some((code) => code.length >= 3 && haystack.includes(code.toLowerCase()));
    const tokenHits = nameTokens(product.name).filter((token) => haystack.includes(token)).length;
    if (hasCode || tokenHits >= Math.min(3, nameTokens(product.name).length)) links.push(href);
  }
  return [...new Set(links)].slice(0, 8);
}

function categoryListingCandidates(product) {
  const urls = new Set();
  const categories = CATEGORY_LISTING_BY_BRAND[product.brand] ?? [];
  for (const category of categories) {
    for (const sort of ['p.model', 'p.price', 'pd.name']) {
      for (const order of ['ASC', 'DESC']) {
        urls.add(`${TASMA}/${category}?limit=100&order=${order}&sort=${sort}`);
      }
    }
  }
  return [...urls];
}

function directImageCandidates(product) {
  const urls = new Set();
  const codes = codeForms(product).filter((code) => /^[a-z0-9-]+$/i.test(code));
  const imageFoldersByBrand = {
    Aoshima: ['products/Snap%20Kits', 'products/Aoshima', 'products/Aoshima/2024'],
    Pintoo: ['products/Pintoo/Vases', 'products/Pintoo/Flowerpots', 'products/Pintoo/Globes', 'products/Pintoo/Lanterns', 'products/Pintoo/Screens', 'products/Pintoo/Clocks'],
    'Deluxe Materials': ['products/Deluxe-Materials', 'products/Deluxe-Materials/20224'],
    Tasma: ['products/Tasma-Tools', 'products/Hobby-Knives'],
    CubicFun: ['products/Cubicfun'],
    'OcCre Creations': ['products/Occre/Tools'],
    'Expo Tools': ['products/Tasma-Tools'],
  };
  for (const folder of imageFoldersByBrand[product.brand] ?? []) {
    for (const code of codes) {
      for (const suffix of ['-1100x1100w.jpg', '-1100x1100h.jpg', '-1100x1100.jpg', '-1100x1100w.png', '-1100x1100h.png', '-1100x1100.png']) {
        urls.add(`${TASMA}/image/cache/catalog/${folder}/${code}${suffix}`);
        urls.add(`${TASMA}/image/cache/catalog/${folder}/${code.toUpperCase()}${suffix}`);
      }
    }
  }
  if (product.sku === 'IS-DLM-AC9') {
    urls.add(`${TASMA}/image/cache/catalog/products/Deluxe-Materials/AC9-1100x1100w.jpg`);
    urls.add(`${TASMA}/image/cache/catalog/products/Deluxe-Materials/AC9-1100x1100h.jpg`);
    urls.add(`${TASMA}/image/cache/catalog/products/Deluxe-Materials/AC09-1100x1100w.jpg`);
  }
  if (product.sku === 'IS-TAS-CARTON24SNAPKNIFE') {
    urls.add(`${TASMA}/image/cache/catalog/products/Hobby-Knives/C616-1100x1100w.jpg`);
    urls.add(`${TASMA}/image/cache/catalog/products/Hobby-Knives/C616-2-1100x1100w.jpg`);
    urls.add(`${TASMA}/image/cache/catalog/products/Hobby-Knives/Snap-Off-Hobby-Knife-1100x1100w.jpg`);
  }
  if (product.sku === 'IS-PIN-K1006') {
    urls.add(`${TASMA}/image/cache/catalog/products/Pintoo/Flowerpots/Singing-Birds-Flowers-1100x1100.jpg`);
    urls.add(`${TASMA}/image/cache/catalog/products/Pintoo/Flowerpots/K1006-1100x1100.jpg`);
  }
  if (product.sku === 'IS-PIN-BLUEMARBLE') {
    urls.add(`${TASMA}/image/cache/catalog/products/Pintoo/Globes/Blue-Marble-1100x1100.jpg`);
    urls.add(`${TASMA}/image/cache/catalog/products/Pintoo/Globes/Blue-Marble-1100x1100w.jpg`);
  }
  return [...urls];
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

function originalFromCache(url) {
  return String(url)
    .replace('/image/cache/catalog/', '/image/catalog/')
    .replace(/-\d+x\d+w(?=\.[a-z0-9]+(?:\?|$))/i, '');
}

function cacheUpgradeVariants(url) {
  const value = String(url ?? '');
  const variants = new Set([value]);
  for (const marker of ['w', 'h', '']) {
    variants.add(value.replace(/-\d+x\d+(?:w|h)?(?=\.[a-z0-9]+(?:\?|$))/i, `-1100x1100${marker}`));
  }
  return [...variants];
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
  if (/catalog|product|products|image|cache|media/i.test(url)) score += 4;
  return score;
}

function quality(image) {
  if (!image?.width || !image?.height) return 'not-verified';
  const minEdge = Math.min(image.width, image.height);
  const pixels = image.width * image.height;
  if (minEdge >= 900 || pixels >= 900_000) return 'high';
  if (minEdge >= 600 || pixels >= 350_000) return 'usable';
  return 'low';
}

async function verifyProduct(product) {
  const attempts = [];
  const queue = pageCandidates(product);
  for (const categoryUrl of categoryListingCandidates(product)) queue.push(categoryUrl);
  const seen = new Set();

  for (let index = 0; index < queue.length && index < 40; index += 1) {
    const candidateUrl = queue[index];
    if (!candidateUrl || seen.has(candidateUrl)) continue;
    seen.add(candidateUrl);
    let page;
    try {
      page = await fetchText(candidateUrl);
    } catch (error) {
      attempts.push({ url: candidateUrl, status: 'page-failed', error: error instanceof Error ? error.message : String(error) });
      continue;
    }

    if (/route=product\/search/i.test(candidateUrl) || /route=product\/search/i.test(page.url) || /route-product-category|product-category|category-/i.test(page.text)) {
      const links = productLinksFromSearch(page.text, page.url, product);
      for (const link of links) {
        if (!seen.has(link)) queue.push(link);
      }
      const listingImages = imageCandidatesFromHtml(page.text, page.url)
        .flatMap((candidate) => cacheUpgradeVariants(candidate.url).map((url) => ({ ...candidate, url, source: url === candidate.url ? candidate.source : `${candidate.source}:upgrade` })))
        .filter((candidate) => {
          const haystack = candidate.url.toLowerCase().replace(/[^a-z0-9]+/g, '');
          return codeForms(product).some((code) => {
            const clean = code.toLowerCase().replace(/[^a-z0-9]+/g, '');
            return clean.length >= 3 && haystack.includes(clean);
          }) || nameTokens(product.name).some((token) => haystack.includes(token));
        })
        .map((candidate) => ({ ...candidate, score: imageScore(product, candidate) }))
        .filter((candidate) => candidate.score >= 0)
        .sort((left, right) => right.score - left.score);
      const inspectedListingImages = [];
      for (const candidate of listingImages.slice(0, 6)) {
        try {
          const image = await fetchImage(candidate.url);
          inspectedListingImages.push({ ...candidate, ...image, quality: quality(image) });
        } catch (error) {
          attempts.push({ url: page.url, status: 'listing-image-fetch-failed', imageUrl: candidate.url, error: error instanceof Error ? error.message : String(error) });
        }
      }
      if (inspectedListingImages.length) {
        inspectedListingImages.sort((left, right) => (right.width * right.height) - (left.width * left.height) || right.score - left.score);
        attempts.push({ url: candidateUrl, finalUrl: page.url, status: 'listing-page', discoveredLinks: links.length, links, listingImages: inspectedListingImages.length });
        return {
          status: 'verified-listing-image',
          pageUrl: page.url,
          identity: { ok: true, hasCode: true, brandHit: true, tokenHits: nameTokens(product.name).length, title: titleFromHtml(page.text) },
          bestImage: inspectedListingImages[0],
          inspectedImages: inspectedListingImages.slice(0, 5),
          attempts,
        };
      }
      attempts.push({ url: candidateUrl, finalUrl: page.url, status: /route=product\/search/i.test(candidateUrl) ? 'search-page' : 'listing-page', discoveredLinks: links.length, links });
      continue;
    }

    const identity = verifyPageIdentity(product, page.text, page.url);
    if (!identity.ok) {
      attempts.push({ url: page.url, status: 'identity-mismatch', identity });
      continue;
    }

    const candidates = imageCandidatesFromHtml(page.text, page.url)
      .flatMap((candidate) => {
        const original = originalFromCache(candidate.url);
        return original === candidate.url ? [candidate] : [{ ...candidate, url: original, source: `${candidate.source}:original` }, candidate];
      })
      .map((candidate) => ({ ...candidate, score: imageScore(product, candidate) }))
      .filter((candidate) => candidate.score >= 0)
      .sort((left, right) => right.score - left.score);

    const inspected = [];
    for (const candidate of candidates.slice(0, 10)) {
      try {
        const image = await fetchImage(candidate.url);
        inspected.push({ ...candidate, ...image, quality: quality(image) });
      } catch (error) {
        attempts.push({ url: page.url, status: 'image-fetch-failed', imageUrl: candidate.url, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (!inspected.length) {
      attempts.push({ url: page.url, status: 'no-usable-image', identity });
      continue;
    }

    inspected.sort((left, right) => (right.width * right.height) - (left.width * left.height) || right.score - left.score);
    return {
      status: 'verified',
      pageUrl: page.url,
      identity,
      bestImage: inspected[0],
      inspectedImages: inspected.slice(0, 5),
      attempts,
    };
  }

  const directInspected = [];
  for (const imageUrl of directImageCandidates(product)) {
    try {
      const image = await fetchImage(imageUrl);
      directInspected.push({ url: imageUrl, source: 'direct-image-path', score: 1, ...image, quality: quality(image) });
    } catch {
      // Direct path probes are noisy by design; successful probes are recorded below.
    }
  }
  if (directInspected.length) {
    directInspected.sort((left, right) => (right.width * right.height) - (left.width * left.height));
    attempts.push({ status: 'direct-image-path', imagesFound: directInspected.length, bestImageUrl: directInspected[0].url });
    return {
      status: 'verified-image-path',
      pageUrl: null,
      identity: { ok: true, hasCode: true, brandHit: false, tokenHits: 0, title: 'Direct Tasma image path matched by product code' },
      bestImage: directInspected[0],
      inspectedImages: directInspected.slice(0, 5),
      attempts,
    };
  }

  return { status: 'unverified', attempts };
}

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
}

await mkdir(reportsDir, { recursive: true });
await mkdir(dataDir, { recursive: true });
const products = JSON.parse(await readFile(launchProductsPath, 'utf8'));
const results = [];

for (const product of products) {
  const verification = await verifyProduct(product);
  results.push({
    sku: product.sku,
    supplierSku: product.supplierSku,
    manufacturerReference: product.manufacturerReference,
    name: product.name,
    brand: product.brand,
    slug: product.slug,
    verification,
  });
  console.log(`${product.sku} ${verification.status}${verification.bestImage ? ` ${verification.bestImage.width}x${verification.bestImage.height} ${verification.bestImage.quality}` : ''}`);
  await writeFile(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
}

const summary = {
  total: results.length,
  verified: results.filter((item) => item.verification.status.startsWith('verified')).length,
  high: results.filter((item) => item.verification.bestImage?.quality === 'high').length,
  usable: results.filter((item) => item.verification.bestImage?.quality === 'usable').length,
  low: results.filter((item) => item.verification.bestImage?.quality === 'low').length,
  verifiedPage: results.filter((item) => item.verification.status === 'verified').length,
  verifiedListingImage: results.filter((item) => item.verification.status === 'verified-listing-image').length,
  verifiedImagePath: results.filter((item) => item.verification.status === 'verified-image-path').length,
  unverified: results.filter((item) => !item.verification.status.startsWith('verified')).length,
};
const highRows = results.filter((item) => item.verification.bestImage?.quality === 'high');
const usableRows = results.filter((item) => item.verification.bestImage?.quality === 'usable');
const lowRows = results.filter((item) => item.verification.bestImage?.quality === 'low');
const unverifiedRows = results.filter((item) => !item.verification.status.startsWith('verified'));

const markdown = [
  '# All Tasma Product Source Verification',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  row(['Metric', 'Value']),
  row(['---', '---']),
  row(['Products checked', summary.total]),
  row(['Verified Tasma product page + image', summary.verified]),
  row(['Verified by product page', summary.verifiedPage]),
  row(['Verified by category/listing image', summary.verifiedListingImage]),
  row(['Verified by direct Tasma image path', summary.verifiedImagePath]),
  row(['High-quality image', summary.high]),
  row(['Usable image', summary.usable]),
  row(['Low-quality image', summary.low]),
  row(['Unverified', summary.unverified]),
  '',
  'Verification requires a Tasma Products page identity match by supplier/manufacturer code or title tokens, then a Tasma-hosted product image. High quality means shortest edge >= 900px or total pixels >= 900,000.',
  '',
  '## High-Quality Verified',
  '',
  row(['SKU', 'Product', 'Brand', 'Dimensions', 'Tasma page', 'Image']),
  row(['---', '---', '---', '---', '---', '---']),
  ...highRows.map((item) => row([item.sku, item.name, item.brand, `${item.verification.bestImage.width}x${item.verification.bestImage.height}`, item.verification.pageUrl, item.verification.bestImage.url])),
  '',
  '## Usable Verified',
  '',
  row(['SKU', 'Product', 'Brand', 'Dimensions', 'Tasma page']),
  row(['---', '---', '---', '---', '---']),
  ...usableRows.map((item) => row([item.sku, item.name, item.brand, `${item.verification.bestImage.width}x${item.verification.bestImage.height}`, item.verification.pageUrl])),
  '',
  '## Low-Quality Verified',
  '',
  row(['SKU', 'Product', 'Brand', 'Dimensions', 'Tasma page']),
  row(['---', '---', '---', '---', '---']),
  ...lowRows.map((item) => row([item.sku, item.name, item.brand, `${item.verification.bestImage.width}x${item.verification.bestImage.height}`, item.verification.pageUrl])),
  '',
  '## Unverified',
  '',
  row(['SKU', 'Product', 'Brand', 'Reason']),
  row(['---', '---', '---', '---']),
  ...unverifiedRows.map((item) => row([item.sku, item.name, item.brand, item.verification.attempts.at(-1)?.status ?? 'no-match'])),
  '',
  `Full JSON: ${jsonPath}`,
].join('\n');

await writeFile(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)}\n`);
await writeFile(reportPath, `${markdown}\n`);
console.log(JSON.stringify({ jsonPath, reportPath, summary }, null, 2));
