import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = 'apps/iron-sprue/public/assets/workshop-batch-approved';
const requested = process.argv.slice(2);
const slugs = requested.length
  ? requested.map((sku) => sku.toLowerCase())
  : fs.readdirSync(dir).filter((file) => /^is-.+-workshop\.png$/i.test(file)).map((file) => file.replace(/-workshop\.png$/i, '')).sort();

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const cells = [];
for (const slug of slugs) {
  const file = path.join(dir, `${slug}-workshop.png`);
  if (!fs.existsSync(file)) continue;
  const label = Buffer.from(
    `<svg width="420" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="420" height="38" fill="#111"/><text x="12" y="25" font-size="18" font-family="Arial, sans-serif" fill="#fff">${escapeXml(slug.toUpperCase())}</text></svg>`,
  );
  const cell = await sharp(file, { failOn: 'none' })
    .resize(420, 260, { fit: 'cover' })
    .extend({ top: 38, bottom: 0, left: 0, right: 0, background: '#111' })
    .composite([{ input: label, top: 0, left: 0 }])
    .png()
    .toBuffer();
  cells.push(cell);
}

const cols = 2;
const cellWidth = 420;
const cellHeight = 298;
const rows = Math.ceil(cells.length / cols);
const out = path.join(dir, requested.length ? `qa-${requested[0].toLowerCase()}-${cells.length}-items.png` : 'qa-all-workshop-batch.png');

await sharp({
  create: {
    width: cols * cellWidth,
    height: rows * cellHeight,
    channels: 4,
    background: '#111',
  },
})
  .composite(cells.map((input, index) => ({ input, left: (index % cols) * cellWidth, top: Math.floor(index / cols) * cellHeight })))
  .png()
  .toFile(out);

console.log(JSON.stringify({ items: cells.length, qaSheet: out }, null, 2));
