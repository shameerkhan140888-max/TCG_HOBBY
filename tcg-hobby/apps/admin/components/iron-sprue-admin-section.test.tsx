import React from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);

const mocks = vi.hoisted(() => ({
  getIronSprueAdminDashboard: vi.fn(),
  getIronSprueAdminReferenceData: vi.fn(),
  getIronSprueAdminStorefrontControls: vi.fn(),
  getIronSprueAdminWorkspaceCards: vi.fn(),
  listIronSprueAdminContentReviews: vi.fn(),
  listIronSprueAdminMediaAssets: vi.fn(),
  listIronSprueAdminProducts: vi.fn(),
  listIronSprueR2Objects: vi.fn(),
}));

vi.mock('@capital-hobby/database', () => ({
  getIronSprueAdminDashboard: mocks.getIronSprueAdminDashboard,
  getIronSprueAdminReferenceData: mocks.getIronSprueAdminReferenceData,
  getIronSprueAdminStorefrontControls: mocks.getIronSprueAdminStorefrontControls,
  getIronSprueAdminWorkspaceCards: mocks.getIronSprueAdminWorkspaceCards,
  IRON_SPRUE_HERO_MERCHANDISING_BADGES: ['NONE', 'IN_STOCK', 'NEW', 'SALE', 'COMING_SOON', 'PRE_ORDER', 'FEATURED', 'EXCLUSIVE'],
  IRON_SPRUE_TYPOGRAPHY_OPTIONS: {
    headingFamily: ['IMPACT_CONDENSED', 'SYSTEM_SANS', 'SERIF_DISPLAY'],
    bodyFamily: ['SYSTEM_SANS', 'HUMANIST_SANS', 'SERIF'],
    headingWeight: ['BOLD', 'BLACK'],
    bodyWeight: ['REGULAR', 'MEDIUM'],
    headingScale: ['COMPACT', 'STANDARD', 'LARGE'],
    bodyScale: ['COMPACT', 'STANDARD', 'COMFORTABLE'],
  },
  isIronSprueStorefrontContentReviewField: (fieldName: string) => [
    'customerTitle',
    'shortDescription',
    'fullDescription',
    'featureBullets',
    'specifications',
    'seoTitle',
    'metaDescription',
    'category',
    'brand',
    'buildType',
    'productType',
  ].includes(fieldName),
  isIronSprueDisplayableImageAsset: (asset: { mimeType?: string | null; url?: string | null; storageKey?: string | null }) => {
    const path = (asset.url ?? asset.storageKey ?? '').split('?')[0] ?? '';
    if (/\.json$/i.test(path) || /(?:^|[/_-])(?:source-required|placeholder|manifest)(?:[/_.-]|$)/i.test(path)) return false;
    if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(path)) return true;
    return Boolean(asset.mimeType?.startsWith('image/'));
  },
  isIronSprueOperationalMediaRole: (role: string | null | undefined) => [
    'catalogue-primary',
    'workshop-photography',
    'manufacturer-original',
  ].includes(String(role ?? '').trim().toLowerCase().replace(/_/g, '-')),
  sanitizePublicProductCopy: (value: string | null | undefined) => String(value ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => paragraph
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !/catalogue currently confirms|unsupported claims|launch catalogue|supplier reference|source data|source material|launch range/i.test(sentence))
      .join(' '))
    .filter(Boolean)
    .join('\n\n'),
  sanitizePublicProductList: (values: string[] | null | undefined) => (values ?? [])
    .filter((value) => !/supplier code|launch stock record|source data/i.test(value)),
  listIronSprueAdminContentReviews: mocks.listIronSprueAdminContentReviews,
  listIronSprueAdminInventory: vi.fn(),
  listIronSprueAdminMediaAssets: mocks.listIronSprueAdminMediaAssets,
  listIronSprueAdminProducts: mocks.listIronSprueAdminProducts,
}));

vi.mock('../lib/iron-sprue-media-storage.server', () => ({
  ironSprueAdminPreviewUrl: (value: string | null, fallbackKey?: string | null) =>
    fallbackKey ? `/iron-sprue-admin/media/preview?key=${encodeURIComponent(fallbackKey)}` : value,
  listIronSprueR2Objects: mocks.listIronSprueR2Objects,
}));

