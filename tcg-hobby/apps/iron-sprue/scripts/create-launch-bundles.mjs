import {
  getIronSprueAdminDatabaseTargetInfo,
  getIronSprueAdminPrisma,
  resetIronSprueAdminPrisma,
} from '../../../packages/database/src/index.ts';

const STORE_CODE = 'IRON_SPRUE';
const STRIPE_ESTIMATE_FIXED_MINOR = 20;
const STRIPE_ESTIMATE_RATE = 0.015;
const EXPECTED_FREE_DELIVERY_COST_MINOR = 399;

const shouldApply = process.argv.includes('--apply');

const bundleDefinitions = [
  {
    sku: 'IS-BUN-CUB-LANDMARK-TRIO',
    slug: 'cubicfun-landmark-trio',
    mediaUrl: '/assets/bundles/cubicfun-landmark-trio.webp',
    name: 'CubicFun Landmark Trio',
    shortDescription: 'Three architectural builds in one set, combining landmark models for a varied display collection.',
    fullDescription: 'The CubicFun Landmark Trio brings together Thomas Jefferson Memorial, Brandenburg Gate and St Peter’s Basilica as one display-focused bundle.',
    componentSkus: ['IS-CUB-C108H', 'IS-CUB-C712H', 'IS-CUB-MC092H'],
    targetPriceMinor: 3199,
    publishWhenReady: true,
  },
  {
    sku: 'IS-BUN-CUB-VARIETY-TRIO',
    slug: 'cubicfun-variety-trio',
    mediaUrl: '/assets/bundles/cubicfun-variety-trio.webp',
    name: 'CubicFun Variety Trio',
    shortDescription: 'A mixed set spanning architecture, maritime and display modelling.',
    fullDescription: 'The CubicFun Variety Trio combines Era of Navigation, Queen Anne’s Revenge and St Basil’s Cathedral for a varied 3D puzzle building selection.',
    componentSkus: ['IS-CUB-C007H', 'IS-CUB-MC106H', 'IS-CUB-MC093H'],
    targetPriceMinor: 3299,
    publishWhenReady: true,
  },
  {
    sku: 'IS-BUN-PIN-DECORATIVE-TRIO',
    slug: 'pintoo-decorative-trio',
    mediaUrl: '/assets/bundles/pintoo-decorative-trio.webp',
    name: 'Pintoo Decorative Trio',
    shortDescription: 'Three decorative Pintoo builds designed for display as well as the puzzle experience.',
    fullDescription: 'The Pintoo Decorative Trio pairs Koi Carp & Lotus, Magpies on a Plum Tree and Classic Rose Clock in one display-led puzzle bundle.',
    componentSkus: ['IS-PIN-S1024', 'IS-PIN-S1025', 'IS-PIN-KC1005'],
    targetPriceMinor: 3799,
    publishWhenReady: true,
  },
  {
    sku: 'IS-BUN-PIN-STARTER-VARIETY-TRIO',
    slug: 'pintoo-starter-variety-trio',
    mediaUrl: '/assets/bundles/pintoo-starter-variety-trio.webp',
    name: 'Pintoo Starter Variety Trio',
    shortDescription: 'A compact introduction to Pintoo display puzzles with varied finished forms.',
    fullDescription: 'The Pintoo Starter Variety Trio combines the Koi Carp & Lotus vase with two Pintoo flowerpot builds for a varied decorative puzzle set.',
    componentSkus: ['IS-PIN-S1024', 'IS-PIN-K1001', 'IS-PIN-K1002'],
    targetPriceMinor: 2899,
    publishWhenReady: true,
  },
  {
    sku: 'IS-BUN-AOS-PAGANI-ESSENTIAL-BUILD',
    slug: 'pagani-essential-build-bundle',
    mediaUrl: '/assets/bundles/pagani-essential-build-bundle.webp',
    name: 'Pagani Essential Build Bundle',
    shortDescription: 'Pagani Zonda F with two useful bench tools for a focused model-kit build.',
    fullDescription: 'The Pagani Essential Build Bundle combines the Aoshima Pagani Zonda F kit with Reverse Tweezers and an 11mm Hobby Knife.',
    componentSkus: ['IS-AOS-05603', 'IS-TAS-TW01', 'IS-TAS-11MMHOBBYKNIFE'],
    targetPriceMinor: 5199,
    publishWhenReady: true,
  },
];

