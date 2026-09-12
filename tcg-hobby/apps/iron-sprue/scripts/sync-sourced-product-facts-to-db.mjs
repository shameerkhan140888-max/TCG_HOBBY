import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIronSprueAdminPrisma, resetIronSprueAdminPrisma } from '../../../packages/database/src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const launchProductsPath = path.join(appRoot, 'data', 'launch-products.json');
const STORE_CODE = 'IRON_SPRUE';

const factSkus = new Set([
  'IS-PIN-S1009',
  'IS-PIN-S1024',
  'IS-PIN-S1025',
  'IS-PIN-KC1005',
  'IS-PIN-KC1007',
  'IS-PIN-KC1046',
  'IS-PIN-K1001',
  'IS-PIN-K1002',
  'IS-PIN-K1006',
  'IS-PIN-Q1037',
  'IS-PIN-Q1038',
  'IS-PIN-Q1040',
  'IS-PIN-BLUEMARBLE',
  'IS-PIN-Q1035',
  'IS-PIN-Q1061',
  'IS-CUB-C007H',
  'IS-CUB-T4008H',
  'IS-CUB-MC106H',
  'IS-CUB-C119H',
  'IS-CUB-MC133H',
  'IS-CUB-C712H',
  'IS-CUB-MC092H',
  'IS-CUB-MC093H',
  'IS-CUB-MC139H',
  'IS-CUB-C108H',
  'IS-CUB-C114H',
  'IS-CUB-C112H',
  'IS-CUB-OM3603',
  'IS-CUB-OM3606',
]);

function assertRailwayRuntime() {
  if (!process.env.RAILWAY_ENVIRONMENT_ID || !process.env.RAILWAY_PROJECT_ID) {
    throw new Error('Refusing to update product facts outside a Railway runtime. Run this with `railway run`.');
  }
}

function publicSpecifications(specifications) {
  return specifications && typeof specifications === 'object' && !Array.isArray(specifications)
    ? { ...specifications }
    : {};
}

assertRailwayRuntime();

const sourceProducts = JSON.parse(fs.readFileSync(launchProductsPath, 'utf8'))
  .filter((product) => factSkus.has(product.sku));

const prisma = getIronSprueAdminPrisma();

try {
  let updated = 0;
  let unchanged = 0;
  const missing = [];

  for (const source of sourceProducts) {
    const product = await prisma.ironSprueAdminProduct.findUnique({
      where: { storeCode_sku: { storeCode: STORE_CODE, sku: source.sku } },
      select: { id: true, sku: true, specifications: true },
    });

    if (!product) {
      missing.push(source.sku);
      continue;
    }

    const sourceSpecs = publicSpecifications(source.specifications);
    const nextSpecs = {
      ...publicSpecifications(product.specifications),
      ...(sourceSpecs.pieces ? { pieces: String(sourceSpecs.pieces) } : {}),
      ...(sourceSpecs.size ? { size: String(sourceSpecs.size) } : {}),
    };

    if (JSON.stringify(nextSpecs) === JSON.stringify(product.specifications ?? {})) {
      unchanged += 1;
      continue;
    }

    await prisma.ironSprueAdminProduct.update({
      where: { id: product.id },
      data: { specifications: nextSpecs },
    });
    updated += 1;
  }

  console.log(`Product facts synced. Updated: ${updated}. Unchanged: ${unchanged}. Missing: ${missing.length ? missing.join(', ') : 'none'}.`);
} finally {
  await prisma.$disconnect();
  resetIronSprueAdminPrisma();
}