vi.mock('../lib/iron-sprue-admin-actions.server', () => ({
  attachIronSprueExistingR2MediaAction: vi.fn(),
  bulkApproveIronSprueContentReviewsAction: vi.fn(),
  bulkApproveIronSprueMediaAction: vi.fn(),
  bulkPublishIronSprueProductsAction: vi.fn(),
  publishIronSprueProductAction: vi.fn(),
  promoteIronSprueMediaToCataloguePrimaryAction: vi.fn(),
  reconcileIronSprueExistingR2MediaAction: vi.fn(),
  saveIronSprueFeaturedProductPlacementAction: vi.fn(),
  saveIronSprueHeroAction: vi.fn(),
  saveIronSprueHomepagePlacementAction: vi.fn(),
  saveIronSprueHomepageProductSectionAction: vi.fn(),
  saveIronSprueSpecialOfferAction: vi.fn(),
  saveIronSprueTypographySettingsAction: vi.fn(),
  updateIronSprueBrandControlsAction: vi.fn(),
  updateIronSprueContentReviewAction: vi.fn(),
  updateIronSprueMediaApprovalAction: vi.fn(),
  updateIronSprueProductFlagsAction: vi.fn(),
  updateIronSpruePublicationStateAction: vi.fn(),
  uploadIronSprueProductMediaAction: vi.fn(),
}));

import { IronSprueAdminSection } from './iron-sprue-admin-section';

async function renderAsync(element: React.ReactElement) {
  return new Promise<string>((resolve, reject) => {
    const stream = new PassThrough();
    let markup = '';
    stream.on('data', (chunk) => {
      markup += chunk.toString();
    });
    stream.on('end', () => resolve(markup));
    stream.on('error', reject);
    const renderer = renderToPipeableStream(element, {
      onAllReady() {
        renderer.pipe(stream);
      },
      onError(error) {
        reject(error);
      },
    });
  });
}

const cards = [
  { key: 'media', label: 'Media', href: '/iron-sprue-admin/media', status: 'empty', requiredPermission: 'media:approve', description: 'Image 2, original, workshop and hero media review.' },
  { key: 'homepage', label: 'Storefront', href: '/iron-sprue-admin/homepage', status: 'empty', requiredPermission: 'homepage:manage', description: 'Homepage placements, category order and brand carousel controls.' },
  { key: 'heroes', label: 'Heroes', href: '/iron-sprue-admin/heroes', status: 'empty', requiredPermission: 'heroes:manage', description: 'Hero carousel artwork, CTA route and display ordering.' },
  { key: 'settings', label: 'Settings', href: '/iron-sprue-admin/settings', status: 'ready', requiredPermission: 'roles:manage', description: 'Environment and operational readiness.' },
] as const;