function money(minor) {
  return `£${(minor / 100).toFixed(2)}`;
}

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
    throw new Error(`Refusing bundle mutation for non-Railway admin target: ${JSON.stringify(safeTarget)}`);
  }
  return safeTarget;
}

function availableStock(product) {
  return Math.max((product.inventory?.availableStock ?? 0) - (product.inventory?.reservedStock ?? 0), 0);
}

function bundleAvailability(components) {
  return components.reduce(
    (lowest, component) => Math.min(lowest, Math.floor(availableStock(component.product) / component.quantity)),
    Number.POSITIVE_INFINITY,
  );
}

function stripeEstimateMinor(totalMinor) {
  return Math.round(totalMinor * STRIPE_ESTIMATE_RATE) + STRIPE_ESTIMATE_FIXED_MINOR;
}

function profitability(bundlePriceMinor, componentCostMinor) {
  const vatExclusiveRevenueMinor = Math.round(bundlePriceMinor / 1.2);
  const stripeMinor = stripeEstimateMinor(bundlePriceMinor);
  const contributionProfitMinor = vatExclusiveRevenueMinor - componentCostMinor - stripeMinor - EXPECTED_FREE_DELIVERY_COST_MINOR;
  return {
    vatExclusiveRevenueMinor,
    componentCostMinor,
    stripeEstimateMinor: stripeMinor,
    expectedShippingCostMinor: EXPECTED_FREE_DELIVERY_COST_MINOR,
    contributionProfitMinor,
    contributionMarginPercent: Number(((contributionProfitMinor / Math.max(vatExclusiveRevenueMinor, 1)) * 100).toFixed(1)),
  };
}

function buildSpecification(definition, components, totals) {
  return {
    productType: 'Bundle',
    bundleComponents: components.map((component) => ({
      sku: component.product.sku,
      quantity: component.quantity,
      title: component.product.customerTitle,
    })),
    individualTotalMinor: totals.individualTotalMinor,
    bundleSavingMinor: totals.savingMinor,
    bundleSavingPercent: totals.savingPercent,
    componentSummary: components.map((component) => component.product.customerTitle).join('; '),
  };
}

async function ensureBrandAndCategory(db) {
  const [brand, category] = await Promise.all([
    db.ironSprueAdminBrand.upsert({
      where: { storeCode_slug: { storeCode: STORE_CODE, slug: 'iron-sprue' } },
      create: { storeCode: STORE_CODE, name: 'Iron Sprue', slug: 'iron-sprue', active: true, featured: false, sortOrder: 90 },
      update: { active: true },
    }),
    db.ironSprueAdminCategory.upsert({
      where: { storeCode_slug: { storeCode: STORE_CODE, slug: 'bundles' } },
      create: { storeCode: STORE_CODE, name: 'Bundles', slug: 'bundles', active: true, sortOrder: 90 },
      update: { active: true },
    }),
  ]);
  return { brand, category };
}

