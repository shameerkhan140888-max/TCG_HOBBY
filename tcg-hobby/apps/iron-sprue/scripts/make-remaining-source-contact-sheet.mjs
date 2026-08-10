import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = 'apps/iron-sprue/public/assets/workshop-remaining-sources';
const out = path.join(dir, 'contact-sheet.png');
const files = fs.readdirSync(dir).filter((file) => /\.(jpe?g|png|webp)$/i.test(file) && file !== 'contact-sheet.png').sort();

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const thumbs = [];
for (const file of files) {
  const label = escapeXml(file.replace('-source', '').replace(/\.(jpg|jpeg|png|webp)$/i, ''));
  const header = Buffer.from(
    `<svg width="260" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="260" height="34" fill="#111111"/><text x="8" y="22" font-size="14" font-family="Arial, sans-serif" fill="#ffffff">${label}</text></svg>`,
  );
  const resized = await sharp(path.join(dir, file), { failOn: 'none' })
    .resize(260, 190, { fit: 'inside', background: '#f6f2e8' })
    .png()
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const image = await sharp({
    create: {
      width: 280,
      height: 244,
      channels: 4,
      background: '#f6f2e8',
    },
  })
    .composite([
      { input: header, top: 0, left: 10 },
      { input: resized, top: 44, left: Math.round((280 - (meta.width ?? 260)) / 2) },
    ])
    .png()
    .toBuffer();
  thumbs.push(image);
}

const cols = 4;
const cellWidth = 280;
const cellHeight = 244;
const rows = Math.ceil(thumbs.length / cols);

await sharp({
  create: {
    width: cols * cellWidth,
    height: rows * cellHeight,
    channels: 4,
    background: '#fffaf0',
  },
})
  .composite(thumbs.map((input, index) => ({ input, left: (index % cols) * cellWidth, top: Math.floor(index / cols) * cellHeight })))
  .png()
  .toFile(out);

console.log(JSON.stringify({ files: files.length, contactSheet: out }, null, 2));
