import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const appRoot = path.resolve('apps/iron-sprue');
const defaultBackground = path.join(appRoot, 'public', 'assets', 'workshop-proofs', 'iron-sprue-workshop-v1-empty.png');
const image2Dir = path.join(appRoot, 'public', 'assets', 'workshop-batch-sources');
const outputDir = path.join(appRoot, 'public', 'assets', 'workshop-batch-approved');
const slugs = process.argv.slice(2).map((slug) => slug.toLowerCase());

if (!slugs.length) {
  throw new Error('Pass one or more SKU slugs, for example is-dlm-ad48.');
}

await fs.mkdir(outputDir, { recursive: true });

async function removeWhiteBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .resize(620, 620, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const whiteness = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (whiteness > 238 && chroma < 18) {
      data[i + 3] = 0;
    } else if (whiteness > 225 && chroma < 28) {
      data[i + 3] = Math.min(data[i + 3], 90);
    }
  }

  return sharp(data, { raw: info })
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 8 })
    .png()
    .toBuffer();
}

async function makeShadow(width, height) {
  const shadowWidth = width + 84;
  const shadowHeight = Math.max(36, Math.round(height * 0.16));
  const svg = Buffer.from(`
    <svg width="${shadowWidth}" height="${shadowHeight}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${shadowWidth / 2}" cy="${shadowHeight / 2}" rx="${shadowWidth * 0.43}" ry="${shadowHeight * 0.28}" fill="rgba(0,0,0,0.42)" />
    </svg>
  `);
  return sharp(svg).blur(18).png().toBuffer();
}

const background = await sharp(defaultBackground, { failOn: 'none' })
  .resize(1600, 1000, { fit: 'cover' })
  .png()
  .toBuffer();

const results = [];
for (const slug of slugs) {
  const image2 = path.join(image2Dir, `${slug}-image2.png`);
  const product = await removeWhiteBackground(image2);
  const meta = await sharp(product).metadata();
  const width = meta.width ?? 480;
  const height = meta.height ?? 520;
  const left = Math.round((1600 - width) / 2);
  const top = Math.round(555 - height / 2);
  const shadow = await makeShadow(width, height);
  const shadowLeft = Math.round((1600 - (width + 72)) / 2);
  const shadowTop = top + height - 18;
  const outputPath = path.join(outputDir, `${slug}-workshop.png`);

  await sharp(background)
    .composite([
      { input: shadow, left: shadowLeft, top: shadowTop },
      { input: product, left, top },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  results.push({ slug, outputPath, productWidth: width, productHeight: height });
}

console.log(JSON.stringify({ generated: results }, null, 2));
