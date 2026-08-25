import { writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  getIronSprueAdminDatabaseTargetInfo,
  getIronSprueAdminPrisma,
  sanitizePublicProductCopy,
  sanitizePublicProductList,
} from '@tcg-hobby/database';

type ProductRow = Awaited<ReturnType<typeof loadProducts>>[number];

const args = new Set(process.argv.slice(2));
if (args.has('--help')) {
  console.log([
    'Usage: node --import tsx scripts/iron-sprue-content-cleanup.ts [--apply] [--allow-production-write] [--report=path]',
    '',
    'Dry-run is the default. The script reports proposed customer-facing copy cleanup for Iron Sprue products.',
    'Apply mode writes only product copy fields and refuses Railway production unless --allow-production-write is present.',
  ].join('\n'));
  process.exit(0);
}

const apply = args.has('--apply');
const allowProductionWrite = args.has('--allow-production-write');
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));
const reportPath = reportArg?.slice('--report='.length) || 'tmp-iron-sprue-content-cleanup-report.json';

function cleanedLongDescription(product: ProductRow) {
  const shortDescription = sanitizePublicProductCopy(product.shortDescription);
  const fullDescription = sanitizePublicProductCopy(product.fullDescription);
  if (!shortDescription) return fullDescription || null;
  if (!fullDescription) return shortDescription;
  if (fullDescription.toLowerCase().includes(shortDescription.toLowerCase())) return fullDescription;
  return `${shortDescription}\n\n${fullDescription}`;
}

function cleanText(value: string | null) {
  return sanitizePublicProductCopy(value) || null;
}

function cleanList(value: unknown) {
  return Array.isArray(value)
    ? sanitizePublicProductList(value.filter(Boolean).map(String))
    : [];
}

function jsonEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function loadProducts() {
  const db = getIronSprueAdminPrisma();
  return db.ironSprueAdminProduct.findMany({
    where: { storeCode: 'IRON_SPRUE', archivedAt: null },
    orderBy: [{ sku: 'asc' }],
    select: {
      id: true,
      sku: true,
      customerTitle: true,
      shortDescription: true,
      fullDescription: true,
      featureBullets: true,
      contents: true,
      seoTitle: true,
      metaDescription: true,
      publicationState: true,
    },
  });
}

function proposedChanges(product: ProductRow) {
  const next = {
    shortDescription: cleanText(product.shortDescription),
    fullDescription: cleanedLongDescription(product),
    featureBullets: cleanList(product.featureBullets),
    contents: cleanText(product.contents),
    seoTitle: cleanText(product.seoTitle),
    metaDescription: cleanText(product.metaDescription),
  };

  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const [field, after] of Object.entries(next)) {
    const before = product[field as keyof typeof next];
    if (!jsonEqual(before, after)) changes[field] = { before, after };
  }
  return changes;
}

async function main() {
  const target = getIronSprueAdminDatabaseTargetInfo();
  const db = getIronSprueAdminPrisma();
  const products = await loadProducts();
  const changed = products
    .map((product) => ({ sku: product.sku, title: product.customerTitle, publicationState: product.publicationState, changes: proposedChanges(product) }))
    .filter((entry) => Object.keys(entry.changes).length > 0);

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    target: {
      source: target.source,
      label: target.label,
      host: target.host,
      port: target.port,
      database: target.database,
    },
    scannedProducts: products.length,
    changedProducts: changed.length,
    changed,
  };

  const absoluteReportPath = resolve(process.cwd(), reportPath);
  await mkdir(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({
    mode: report.mode,
    target: report.target,
    scannedProducts: report.scannedProducts,
    changedProducts: report.changedProducts,
    reportPath: absoluteReportPath,
  }, null, 2));

  if (!apply) {
    await db.$disconnect();
    return;
  }

  if (target.label === 'RAILWAY PRODUCTION' && !allowProductionWrite) {
    await db.$disconnect();
    throw new Error('Refusing production content write without --allow-production-write.');
  }

  for (const entry of changed) {
    await db.ironSprueAdminProduct.update({
      where: { sku: entry.sku },
      data: Object.fromEntries(Object.entries(entry.changes).map(([field, change]) => [field, change.after])),
    });
  }

  await db.$disconnect();
  console.log(JSON.stringify({ appliedProducts: changed.length }, null, 2));
}

main().catch(async (error) => {
  try {
    await getIronSprueAdminPrisma().$disconnect();
  } catch {
    // Ignore disconnect failures while reporting the primary error.
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
