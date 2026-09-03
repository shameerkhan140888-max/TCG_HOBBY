import {
  getIronSprueAdminDatabaseTargetInfo,
  getIronSprueAdminPrisma,
  resetIronSprueAdminPrisma,
} from '../../../packages/database/src/index.ts';

const STORE_CODE = 'IRON_SPRUE';
const shouldApply = process.argv.includes('--apply');

const bundleMedia = [
  ['IS-BUN-CUB-LANDMARK-TRIO', '/assets/bundles/cubicfun-landmark-trio.webp'],
  ['IS-BUN-CUB-VARIETY-TRIO', '/assets/bundles/cubicfun-variety-trio.webp'],
  ['IS-BUN-PIN-DECORATIVE-TRIO', '/assets/bundles/pintoo-decorative-trio.webp'],
  ['IS-BUN-PIN-STARTER-VARIETY-TRIO', '/assets/bundles/pintoo-starter-variety-trio.webp'],
  ['IS-BUN-AOS-PAGANI-ESSENTIAL-BUILD', '/assets/bundles/pagani-essential-build-bundle.webp'],
];

function assertRailwayProductionTarget() {
  const target = getIronSprueAdminDatabaseTargetInfo();
  const safeTarget = {
    source: target.source,
    environment: target.environment,
    label: target.label,
    host: target.host,
    port: target.port,
    database: target.database,
  };
  if (target.source !== 'IRON_SPRUE_ADMIN_DATABASE_URL' || target.label !== 'RAILWAY PRODUCTION') {
    throw new Error(`Refusing bundle media update for non-Railway admin target: ${JSON.stringify(safeTarget)}`);
  }
  return safeTarget;
}

function publicSpecificationsWithoutPublicationNote(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value ?? {};
  const { publicationNote: _publicationNote, ...rest } = value;
  return rest;
}

const db = getIronSprueAdminPrisma();

try {
  const target = assertRailwayProductionTarget();
  const rows = await db.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE, sku: { in: bundleMedia.map(([sku]) => sku) } },
    include: {
      mediaAssets: {
        where: { role: 'catalogue-primary' },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 1,
      },
    },
  });
  const bySku = new Map(rows.map((row) => [row.sku, row]));
  const plan = [];

  for (const [sku, mediaUrl] of bundleMedia) {
    const product = bySku.get(sku);
    if (!product) {
      plan.push({ sku, status: 'missing-product', mediaUrl });
      continue;
    }
    const existingMedia = product.mediaAssets[0] ?? null;
    const nextSpecifications = publicSpecificationsWithoutPublicationNote(product.specifications);
    const hadPublicationNote = Boolean(product.specifications?.publicationNote);
    plan.push({
      sku,
      productId: product.id,
      publicationState: product.publicationState,
      mediaAssetId: existingMedia?.id ?? null,
      previousMediaUrl: existingMedia?.url ?? null,
      nextMediaUrl: mediaUrl,
      hadPublicationNote,
    });

    if (!shouldApply) continue;

    await db.ironSprueAdminProduct.update({
      where: { id: product.id },
      data: { specifications: nextSpecifications },
    });

    if (existingMedia) {
      await db.ironSprueAdminMediaAsset.update({
        where: { id: existingMedia.id },
        data: {
          url: mediaUrl,
          storageKey: null,
          mimeType: 'image/webp',
          approvalState: 'APPROVED',
          isPrimary: true,
          sortOrder: 0,
          altText: `${product.customerTitle} bundle image`,
        },
      });
    } else {
      await db.ironSprueAdminMediaAsset.create({
        data: {
          storeCode: STORE_CODE,
          productId: product.id,
          role: 'catalogue-primary',
          url: mediaUrl,
          storageKey: null,
          mimeType: 'image/webp',
          approvalState: 'APPROVED',
          isPrimary: true,
          sortOrder: 0,
          altText: `${product.customerTitle} bundle image`,
          approvedAt: new Date(),
        },
      });
    }
  }

  console.log(JSON.stringify({ mode: shouldApply ? 'apply' : 'dry-run', target, plan }, null, 2));
} finally {
  await resetIronSprueAdminPrisma();
}
