import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const STOREFRONT_BASE_URL = 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev';
const API_BASE_URL = process.env.IRON_SPRUE_PRODUCTION_API_BASE_URL?.trim().replace(/\/+$/, '')
  || 'https://considerate-unity-production-b734.up.railway.app';

const bundles = [
  {
    slug: 'cubicfun-landmark-trio',
    title: 'CubicFun Landmark Trio',
    skus: ['IS-CUB-C108H', 'IS-CUB-C712H', 'IS-CUB-MC092H'],
  },
  {
    slug: 'cubicfun-variety-trio',
    title: 'CubicFun Variety Trio',
    skus: ['IS-CUB-C007H', 'IS-CUB-MC106H', 'IS-CUB-MC093H'],
  },
  {
    slug: 'pintoo-decorative-trio',
    title: 'Pintoo Decorative Trio',
    skus: ['IS-PIN-S1024', 'IS-PIN-S1025', 'IS-PIN-KC1005'],
  },
  {
    slug: 'pintoo-starter-variety-trio',
    title: 'Pintoo Starter Variety Trio',
    skus: ['IS-PIN-S1024', 'IS-PIN-K1001', 'IS-PIN-K1002'],
  },
  {
    slug: 'pagani-essential-build-bundle',
    title: 'Pagani Essential Build Bundle',
    skus: ['IS-AOS-05603', 'IS-TAS-TW01', 'IS-TAS-11MMHOBBYKNIFE'],
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteMediaUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${STOREFRONT_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function productForSku(sku) {
  const url = new URL('/v1/catalogue', API_BASE_URL);
  url.searchParams.set('search', sku);
  url.searchParams.set('pageSize', '10');
  const payload = await fetchJson(url);
  return payload.products?.find((product) => product.sku === sku);
}

async function imageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function labelSvg(text, width) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="42">
    <text x="${width / 2}" y="27" text-anchor="middle" fill="#111" font-family="Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(text)}</text>
  </svg>`);
}

function overlaySvg(bundle, slots) {
  const slotRects = slots.map((slot) =>
    `<rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" rx="24" fill="#f8f4ec" stroke="#d19a3d" stroke-width="4"/>`,
  ).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <defs>
      <linearGradient id="bench" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#11120f"/>
        <stop offset="0.55" stop-color="#23231f"/>
        <stop offset="1" stop-color="#0a0b09"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="28%" r="62%">
        <stop offset="0" stop-color="#d19a3d" stop-opacity="0.36"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#bench)"/>
    <rect width="1200" height="900" fill="url(#glow)"/>
    <rect x="30" y="30" width="1140" height="840" rx="38" fill="none" stroke="#d19a3d" stroke-width="4" opacity="0.8"/>
    <text x="600" y="112" text-anchor="middle" fill="#d19a3d" font-family="Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="3">BUNDLE SAVINGS</text>
    <text x="600" y="156" text-anchor="middle" fill="#fff" font-family="Arial Black, Arial, sans-serif" font-size="46" font-weight="900">${escapeXml(bundle.title)}</text>
    ${slotRects}
    <text x="411" y="392" text-anchor="middle" dominant-baseline="middle" fill="#d19a3d" font-family="Arial Black, Arial, sans-serif" font-size="76">+</text>
    <text x="789" y="392" text-anchor="middle" dominant-baseline="middle" fill="#d19a3d" font-family="Arial Black, Arial, sans-serif" font-size="76">+</text>
    <text x="600" y="760" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="26" font-weight="700">Three stocked Iron Sprue picks in one set</text>
  </svg>`);
}

async function buildComposite(bundle, components) {
  const slots = [
    { x: 72, y: 214, w: 300, h: 330 },
    { x: 450, y: 160, w: 300, h: 420 },
    { x: 828, y: 214, w: 300, h: 330 },
  ];
  const overlays = [{ input: overlaySvg(bundle, slots), top: 0, left: 0 }];

  for (let index = 0; index < components.length; index += 1) {
    const slot = slots[index];
    const image = await sharp(components[index].buffer)
      .resize({
        width: slot.w - 44,
        height: slot.h - 76,
        fit: 'contain',
        background: { r: 248, g: 244, b: 236, alpha: 1 },
      })
      .flatten({ background: { r: 248, g: 244, b: 236 } })
      .toBuffer();
    overlays.push({ input: image, left: slot.x + 22, top: slot.y + 22 });
    overlays.push({ input: labelSvg(components[index].shortName, slot.w - 28), left: slot.x + 14, top: slot.y + slot.h - 52 });
  }

  return sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .webp({ quality: 84 })
    .toBuffer();
}

const outputDir = path.join(process.cwd(), 'apps', 'iron-sprue', 'public', 'assets', 'bundles');
await fs.mkdir(outputDir, { recursive: true });

const output = [];
for (const bundle of bundles) {
  const products = await Promise.all(bundle.skus.map(productForSku));
  const missing = bundle.skus.filter((sku, index) => !products[index]);
  if (missing.length) throw new Error(`Missing public products for ${bundle.slug}: ${missing.join(', ')}`);

  const components = [];
  for (const product of products) {
    const mediaUrl = absoluteMediaUrl(product.image?.url);
    if (!mediaUrl) throw new Error(`Missing public image for ${product.sku}`);
    components.push({
      sku: product.sku,
      shortName: product.sku.replace(/^IS-/, ''),
      buffer: await imageBuffer(mediaUrl),
    });
  }

  const filename = `${bundle.slug}.webp`;
  const composite = await buildComposite(bundle, components);
  await fs.writeFile(path.join(outputDir, filename), composite);
  output.push({ slug: bundle.slug, file: `/assets/bundles/${filename}`, bytes: composite.length, skus: bundle.skus });
}

console.log(JSON.stringify({ generated: output }, null, 2));