async function readBundlePlan(db) {
  const safeTarget = assertRailwayProductionTarget();
  const allComponentSkus = [...new Set(bundleDefinitions.flatMap((definition) => definition.componentSkus))];
  const products = await db.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE, archivedAt: null, sku: { in: allComponentSkus } },
    include: {
      inventory: true,
      category: true,
      brand: true,
    },
  });
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const existingBundles = await db.ironSprueAdminProduct.findMany({
    where: { storeCode: STORE_CODE, sku: { in: bundleDefinitions.map((definition) => definition.sku) } },
    select: { sku: true, publicationState: true, grossPriceMinor: true },
  });

  const bundles = bundleDefinitions.map((definition) => {
    const components = definition.componentSkus.map((sku) => ({ sku, quantity: 1, product: productBySku.get(sku) }));
    const missingComponents = components.filter((component) => !component.product).map((component) => component.sku);
    const completeComponents = components.filter((component) => component.product).map((component) => ({
      ...component,
      product: component.product,
    }));
    const individualTotalMinor = completeComponents.reduce((sum, component) => sum + (component.product.grossPriceMinor ?? 0) * component.quantity, 0);
    const componentCostMinor = completeComponents.reduce((sum, component) => sum + (component.product.landedCostMinor ?? component.product.supplierUnitCostMinor ?? 0) * component.quantity, 0);
    const savingMinor = individualTotalMinor - definition.targetPriceMinor;
    const savingPercent = Number(((savingMinor / Math.max(individualTotalMinor, 1)) * 100).toFixed(1));
    const availability = missingComponents.length ? 0 : bundleAvailability(completeComponents);
    const unpublishedComponents = completeComponents
      .filter((component) => component.product.publicationState !== 'PUBLISHED')
      .map((component) => `${component.product.sku} (${component.product.publicationState})`);
    const blockers = [
      ...missingComponents.map((sku) => `Missing component ${sku}`),
      ...unpublishedComponents.map((value) => `Component not published: ${value}`),
      ...(availability > 0 ? [] : ['No complete bundle stock available']),
      ...(savingMinor > 0 ? [] : ['Bundle price does not create a customer saving']),
    ];
    const publicationState = definition.publishWhenReady && blockers.length === 0 ? 'PUBLISHED' : 'DRAFT';
    return {
      definition,
      components: completeComponents,
      blockers,
      publicationState,
      availability: Number.isFinite(availability) ? availability : 0,
      totals: {
        individualTotalMinor,
        bundlePriceMinor: definition.targetPriceMinor,
        savingMinor,
        savingPercent,
        ...profitability(definition.targetPriceMinor, componentCostMinor),
      },
      existing: existingBundles.find((bundle) => bundle.sku === definition.sku) ?? null,
    };
  });

  return { safeTarget, bundles };
}

