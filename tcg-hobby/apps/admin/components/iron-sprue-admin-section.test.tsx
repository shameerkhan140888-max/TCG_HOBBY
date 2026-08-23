import React from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);

const mocks = vi.hoisted(() => ({
  getIronSprueAdminReferenceData: vi.fn(),
  getIronSprueAdminStorefrontControls: vi.fn(),
  getIronSprueAdminWorkspaceCards: vi.fn(),
  listIronSprueAdminContentReviews: vi.fn(),
  listIronSprueAdminMediaAssets: vi.fn(),
  listIronSprueAdminProducts: vi.fn(),
  listIronSprueR2Objects: vi.fn(),
}));

vi.mock('@tcg-hobby/database', () => ({
  getIronSprueAdminDashboard: vi.fn(),
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
  bulkApproveIronSprueContentReviewsAction: vi.fn(),
  bulkApproveIronSprueMediaAction: vi.fn(),
  bulkPublishIronSprueProductsAction: vi.fn(),
  publishIronSprueProductAction: vi.fn(),
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
] as const;

describe('IronSprueAdminSection operational controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listIronSprueAdminProducts.mockResolvedValue({ products: [] });
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

  it('shows only approval-required media in the pending queue with upload controls', async () => {
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

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'media' }));

    expect(markup).toContain('Pagani Zonda F');
    expect(markup).toContain('products%2Fis-aos-05603%2Fimage-2%2Fmaster.webp');
    expect(markup).toContain('Select all displayed');
    expect(markup).toContain('Approve selected');
    expect(markup).toContain('Publish selected products');
    expect(markup).toContain('Publish product');
    expect(markup).toContain('data-bulk-group="iron-sprue-media-product-bulk-publish"');
    expect(markup).toContain('data-bulk-group="iron-sprue-media-bulk-approval"');
    expect(markup).not.toContain('No current');
    expect(markup).not.toContain('media record is available for this product.');
    expect(markup).toContain('Upload review candidate');
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
    ]);

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

    const approvedMarkup = await renderAsync(await IronSprueAdminSection({
      section: 'content-review',
      searchParams: { status: 'approved' },
    }));
    expect(approvedMarkup).toContain('Toyota 2000GT Red');
    expect(approvedMarkup).toContain('Toyota PDP full descriptor copy');
    expect(approvedMarkup).toContain('Media / Commercial / Import Review');
    expect(approvedMarkup).toContain('media generation metadata');
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
          publicationState: 'READY_TO_PUBLISH',
          readinessBlockers: [],
          brand: { name: 'Aoshima' },
          category: { name: 'Model Kits' },
          supplier: null,
          grossPriceMinor: 1999,
          currency: 'GBP',
          inventory: { availableStock: 2 },
          mediaAssets: [],
          contentReviews: [],
          featured: false,
          newArrival: false,
          comingSoon: false,
          specialOffer: false,
          hideWhenOutOfStock: false,
        },
      ],
    });

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'products', searchParams: { state: 'READY_TO_PUBLISH' } }));

    expect(markup).toContain('Ready to publish');
    expect(markup).toContain('Publish product');
    expect(markup).toContain('Publish selected');
    expect(markup).toContain('data-bulk-group="iron-sprue-product-bulk-publish"');
    expect(markup).toContain('READY_TO_PUBLISH');
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
        title: 'Free UK delivery on orders over £75',
        ctaLabel: '',
        ctaHref: '',
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
    mocks.listIronSprueAdminProducts.mockResolvedValue({ products: [] });

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'homepage' }));

    expect(markup).toContain('Promo banner and storefront placements');
    expect(markup).toContain('Current promo banner state');
    expect(markup).toContain('Free UK delivery on orders over £75');
    expect(markup).toContain('promo-banner');
    expect(markup).toContain('Create promo/banner placement');
    expect(markup).toContain('Storefront typography');
    expect(markup).toContain('Save typography controls');
    expect(markup).toContain('Brands we stock carousel');
    expect(markup).toContain('Save brand controls');
    expect(markup).toContain('Aoshima');
    expect(markup).toContain('Featured products');
    expect(markup).toContain('Add featured product');
  });
});
