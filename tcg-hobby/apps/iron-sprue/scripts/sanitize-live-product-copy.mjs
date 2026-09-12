import { getIronSprueAdminPrisma, resetIronSprueAdminPrisma } from '../../../packages/database/src/index.ts';

const STORE_CODE = 'IRON_SPRUE';

function assertRailwayRuntime() {
  if (!process.env.RAILWAY_ENVIRONMENT_ID || !process.env.RAILWAY_PROJECT_ID) {
    throw new Error('Refusing to sanitize product copy outside a Railway runtime/tunnel context.');
  }
}

function clean(value) {
  if (!value) return value;
  return String(value)
    .replace(/\bThe canonical scale is\s+([^.\n]+)\./gi, 'Scale: $1.')
    .replace(/\bThe canonical size is\s+([^.\n]+)\./gi, 'Size: $1.')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

assertRailwayRuntime();

const prisma = getIronSprueAdminPrisma();

try {
  const products = await prisma.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE },
    select: { id: true, sku: true, shortDescription: true, fullDescription: true, metaDescription: true },
  });

  let updated = 0;
  for (const product of products) {
    const next = {
      shortDescription: clean(product.shortDescription),
      fullDescription: clean(product.fullDescription),
      metaDescription: clean(product.metaDescription),
    };
    if (
      next.shortDescription === product.shortDescription
      && next.fullDescription === product.fullDescription
      && next.metaDescription === product.metaDescription
    ) {
      continue;
    }

    await prisma.ironSprueAdminProduct.update({
      where: { id: product.id },
      data: next,
    });
    updated += 1;
  }

  console.log(`Product copy sanitized. Updated: ${updated}.`);
} finally {
  await prisma.$disconnect();
  resetIronSprueAdminPrisma();
}
