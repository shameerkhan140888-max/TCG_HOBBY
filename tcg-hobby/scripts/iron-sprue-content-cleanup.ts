import { readFileSync, writeFileSync } from 'node:fs';
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
    'Usage: node --import tsx scripts/iron-sprue-content-cleanup.ts [--apply] [--verify-applied] [--allow-production-write] [--report=path] [--from-report=path] [--only-skus=A,B]',
    '',
    'Dry-run is the default. The script reports proposed customer-facing copy cleanup for Iron Sprue products.',
    'Apply mode writes only product copy fields and refuses Railway production unless --allow-production-write is present.',
    '--from-report applies exact previously reviewed changes instead of recalculating proposals.',
  ].join('\n'));
  process.exit(0);
}

const apply = args.has('--apply');
const verifyApplied = args.has('--verify-applied');
const allowProductionWrite = args.has('--allow-production-write');
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));
const reportPath = reportArg?.slice('--report='.length) || 'tmp-iron-sprue-content-cleanup-report.json';
const fromReportArg = process.argv.find((arg) => arg.startsWith('--from-report='));
const fromReportPath = fromReportArg?.slice('--from-report='.length);
const onlySkusArg = process.argv.find((arg) => arg.startsWith('--only-skus='));
const onlySkus = new Set(
  (onlySkusArg?.slice('--only-skus='.length) ?? '')
    .split(',')
    .map((sku) => sku.trim())
    .filter(Boolean),
);

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

type ReportChange = {
  sku: string;
  title?: string;
  publicationState?: string;
  changes: Record<string, { before: unknown; after: unknown }>;
};

function loadReviewedChanges() {
  if (!fromReportPath) return null;
  const parsed = JSON.parse(readFileSync(resolve(process.cwd(), fromReportPath), 'utf8')) as { changed?: ReportChange[] };
  const changed = parsed.changed ?? [];
  return changed.filter((entry) => !onlySkus.size || onlySkus.has(entry.sku));
}

async function main() {
  const target = getIronSprueAdminDatabaseTargetInfo();
  const db = getIronSprueAdminPrisma();
  const products = await loadProducts();
  const reviewedChanges = loadReviewedChanges();
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const changed = reviewedChanges
    ? reviewedChanges.map((entry) => {
        const product = productBySku.get(entry.sku);
        if (!product) throw new Error(`Reviewed report SKU ${entry.sku} was not found in Railway products.`);
        return {
          sku: entry.sku,
          title: product.customerTitle,
          publicationState: product.publicationState,
          changes: entry.changes,
        };
      })
    : products
        .filter((product) => !onlySkus.size || onlySkus.has(product.sku))
        .map((product) => ({ sku: product.sku, title: product.customerTitle, publicationState: product.publicationState, changes: proposedChanges(product) }))
        .filter((entry) => Object.keys(entry.changes).length > 0);

  if (onlySkus.size && changed.length !== onlySkus.size && reviewedChanges) {
    const found = new Set(changed.map((entry) => entry.sku));
    const missing = [...onlySkus].filter((sku) => !found.has(sku));
    throw new Error(`Reviewed report did not contain requested SKU(s): ${missing.join(', ')}`);
  }

  const report = {
    mode: verifyApplied ? 'verify-applied' : apply ? 'apply' : 'dry-run',
    sourceReport: fromReportPath ?? null,
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

  if (verifyApplied) {
    const mismatches = [];
    for (const entry of changed) {
      const product = productBySku.get(entry.sku);
      if (!product) {
        mismatches.push({ sku: entry.sku, field: 'product', expected: 'present', actual: 'missing' });
        continue;
      }
      for (const [field, change] of Object.entries(entry.changes)) {
        const current = product[field as keyof typeof product];
        if (!jsonEqual(current, change.after)) {
          mismatches.push({ sku: entry.sku, field, expected: change.after, actual: current });
        }
      }
    }
    Object.assign(report, {
      verification: {
        checkedProducts: changed.length,
        mismatches,
        passed: mismatches.length === 0,
      },
    });
  }

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

  if (verifyApplied) {
    const verification = (report as typeof report & { verification: { passed: boolean } }).verification;
    await db.$disconnect();
    if (!verification.passed) {
      throw new Error('Applied content verification failed. See report for mismatches.');
    }
    return;
  }

  if (!apply) {
    await db.$disconnect();
    return;
  }

  if (target.label === 'RAILWAY PRODUCTION' && !allowProductionWrite) {
    await db.$disconnect();
    throw new Error('Refusing production content write without --allow-production-write.');
  }

  for (const entry of changed) {
    const product = productBySku.get(entry.sku);
    if (!product) throw new Error(`SKU ${entry.sku} was not found before update.`);
    for (const [field, change] of Object.entries(entry.changes)) {
      const current = product[field as keyof typeof product];
      if (!jsonEqual(current, change.before)) {
        throw new Error(`Current ${field} for ${entry.sku} no longer matches the reviewed dry-run value.`);
      }
    }
    await db.ironSprueAdminProduct.update({
      where: { storeCode_sku: { storeCode: 'IRON_SPRUE', sku: entry.sku } },
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
