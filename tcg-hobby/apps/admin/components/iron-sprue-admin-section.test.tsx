import React from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);

const mocks = vi.hoisted(() => ({
  getIronSprueAdminReferenceData: vi.fn(),
  getIronSprueAdminStorefrontControls: vi.fn(),
  getIronSprueAdminWorkspaceCards: vi.fn(),
  listIronSprueAdminMediaAssets: vi.fn(),
  listIronSprueAdminProducts: vi.fn(),
  listIronSprueR2Objects: vi.fn(),
}));

vi.mock('@tcg-hobby/database', () => ({
  getIronSprueAdminDashboard: vi.fn(),
  getIronSprueAdminReferenceData: mocks.getIronSprueAdminReferenceData,
  getIronSprueAdminStorefrontControls: mocks.getIronSprueAdminStorefrontControls,
  getIronSprueAdminWorkspaceCards: mocks.getIronSprueAdminWorkspaceCards,
  listIronSprueAdminContentReviews: vi.fn(),
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
  saveIronSprueHeroAction: vi.fn(),
  saveIronSprueHomepagePlacementAction: vi.fn(),
  saveIronSprueSpecialOfferAction: vi.fn(),
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
  it('groups Image 2 and workshop media with upload controls for missing stages', async () => {
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
    expect(markup).toContain('No current');
    expect(markup).toContain('workshop');
    expect(markup).toContain('media record is available for this product.');
    expect(markup).toContain('Upload review candidate');
  });

  it('renders hero upload, existing R2 hero selection and preview library', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({ brands: [], categories: [], suppliers: [] });
    mocks.getIronSprueAdminStorefrontControls.mockResolvedValue({
      homepagePlacements: [],
      heroes: [],
      specialOffers: [],
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

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'heroes' }));

    expect(markup).toContain('Upload hero artwork');
    expect(markup).toContain('Existing hero artwork');
    expect(markup).toContain('Available hero artwork');
    expect(markup).toContain('aoshima-pagani.webp');
  });

  it('renders storefront placement and brand carousel controls', async () => {
    mocks.getIronSprueAdminWorkspaceCards.mockReturnValue(cards);
    mocks.getIronSprueAdminReferenceData.mockResolvedValue({
      categories: [],
      suppliers: [],
      brands: [{ id: 'brand-1', name: 'Aoshima', slug: 'aoshima', logoUrl: 'r2://brands/aoshima.webp', logoAltText: 'Aoshima', website: null, sortOrder: 0, active: true, featured: true, storeCode: 'IRON_SPRUE', createdAt: new Date(), updatedAt: new Date(), _count: { products: 12 } }],
    });
    mocks.getIronSprueAdminStorefrontControls.mockResolvedValue({
      homepagePlacements: [],
      heroes: [],
      specialOffers: [],
      auditLog: [],
    });

    const markup = await renderAsync(await IronSprueAdminSection({ section: 'homepage' }));

    expect(markup).toContain('Create storefront placement');
    expect(markup).toContain('Brands we stock carousel');
    expect(markup).toContain('Save brand controls');
    expect(markup).toContain('Aoshima');
  });
});