async function applyBundlePlan(db, plan) {
  const { brand, category } = await ensureBrandAndCategory(db);
  for (const bundle of plan.bundles) {
    const data = {
      storeCode: STORE_CODE,
      sourceTitle: bundle.definition.name,
      customerTitle: bundle.definition.name,
      slug: bundle.definition.slug,
      sku: bundle.definition.sku,
      brandId: brand.id,
      categoryId: category.id,
      shortDescription: bundle.definition.shortDescription,
      fullDescription: bundle.definition.fullDescription,
      featureBullets: bundle.components.map((component) => component.product.customerTitle),
      specifications: buildSpecification(bundle.definition, bundle.components, bundle.totals),
      buildType: 'Bundle',
      tags: ['bundle', 'offer'],
      searchKeywords: [
        'bundle',
        'offer',
        'saving',
        ...bundle.components.flatMap((component) => [
          component.product.sku,
          component.product.customerTitle,
          component.product.brand?.name ?? '',
          component.product.category?.name ?? '',
        ]),
      ].filter(Boolean),
      seoTitle: `${bundle.definition.name} | Iron Sprue`,
      metaDescription: bundle.definition.shortDescription,
      grossPriceMinor: bundle.totals.bundlePriceMinor,
      compareAtPriceMinor: bundle.totals.individualTotalMinor,
      supplierUnitCostMinor: bundle.totals.componentCostMinor,
      landedCostMinor: bundle.totals.componentCostMinor,
      vatRate: 20,
      currency: 'GBP',
      publicationState: bundle.publicationState,
      specialOffer: true,
      hideWhenOutOfStock: true,
      publishedAt: bundle.publicationState === 'PUBLISHED' ? new Date() : null,
      readyApprovedAt: bundle.publicationState === 'PUBLISHED' ? new Date() : null,
    };
    const product = await db.ironSprueAdminProduct.upsert({
      where: { storeCode_sku: { storeCode: STORE_CODE, sku: bundle.definition.sku } },
      create: data,
      update: data,
    });
    await db.ironSprueAdminInventory.upsert({
      where: { productId: product.id },
      create: {
        storeCode: STORE_CODE,
        productId: product.id,
        availableStock: bundle.availability,
        reservedStock: 0,
      },
      update: {
        availableStock: bundle.availability,
        reservedStock: 0,
      },
    });
    const existingMedia = await db.ironSprueAdminMediaAsset.findFirst({
      where: {
        storeCode: STORE_CODE,
        productId: product.id,
        role: 'catalogue-primary',
      },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const mediaData = {
      productId: product.id,
      role: 'catalogue-primary',
      url: bundle.definition.mediaUrl,
      storageKey: null,
      altText: `${bundle.definition.name} bundle image`,
      mimeType: 'image/webp',
      approvalState: 'APPROVED',
      isPrimary: true,
      sortOrder: 0,
      approvedAt: new Date(),
    };
    if (existingMedia) {
      await db.ironSprueAdminMediaAsset.update({
        where: { id: existingMedia.id },
        data: mediaData,
      });
    } else {
      await db.ironSprueAdminMediaAsset.create({
        data: {
          storeCode: STORE_CODE,
          ...mediaData,
        },
      });
    }
    await db.ironSprueAdminContentReview.deleteMany({
      where: { storeCode: STORE_CODE, productId: product.id },
    });
  }
}

const db = getIronSprueAdminPrisma();
try {
  const plan = await readBundlePlan(db);
  if (shouldApply) {
    await applyBundlePlan(db, plan);
  }
  const output = {
    mode: shouldApply ? 'apply' : 'dry-run',
    target: plan.safeTarget,
    bundles: plan.bundles.map((bundle) => ({
      sku: bundle.definition.sku,
      name: bundle.definition.name,
      status: bundle.publicationState,
      blockers: bundle.blockers,
      components: bundle.components.map((component) => ({
        sku: component.product.sku,
        name: component.product.customerTitle,
        price: money(component.product.grossPriceMinor ?? 0),
        cost: money(component.product.landedCostMinor ?? component.product.supplierUnitCostMinor ?? 0),
        stock: availableStock(component.product),
        publicationState: component.product.publicationState,
      })),
      availability: bundle.availability,
      individualTotal: money(bundle.totals.individualTotalMinor),
      bundlePrice: money(bundle.totals.bundlePriceMinor),
      saving: `${money(bundle.totals.savingMinor)} / ${bundle.totals.savingPercent}%`,
      vatExclusiveRevenue: money(bundle.totals.vatExclusiveRevenueMinor),
      componentCost: money(bundle.totals.componentCostMinor),
      stripeEstimate: money(bundle.totals.stripeEstimateMinor),
      expectedShippingCost: money(bundle.totals.expectedShippingCostMinor),
      contributionProfit: money(bundle.totals.contributionProfitMinor),
      contributionMargin: `${bundle.totals.contributionMarginPercent}%`,
      existingBeforeRun: bundle.existing,
    })),
    notes: [
      'Stripe is a planning estimate only: 1.5% + 20p, because the application does not expose a canonical Stripe-fee calculator.',
      'Expected shipping cost is modelled at the current standard delivery charge where bundle price qualifies for free standard delivery.',
      'Canonical full-resolution media and R2 derivatives are untouched.',
    ],
  };
  console.log(JSON.stringify(output, null, 2));
} finally {
  await resetIronSprueAdminPrisma();
}
