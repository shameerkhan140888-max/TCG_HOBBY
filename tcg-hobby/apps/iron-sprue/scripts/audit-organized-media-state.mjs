import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const envPath = path.join(appRoot, '.env.local');
const reportsDir = path.join(appRoot, 'reports');
const dataDir = path.join(appRoot, 'data');
const STORE_CODE = 'IRON_SPRUE';
const RUN_ID = '2026-09-14';

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

function row(cells) {
  return `| ${cells.map((cell) => String(cell ?? '').replace(/\|/g, '/')).join(' | ')} |`;
}

const env = parseEnvFile(await readFile(envPath, 'utf8'));
if (!env.IRON_SPRUE_DATABASE_URL) throw new Error('IRON_SPRUE_DATABASE_URL is required.');

await mkdir(reportsDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

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
  const products = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE },
    include: { brand: true, mediaAssets: true },
    orderBy: { sku: 'asc' },
  });

  const launchSkus = new Set(JSON.parse(await readFile(path.join(appRoot, 'data', 'launch-products.json'), 'utf8')).map((item) => item.sku));
  const launchProducts = products.filter((product) => launchSkus.has(product.sku));
  const allAssets = launchProducts.flatMap((product) => product.mediaAssets.map((asset) => ({ product, asset })));
  const organized = allAssets.filter(({ asset }) => String(asset.storageKey ?? '').includes(`/organized-${RUN_ID}/`));
  const archived = allAssets.filter(({ asset }) => String(asset.storageKey ?? '').includes(`/replaced-${RUN_ID}/`));
  const badImage2 = organized.filter(({ asset }) => asset.role === 'catalogue-primary' && String(asset.storageKey ?? '').includes('tasma-image-2-fix'));
  const approvedBadImage2 = badImage2.filter(({ asset }) => asset.approvalState === 'APPROVED');
  const generatedImage2 = organized.filter(({ asset }) => asset.role === 'catalogue-primary' && String(asset.storageKey ?? '').includes('generated-image-2-replacement'));

  const byRole = (items) => items.reduce((counts, { asset }) => {
    counts[asset.role] = (counts[asset.role] ?? 0) + 1;
    return counts;
  }, {});

  const result = {
    generatedAt: new Date().toISOString(),
    runId: RUN_ID,
    launchProducts: launchProducts.length,
    organizedRows: organized.length,
    organizedByRole: byRole(organized),
    archivedRows: archived.length,
    archivedByRole: byRole(archived),
    badManufacturerDerivedImage2Rows: badImage2.map(({ product, asset }) => ({
      sku: product.sku,
      product: product.customerTitle,
      id: asset.id,
      storageKey: asset.storageKey,
      approvalState: asset.approvalState,
      isPrimary: asset.isPrimary,
      sortOrder: asset.sortOrder,
    })),
    approvedBadManufacturerDerivedImage2Rows: approvedBadImage2.map(({ product, asset }) => ({
      sku: product.sku,
      product: product.customerTitle,
      id: asset.id,
      storageKey: asset.storageKey,
      approvalState: asset.approvalState,
      isPrimary: asset.isPrimary,
      sortOrder: asset.sortOrder,
    })),
    generatedReplacementImage2Rows: generatedImage2.map(({ product, asset }) => ({
      sku: product.sku,
      product: product.customerTitle,
      id: asset.id,
      storageKey: asset.storageKey,
      approvalState: asset.approvalState,
      isPrimary: asset.isPrimary,
      sortOrder: asset.sortOrder,
    })),
  };

  const jsonPath = path.join(dataDir, `organized-product-media-state-${RUN_ID}.json`);
  const mdPath = path.join(reportsDir, `organized-product-media-state-${RUN_ID}.md`);
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  const markdown = [
    '# Organized Product Media State',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    row(['Metric', 'Value']),
    row(['---', '---']),
    row(['Launch products', result.launchProducts]),
    row(['Organized rows', result.organizedRows]),
    row(['Archived rows', result.archivedRows]),
    row(['Bad manufacturer-derived Image 2 rows', result.badManufacturerDerivedImage2Rows.length]),
    row(['Approved/displayable bad Image 2 rows', result.approvedBadManufacturerDerivedImage2Rows.length]),
    row(['Generated replacement Image 2 rows', result.generatedReplacementImage2Rows.length]),
    '',
    '## Bad Manufacturer-Derived Image 2 Rows',
    '',
    row(['SKU', 'Product', 'State', 'Primary', 'Storage key']),
    row(['---', '---', '---', '---', '---']),
    ...result.badManufacturerDerivedImage2Rows.map((item) => row([item.sku, item.product, item.approvalState, item.isPrimary, item.storageKey])),
    '',
    `Full JSON: ${jsonPath}`,
  ].join('\n');
  await writeFile(mdPath, `${markdown}\n`);
  console.log(JSON.stringify({ jsonPath, mdPath, summary: {
    organizedRows: result.organizedRows,
    organizedByRole: result.organizedByRole,
    archivedRows: result.archivedRows,
    archivedByRole: result.archivedByRole,
    badManufacturerDerivedImage2Rows: result.badManufacturerDerivedImage2Rows.length,
    approvedBadManufacturerDerivedImage2Rows: result.approvedBadManufacturerDerivedImage2Rows.length,
    generatedReplacementImage2Rows: result.generatedReplacementImage2Rows.length,
  } }, null, 2));
} finally {
  await prisma.$disconnect();
}
