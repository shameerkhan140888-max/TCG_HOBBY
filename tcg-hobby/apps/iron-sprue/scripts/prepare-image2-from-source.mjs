import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'apps/iron-sprue/public/assets/workshop-remaining-sources';
const outputDir = 'apps/iron-sprue/public/assets/workshop-batch-sources';
const skus = process.argv.slice(2).map((sku) => sku.toLowerCase());

if (!skus.length) {
  throw new Error('Pass one or more SKU slugs, for example is-dlm-ac20.');
}

await fs.mkdir(outputDir, { recursive: true });

const prepared = [];
for (const sku of skus) {
  const entries = await fs.readdir(sourceDir);
  const sourceName = entries.find((file) => file.toLowerCase().startsWith(`${sku}-source.`));
  if (!sourceName) {
    prepared.push({ sku: sku.toUpperCase(), status: 'missing-source' });
    continue;
  }
  const sourcePath = path.join(sourceDir, sourceName);
  const outputPath = path.join(outputDir, `${sku}-image2.png`);
  await sharp(sourcePath, { failOn: 'none' })
    .resize(1400, 840, { fit: 'inside', withoutEnlargement: false, background: '#ffffff' })
    .extend({
      top: 76,
      bottom: 76,
      left: 93,
      right: 93,
      background: '#ffffff',
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  prepared.push({ sku: sku.toUpperCase(), status: 'prepared', source: sourcePath, output: outputPath });
}

console.log(JSON.stringify({ prepared }, null, 2));
