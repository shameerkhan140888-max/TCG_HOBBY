import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { applyEnvFile, configureWindowsPrismaEngine, loadRootDatabaseEnv } from '../../../scripts/lib/database-env.mjs';

const rootDir = resolve(import.meta.dirname, '../../..');
const env = { ...process.env };
loadRootDatabaseEnv({ rootDir, env, logger: () => {} });
applyEnvFile(resolve(rootDir, 'apps/iron-sprue/.env.local'), env);
applyEnvFile(resolve(rootDir, 'apps/iron-sprue/.env'), env);
configureWindowsPrismaEngine({ rootDir, env });

const prisma = new PrismaClient({
  adapter: new PrismaNeonHTTP(env.IRON_SPRUE_DATABASE_URL || env.DATABASE_URL, {}),
});

function pounds(minor) {
  return minor == null ? null : Number((minor / 100).toFixed(2));
}

function exVat(grossMinor, vatRate) {
  if (grossMinor == null || vatRate == null) return null;
  return Number(((grossMinor / (1 + vatRate / 100)) / 100).toFixed(2));
}

try {
  const products = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: 'IRON_SPRUE' },
    orderBy: [{ brand: { name: 'asc' } }, { customerTitle: 'asc' }],
    include: {
      brand: true,
      category: true,
      inventory: true,
    },
  });

  const skuCounts = new Map();
  for (const product of products) {
    skuCounts.set(product.sku, (skuCounts.get(product.sku) ?? 0) + 1);
  }

  const rows = products.map((product) => {
    const sale = product.grossPriceMinor;
    const cost = product.landedCostMinor ?? product.supplierUnitCostMinor;
    const flags = [];
    if (!sale || sale <= 0) flags.push('MISSING_OR_ZERO_SALE_PRICE');
    if (product.vatRate == null) flags.push('MISSING_VAT_RATE');
    if ((skuCounts.get(product.sku) ?? 0) > 1) flags.push('DUPLICATE_SKU');
    if (sale != null && cost != null && sale < cost) flags.push('SALE_BELOW_STORED_COST');
    if (!product.inventory) flags.push('MISSING_INVENTORY_ROW');

    return {
      sku: product.sku,
      productName: product.customerTitle,
      brand: product.brand?.name ?? null,
      category: product.category?.name ?? null,
      storedCostPrice: pounds(cost),
      currentSalePriceIncVat: pounds(sale),
      vatRate: product.vatRate,
      calculatedSalePriceExVat: exVat(sale, product.vatRate),
      currentStockQuantity: product.inventory?.availableStock ?? null,
      activeListedStatus: product.publicationState,
      flags,
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    productCount: rows.length,
    anomalyCount: rows.filter((row) => row.flags.length > 0).length,
    flagCounts: rows.reduce((acc, row) => {
      for (const flag of row.flags) acc[flag] = (acc[flag] ?? 0) + 1;
      return acc;
    }, {}),
  };

  const output = {
    summary,
    rows,
  };

  const jsonPath = resolve(rootDir, 'apps/iron-sprue/reports/launch-sale-price-report.json');
  const mdPath = resolve(rootDir, 'apps/iron-sprue/reports/launch-sale-price-report.md');
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);

  const md = [
    '# Iron Sprue Launch Sale Price Report',
    '',
    `Generated: ${summary.generatedAt}`,
    `Products: ${summary.productCount}`,
    `Rows with flags: ${summary.anomalyCount}`,
    '',
    '## Flag Counts',
    '',
    ...Object.entries(summary.flagCounts).map(([flag, count]) => `- ${flag}: ${count}`),
    '',
    '## Products',
    '',
    '| SKU | Product | Brand | Category | Cost | Sale inc VAT | VAT | Sale ex VAT | Stock | Status | Flags |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...rows.map((row) => `| ${row.sku} | ${row.productName.replaceAll('|', '\\|')} | ${row.brand ?? ''} | ${row.category ?? ''} | ${row.storedCostPrice ?? ''} | ${row.currentSalePriceIncVat ?? ''} | ${row.vatRate ?? ''} | ${row.calculatedSalePriceExVat ?? ''} | ${row.currentStockQuantity ?? ''} | ${row.activeListedStatus} | ${row.flags.join(', ')} |`),
    '',
  ].join('\n');
  await writeFile(mdPath, md);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
} finally {
  await prisma.$disconnect();
}