describe('IronSprueAdminSection operational controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.listIronSprueAdminProducts.mockResolvedValue({ products: [] });
    mocks.getIronSprueAdminDashboard.mockResolvedValue({
      storeCode: 'IRON_SPRUE',
      environment: 'railway-production',
      databaseTarget: {
        label: 'RAILWAY PRODUCTION',
        source: 'IRON_SPRUE_ADMIN_DATABASE_URL',
        host: 'railway.internal',
        database: 'railway',
      },
      databaseStatus: 'connected',
      r2Status: 'configured',
      workerReadStatus: 'configured',
      warnings: [],
      metrics: [],
      workspace: cards,
    });
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({ brands: [], categories: [], suppliers: [] });
    mocks.getIronSprueAdminStorefrontControls.mockResolvedValue({
      homepagePlacements: [],
      heroes: [],
      specialOffers: [],
      discountCodes: [],
      typographySettings: {
        id: null,
        storeCode: 'IRON_SPRUE',
        headingFamily: 'IMPACT_CONDENSED',
        bodyFamily: 'SYSTEM_SANS',
        headingWeight: 'BLACK',
        bodyWeight: 'REGULAR',
        headingScale: 'STANDARD',
        bodyScale: 'STANDARD',
        createdAt: null,
        updatedAt: null,
      },
      auditLog: [],
    });
    mocks.listIronSprueR2Objects.mockResolvedValue([]);
  });

  it('shows the explicit Iron Sprue admin database target in settings', async () => {
    const markup = await renderAsync(await IronSprueAdminSection({ section: 'settings' }));

    expect(markup).toContain('Admin database target');
    expect(markup).toContain('RAILWAY PRODUCTION');
    expect(markup).toContain('IRON_SPRUE_ADMIN_DATABASE_URL');
    expect(markup).toContain('railway.internal');
    expect(markup).toContain('railway');
  });

  it('shows only approval-required canonical media in the pending queue', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.listIronSprueAdminMediaAssets.mockResolvedValue([
      {
        id: 'media-1',
        productId: 'product-1',
        product: { id: 'product-1', sku: 'IS-AOS-05603', customerTitle: 'Pagani Zonda F', publicationState: 'MEDIA_PENDING' },
        role: 'catalogue-primary',
        approvalState: 'REVIEW_REQUIRED',
        isPrimary: false,
        storageKey: 'products/is-aos-05603/image-2/master.webp',
        url: null,
        altText: 'Pagani Zonda F',
        width: 1200,
        height: 1200,
        mimeType: 'image/webp',
        byteSize: 1,
        uploadedById: null,
        approvedById: null,
        approvedAt: null,
        lastError: null,
        sortOrder: 0,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);
    mocks.listIronSprueR2Objects.mockResolvedValue([
      {
        key: 'products/is-aos-05603/image-2/iron-sprue-image-2-ddc9b0dbc551.png',
        size: 128,
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
        previewUrl: '/iron-sprue-admin/media/preview?key=products%2Fis-aos-05603%2Fimage-2%2Firon-sprue-image-2-ddc9b0dbc551.png',
      },
    ]);

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'media' }));

    expect(markup).toContain('Pagani Zonda F');
    expect(markup).toContain('products%2Fis-aos-05603%2Fimage-2%2Fmaster.webp');
    expect(markup).toContain('R2 product image inventory found');
    expect(markup).not.toContain('Existing R2 image candidates');
    expect(markup).not.toContain('Attach R2 image for review');
    expect(markup).toContain('Select all displayed');
    expect(markup).toContain('Approve selected');
    expect(markup).toContain('Publish selected products');
    expect(markup).toContain('Publish product');
    expect(markup).toContain('data-bulk-group="iron-sprue-media-product-bulk-publish"');
    expect(markup).toContain('data-bulk-group="iron-sprue-media-bulk-approval"');
    expect(markup).not.toContain('No current');
    expect(markup).not.toContain('media record is available for this product.');
    expect(markup).not.toContain('Upload review candidate');
    expect(markup).not.toContain('completed-result');
  });

  it('renders hero upload, existing R2 hero selection and preview library', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({ brands: [], categories: [], suppliers: [] });
    mocks.getIronSprueAdminStorefrontControls.mockResolvedValue({
      homepagePlacements: [],
      heroes: [{
        id: 'hero-1',
        headline: 'Aventador energy',
        strapline: 'Bright, sharp, bench-ready.',
        ctaLabel: 'Shop now',
        ctaHref: '/products/aoshima-06348-lamborghini-adventador-green',
        imageUrl: 'r2://marketing/heroes/aoshima-pagani.webp',
        active: true,
        merchandisingBadge: 'NEW',
        sortOrder: 1,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      }],
      specialOffers: [],
      discountCodes: [],
      typographySettings: {
        id: null,
        storeCode: 'IRON_SPRUE',
        headingFamily: 'IMPACT_CONDENSED',
        bodyFamily: 'SYSTEM_SANS',
        headingWeight: 'BLACK',
        bodyWeight: 'REGULAR',
        headingScale: 'STANDARD',
        bodyScale: 'STANDARD',
        createdAt: null,
        updatedAt: null,
      },
      auditLog: [],
    });
    mocks.listIronSprueR2Objects.mockResolvedValue([
      {
        key: 'marketing/heroes/aoshima-pagani.webp',
        size: 1234,
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
        previewUrl: '/iron-sprue-admin/media/preview?key=marketing%2Fheroes%2Faoshima-pagani.webp',
      },
    ]);
    mocks.listIronSprueAdminProducts.mockResolvedValue({
      products: [
        {
          id: 'product-1',
          sku: 'IS-AOS-06348',
          slug: 'aoshima-06348-lamborghini-adventador-green',
          customerTitle: 'Lamborghini Aventador Green',
          mediaAssets: [],
        },
      ],
    });

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'heroes' }));

    expect(markup).toContain('Upload hero artwork');
    expect(markup).toContain('Existing hero artwork');
    expect(markup).toContain('Current hero carousel');
    expect(markup).toContain('Aventador energy');
    expect(markup).toContain('ORDER');
    expect(markup).toContain('Hero product target');
    expect(markup).toContain('IS-AOS-06348');
    expect(markup).toContain('Lamborghini Aventador Green');
    expect(markup).toContain('Available hero artwork');
    expect(markup).toContain('aoshima-pagani.webp');
  });

  it('renders Admin save feedback from action redirects', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.listIronSprueAdminMediaAssets.mockResolvedValue([]);

    const savedMarkup = await renderAsync(await IronSprueAdminSection({
      section: 'media',
      searchParams: { saved: 'Media approval saved.' },
    }));
    expect(savedMarkup).toContain('role="status"');
    expect(savedMarkup).toContain('Media approval saved.');

    const errorMarkup = await renderAsync(await IronSprueAdminSection({
      section: 'media',
      searchParams: { error: 'Media approval failed.' },
    }));
    expect(errorMarkup).toContain('role="alert"');
    expect(errorMarkup).toContain('Media approval failed.');
  });

  it('separates content approval-required and approved queues with live counts', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue([
      ...cards,
      { key: 'content-review', label: 'Content Review', href: '/iron-sprue-admin/content-review', status: 'ready', requiredPermission: 'content:approve', description: 'Customer copy review.' },
    ]);
    mocks.listIronSprueAdminContentReviews.mockResolvedValue([
      {
        id: 'review-pending',
        productId: 'product-1',
        product: {
          id: 'product-1',
          sku: 'IS-CUB-MC133H',
          customerTitle: 'Burj Khalifa',
          shortDescription: 'PDP short copy',
          fullDescription: 'PDP full descriptor copy',
          featureBullets: ['Detailed landmark kit'],
          specifications: { pieces: '136' },
          seoTitle: 'Burj Khalifa model kit',
          metaDescription: 'Build the Burj Khalifa.',
          buildType: '3D puzzle',
          publicationState: 'MEDIA_PENDING',
          brand: { name: 'CubicFun' },
          category: { name: 'Model Kits' },
        },
        fieldName: 'fullDescription',
        proposedValue: { text: 'Retail copy' },
        sourceReference: null,
        status: 'PENDING',
        reviewedById: null,
        reviewedAt: null,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      },
      {
        id: 'review-approved',
        productId: 'product-2',
        product: {
          id: 'product-2',
          sku: 'IS-AOS-05628',
          customerTitle: 'Toyota 2000GT Red',
          shortDescription: 'Toyota PDP short copy',
          fullDescription: 'Toyota PDP full descriptor copy',
          featureBullets: ['1:24 scale model kit'],
          specifications: { scale: '1:24' },
          seoTitle: 'Toyota 2000GT Red model kit',
          metaDescription: 'Aoshima Toyota 2000GT Red model kit.',
          buildType: 'Model kit',
          publicationState: 'MEDIA_PENDING',
          brand: { name: 'Aoshima' },
          category: { name: 'Model Kits' },
        },
        fieldName: 'fullDescription',
        proposedValue: { text: 'Approved retail copy' },
        sourceReference: null,
        status: 'APPROVED',
        reviewedById: 'admin-1',
        reviewedAt: new Date('2026-08-11T00:00:00.000Z'),
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      },
      {
        id: 'review-media-metadata',
        productId: 'product-2',
        product: {
          id: 'product-2',
          sku: 'IS-AOS-05628',
          customerTitle: 'Toyota 2000GT Red',
          shortDescription: 'Toyota PDP short copy',
          fullDescription: 'Toyota PDP full descriptor copy',
          featureBullets: ['1:24 scale model kit'],
          specifications: { scale: '1:24' },
          seoTitle: 'Toyota 2000GT Red model kit',
          metaDescription: 'Aoshima Toyota 2000GT Red model kit.',
          buildType: 'Model kit',
          publicationState: 'MEDIA_PENDING',
          brand: { name: 'Aoshima' },
          category: { name: 'Model Kits' },
        },
        fieldName: 'image-2-candidate',
        proposedValue: { text: 'media generation metadata' },
        sourceReference: 'codex-imagegen-edit',
        status: 'APPROVED',
        reviewedById: 'admin-1',
        reviewedAt: new Date('2026-08-11T00:00:00.000Z'),
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      },
      {
        id: 'review-commercial-import',
        productId: 'product-3',
        product: {
          id: 'product-3',
          sku: 'IS-CUB-MC093H',
          customerTitle: "St Basil's Cathedral",
          shortDescription: 'Landmark puzzle descriptor copy',
          fullDescription: 'Build a colourful architectural display model inspired by St Basil cathedral.',
          featureBullets: ['Detailed architectural puzzle', 'Display-ready model'],
          specifications: { pieces: '214', buildTime: '4-6 hours', material: 'printed foam board' },
          seoTitle: "St Basil's Cathedral 3D puzzle",
          metaDescription: "Build St Basil's Cathedral as a display puzzle.",
          buildType: '3D puzzle',
          publicationState: 'REVIEW_REQUIRED',
          brand: { name: 'CubicFun' },
          category: { name: 'Landmark Models' },
        },
        fieldName: 'launch-import',
        proposedValue: { sourceRow: 73, retailPriceMinor: 1849, supplierUnitCostMinor: 594 },
        sourceReference: 'Iron_Sprue_Updated_Sales_Prices_and_Margins.xlsx#Sales Prices:row-73',
        status: 'CONFLICT',
        reviewedById: null,
        reviewedAt: null,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);
    mocks.listIronSprueAdminProducts.mockResolvedValue({
      products: [
        {
          id: 'product-3',
          sku: 'IS-CUB-MC093H',
          slug: 'cubicfun-mc093h-st-basils-cathedral',
          customerTitle: "St Basil's Cathedral",
          shortDescription: 'Landmark puzzle descriptor copy',
          fullDescription: 'Build a colourful architectural display model inspired by St Basil cathedral.',
          featureBullets: ['Detailed architectural puzzle', 'Display-ready model'],
          specifications: { pieces: '214', buildTime: '4-6 hours', material: 'printed foam board' },
          seoTitle: "St Basil's Cathedral 3D puzzle",
          metaDescription: "Build St Basil's Cathedral as a display puzzle.",
          buildType: '3D puzzle',
          publicationState: 'REVIEW_REQUIRED',
          brand: { name: 'CubicFun' },
          category: { name: 'Landmark Models' },
          mediaAssets: [],
          contentReviews: [],
        },
      ],
    });

    const pendingMarkup = await renderAsync(await IronSprueAdminSection({ section: 'content-review' }));
    expect(pendingMarkup).toContain('Approval Required');
    expect(pendingMarkup).toContain('Approved');
    expect(pendingMarkup).toContain('1');
    expect(pendingMarkup).toContain('Burj Khalifa');
    expect(pendingMarkup).toContain('PDP full descriptor copy');
    expect(pendingMarkup).toContain('Feature bullets');
    expect(pendingMarkup).not.toContain('&quot;text&quot;');
    expect(pendingMarkup).toContain('data-bulk-group="iron-sprue-content-bulk-approval"');
    expect(pendingMarkup).toContain('Approve selected');
    expect(pendingMarkup).toContain('Needs review');
    expect(pendingMarkup).toContain('Reject selected');
    expect(pendingMarkup).not.toContain('Toyota 2000GT Red');
    expect(pendingMarkup).toContain('PDP descriptor coverage');
    expect(pendingMarkup).toContain('All loaded products have the core PDP descriptor fields populated');
    expect(pendingMarkup).not.toContain('St Basil&#x27;s Cathedral');
    expect(pendingMarkup).not.toContain('Build a colourful architectural display model inspired by St Basil cathedral.');
    expect(pendingMarkup).not.toContain('retailPriceMinor');
    expect(pendingMarkup).not.toContain('supplierUnitCostMinor');

    const approvedMarkup = await renderAsync(await IronSprueAdminSection({
      section: 'content-review',
      searchParams: { status: 'approved' },
    }));
    expect(approvedMarkup).toContain('Toyota 2000GT Red');
    expect(approvedMarkup).toContain('Toyota PDP full descriptor copy');
    expect(approvedMarkup).not.toContain('Media / Commercial / Import Review');
    expect(approvedMarkup).not.toContain('media generation metadata');
    expect(approvedMarkup).not.toContain('retailPriceMinor');
    expect(approvedMarkup).not.toContain('supplierUnitCostMinor');
    expect(approvedMarkup).toContain('Publish selected products');
    expect(approvedMarkup).toContain('Publish product');
    expect(approvedMarkup).toContain('data-bulk-group="iron-sprue-content-product-bulk-publish"');
    expect(approvedMarkup).not.toContain('Burj Khalifa');
  });

  it('shows product blockers, ready filter and publish controls', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue([
      ...cards,
      { key: 'products', label: 'Products', href: '/iron-sprue-admin/products', status: 'ready', requiredPermission: 'products:view', description: 'Product publishing.' },
    ]);
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({ brands: [], categories: [], suppliers: [] });
    mocks.listIronSprueAdminProducts.mockResolvedValue({
      pagination: { total: 1, page: 1, pageSize: 81, totalPages: 1 },
      products: [
        {
          id: 'product-ready',
          sku: 'IS-AOS-05628',
          slug: 'aoshima-05628-toyota-2000gt-red',
          customerTitle: 'Toyota 2000GT Red',
          sourceTitle: 'Toyota 2000GT Red',
          shortDescription: 'Ready retail copy.',
          fullDescription: [
            'Full PDP descriptor copy for the product.',
            'The subject and format are kept specific so customers can compare it properly against the rest of the Pintoo launch range. The catalogue currently confirms the brand, product title and supplier reference.',
            'Unsupported claims such as piece count, dimensions, materials and age grading have been left out until they are verified from manufacturer packaging or source data.',
            'The listing is built from the launch catalogue and associated supplier or manufacturer source material already captured for Iron Sprue.',
          ].join('\n\n'),
          featureBullets: ['Display-ready model kit', 'Supplier code 05628'],
          specifications: {
            scale: '1:24',
            supplierCode: '05628',
            manufacturerReference: '05628',
            sourceRow: '73',
            retailPriceMinor: '1999',
          },
          seoTitle: 'Toyota 2000GT Red model kit',
          metaDescription: 'Aoshima Toyota 2000GT Red model kit.',
          buildType: 'Model kit',
          publicationState: 'READY_TO_PUBLISH',
          readiness: { isReadyToPublish: true, status: 'READY', blockingReasons: [] },
          readinessBlockers: [],
          brand: { name: 'Aoshima' },
          category: { name: 'Model Kits' },
          supplier: null,
          grossPriceMinor: 1999,
          supplierUnitCostMinor: 1055,
          landedCostMinor: 1200,
          vatRate: 20,
          currency: 'GBP',
          inventory: { availableStock: 2, reservedStock: 1 },
          mediaAssets: [
            {
              id: 'placeholder-media',
              role: 'catalogue-primary',
              approvalState: 'FAILED',
              isPrimary: false,
              storageKey: 'published/products/is-aos-05628/catalogue-primary-placeholder.json',
              url: null,
              altText: null,
              width: null,
              height: null,
              mimeType: 'application/json',
              sortOrder: 0,
            },
          ],
          contentReviews: [{ id: 'review-1', fieldName: 'launch-import', status: 'PENDING', conflictReason: null }],
          featured: false,
          newArrival: false,
          comingSoon: false,
          specialOffer: false,
          hideWhenOutOfStock: false,
        },
      ],
    });
    mocks.listIronSprueR2Objects.mockResolvedValueOnce([
      {
        key: 'products/is-aos-05628/image-2/iron-sprue-image-2-acf115ef37eb.png',
        size: 128,
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
        previewUrl: '/iron-sprue-admin/media/preview?key=products%2Fis-aos-05628%2Fimage-2%2Firon-sprue-image-2-acf115ef37eb.png',
      },
    ]).mockResolvedValueOnce([
      {
        key: 'archive/products/is-aos-05628-aoshima-05628-toyota-2000gt-red/original/manufacturer-source.jpg',
        size: 256,
        updatedAt: new Date('2026-08-10T00:00:00.000Z'),
        previewUrl: '/iron-sprue-admin/media/preview?key=archive%2Fproducts%2Fis-aos-05628-aoshima-05628-toyota-2000gt-red%2Foriginal%2Fmanufacturer-source.jpg',
      },
    ]);

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'products', searchParams: { state: 'READY_TO_PUBLISH' } }));

    expect(markup).toContain('Ready to publish');
    expect(markup).toContain('Publish product');
    expect(markup).toContain('Publish selected');
    expect(markup).toContain('data-bulk-group="iron-sprue-product-bulk-publish"');
    expect(markup).toContain('READY_TO_PUBLISH');
    expect(markup).toContain('Existing R2 product images detected:');
    expect(markup).toContain('Reconcile R2 media');
    expect(markup).toContain('Full PDP descriptor copy for the product.');
    expect(markup).not.toContain('catalogue currently confirms');
    expect(markup).not.toContain('Unsupported claims');
    expect(markup).not.toContain('launch catalogue');
    expect(markup).not.toContain('Supplier code 05628');
    expect(markup).toContain('Scale');
    expect(markup).toContain('1:24');
    expect(markup).not.toContain('supplierCode');
    expect(markup).not.toContain('manufacturerReference');
    expect(markup).not.toContain('sourceRow');
    expect(markup).not.toContain('retailPriceMinor');
    expect(markup).toContain('Sell price:');
    expect(markup).toContain('Stock on hand:');
    expect(markup).toContain('name="returnTo" value="/iron-sprue-admin/products?state=READY_TO_PUBLISH#product-product-ready"');
    expect(markup).not.toContain('Source/placeholder records');
    expect(markup).not.toContain('catalogue-primary-placeholder.json');
    expect(markup).toContain('Existing R2 image candidates');
    expect(markup).toContain('iron-sprue-image-2-acf115ef37eb.png');
    expect(markup).toContain('manufacturer-source.jpg');
    expect(markup).toContain('manufacturer-original');
    expect(markup).toContain('Tools and accessories can publish with one approved displayable product image.');
  });

  it('renders storefront placement and brand carousel controls', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({
      categories: [],
      suppliers: [],
      brands: [{ id: 'brand-1', name: 'Aoshima', slug: 'aoshima', logoUrl: 'r2://brands/aoshima.webp', logoAltText: 'Aoshima', website: null, sortOrder: 0, active: true, featured: true, storeCode: 'IRON_SPRUE', createdAt: new Date(), updatedAt: new Date(), _count: { products: 12 } }],
    });
    mocks.getIronSprueAdminStorefrontControls.mockResolvedValue({
      homepagePlacements: [{
        id: 'placement-1',
        placementKey: 'promo-banner',
        title: 'Free UK delivery on orders over £30',
        ctaLabel: '',
        ctaHref: '',
        imageUrl: null,
        active: true,
        sortOrder: 0,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      }, {
        id: 'placement-2',
        placementKey: 'featured-products',
        title: 'Opening bench picks.',
        ctaLabel: 'See new arrivals',
        ctaHref: '/shop?sort=newest',
        imageUrl: null,
        active: true,
        sortOrder: 0,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      }, {
        id: 'placement-3',
        placementKey: 'featured-product:lamborghini-aventador-blue',
        title: 'Lamborghini Aventador Blue',
        ctaLabel: 'Shop now',
        ctaHref: '/products/lamborghini-aventador-blue',
        imageUrl: null,
        active: true,
        sortOrder: 0,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      }, {
        id: 'placement-4',
        placementKey: 'product-section:our-aoshima-picks:lamborghini-aventador-blue',
        title: 'Our favourite Aoshima kits',
        ctaLabel: '',
        ctaHref: '/products/lamborghini-aventador-blue',
        imageUrl: null,
        active: true,
        sortOrder: 0,
        storeCode: 'IRON_SPRUE',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      }],
      heroes: [],
      specialOffers: [],
      discountCodes: [],
      typographySettings: {
        id: null,
        storeCode: 'IRON_SPRUE',
        headingFamily: 'IMPACT_CONDENSED',
        bodyFamily: 'SYSTEM_SANS',
        headingWeight: 'BLACK',
        bodyWeight: 'REGULAR',
        headingScale: 'STANDARD',
        bodyScale: 'STANDARD',
        createdAt: null,
        updatedAt: null,
      },
      auditLog: [],
    });
    mocks.listIronSprueAdminProducts.mockResolvedValue({
      products: [{
        id: 'product-lambo',
        sku: 'IS-AOS-06349',
        slug: 'lamborghini-aventador-blue',
        customerTitle: 'Lamborghini Aventador Blue',
        mediaAssets: [{
          approvalState: 'APPROVED',
          role: 'catalogue-primary',
          url: null,
          storageKey: 'products/lambo.png',
        }],
      }],
    });

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'homepage' }));

    expect(markup).toContain('Promo strips and banners');
    expect(markup).toContain('Strip icon');
    expect(markup).toContain('Current promo banner state');
    expect(markup).toContain('Free UK delivery on orders over £30');
    expect(markup).toContain('promo-banner');
    expect(markup).toContain('Create promo banner');
    expect(markup).toContain('Opening bench picks row');
    expect(markup).toContain('Current products in this row');
    expect(markup).toContain('Row link:');
    expect(markup).toContain('See new arrivals');
    expect(markup).toContain('-&gt; /shop?sort=newest');
    expect(markup).toContain('Lamborghini Aventador Blue');
    expect(markup).toContain('Additional homepage product rows');
    expect(markup).toContain('Our favourite Aoshima kits');
    expect(markup).toContain('Row key:');
    expect(markup).toContain('our-aoshima-picks');
    expect(markup).toContain('Add product to opening row');
    expect(markup).toContain('Product in this slot');
    expect(markup).toContain('Save or replace row product');
    expect(markup).not.toContain('Featured products');
    expect(markup).not.toContain('Edit product-section:our-aoshima-picks');
    expect(markup).toContain('Brands we stock carousel');
    expect(markup).toContain('Save brand controls');
    expect(markup).toContain('Aoshima');
    expect(markup).toContain('Storefront typography');
    expect(markup).toContain('Save typography controls');
  });

  it('shows opening bench fallback products when no saved homepage row products exist', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({ categories: [], suppliers: [], brands: [] });
    mocks.getIronSprueAdminStorefrontControls.mockResolvedValue({
      homepagePlacements: [],
      heroes: [],
      specialOffers: [],
      discountCodes: [],
      typographySettings: {
        id: null,
        storeCode: 'IRON_SPRUE',
        headingFamily: 'IMPACT_CONDENSED',
        bodyFamily: 'SYSTEM_SANS',
        headingWeight: 'BLACK',
        bodyWeight: 'REGULAR',
        headingScale: 'STANDARD',
        bodyScale: 'STANDARD',
        createdAt: null,
        updatedAt: null,
      },
      auditLog: [],
    });
    mocks.listIronSprueAdminProducts.mockResolvedValue({
      products: [
        {
          id: 'product-white',
          sku: 'IS-AOS-05627',
          slug: 'aoshima-05627-toyota-2000gt-white',
          customerTitle: 'Toyota 2000GT White',
          mediaAssets: [{ approvalState: 'APPROVED', role: 'catalogue-primary', url: null, storageKey: 'products/white.png' }],
        },
        {
          id: 'product-red',
          sku: 'IS-AOS-05628',
          slug: 'aoshima-05628-toyota-2000gt-red',
          customerTitle: 'Toyota 2000GT Red',
          mediaAssets: [],
        },
      ],
    });

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'homepage' }));

    expect(markup).toContain('2 FALLBACK EFFECTIVE');
    expect(markup).toContain('Current products in this row are storefront fallback');
    expect(markup).toContain('Toyota 2000GT White');
    expect(markup).toContain('Toyota 2000GT Red');
    expect(markup).toContain('Convert fallback row into editable picks');
    expect(markup).toContain('name="productSlug" value="aoshima-05627-toyota-2000gt-white"');
    expect(markup).toContain('name="productSlug" value="aoshima-05628-toyota-2000gt-red"');
    expect(markup).toContain('Add product to row');
  });
});
