import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdminRole: vi.fn(),
  saveHomepageHeroPlacement: vi.fn(),
  saveShopLandingPage: vi.fn(),
  saveStorefrontBanner: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('./auth.server', () => ({ requireAdminRole: mocks.requireAdminRole }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@capital-hobby/database', () => ({
  HERO_DISPLAY_MODES: ['FULL_BLEED', 'CONTAINED'],
  HERO_FOCAL_POINTS: ['LEFT', 'CENTER', 'RIGHT'],
  HERO_IMAGE_SOURCES: ['PRODUCT', 'CUSTOM'],
  HERO_OVERLAY_STRENGTHS: ['LIGHT', 'BALANCED', 'STRONG'],
  isSafeStorefrontHref: (value: string | null | undefined) => Boolean(value?.startsWith('/') && !value.startsWith('//')),
  isSafeStorefrontMediaUrl: (value: string | null | undefined) => !value || value.startsWith('/') || value.startsWith('https://'),
  saveHomepageHeroPlacement: mocks.saveHomepageHeroPlacement,
  saveShopLandingPage: mocks.saveShopLandingPage,
  saveStorefrontBanner: mocks.saveStorefrontBanner,
}));

import {
  saveHomepageHeroPlacementAction,
  saveShopLandingPageAction,
  saveStorefrontBannerAction,
} from './storefront-content-actions.server';

const heroState = {
  fieldErrors: {},
  values: {
    id: '',
    productId: '',
    headline: '',
    supportingText: '',
    ctaLabel: 'Shop now',
    ctaHref: '',
    imageUrl: '',
    imageAlt: '',
    imageSource: 'PRODUCT' as const,
    selectedProductImageId: '',
    displayMode: 'FULL_BLEED' as const,
    focalPoint: 'CENTER' as const,
    overlayStrength: 'BALANCED' as const,
    startsAt: '',
    endsAt: '',
    sortOrder: '0',
    active: false,
  },
};

describe('storefront content Admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminRole.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
  });

  it('requires ADMIN permission before saving a promotional banner', async () => {
    const data = new FormData();
    data.set('message', 'Free delivery');
    data.set('icon', 'DELIVERY');
    data.set('active', 'true');

    await saveStorefrontBannerAction(data);

    expect(mocks.requireAdminRole).toHaveBeenCalledWith('/admin/storefront');
    expect(mocks.saveStorefrontBanner).toHaveBeenCalledWith(null, expect.objectContaining({
      message: 'Free delivery',
      icon: 'DELIVERY',
      active: true,
    }));
  });

  it('does not run a content mutation when role enforcement fails', async () => {
    mocks.requireAdminRole.mockRejectedValueOnce(new Error('Administrator permission required.'));
    const data = new FormData();
    data.set('productId', 'product-1');
    data.set('headline', 'Hero');
    data.set('supportingText', 'Supporting text');
    data.set('ctaLabel', 'Shop now');
    data.set('ctaHref', '/shop');

    await expect(saveHomepageHeroPlacementAction(heroState, data)).rejects.toThrow('Administrator permission required.');
    expect(mocks.saveHomepageHeroPlacement).not.toHaveBeenCalled();
  });

  it('returns an inline CTA error and preserves entered hero values', async () => {
    const data = new FormData();
    data.set('productId', 'product-1');
    data.set('headline', 'Mega Greninja');
    data.set('supportingText', 'Premium collection');
    data.set('ctaLabel', 'Shop now');
    data.set('ctaHref', 'https://external.example/product');
    data.set('active', 'true');

    const result = await saveHomepageHeroPlacementAction(heroState, data);

    expect(result).toMatchObject({
      fieldErrors: {
        ctaHref: expect.stringContaining('internal storefront path'),
      },
      values: {
        productId: 'product-1',
        headline: 'Mega Greninja',
        ctaHref: 'https://external.example/product',
        active: true,
      },
    });
    expect(mocks.saveHomepageHeroPlacement).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('saves a valid internal hero route through the existing domain service', async () => {
    const data = new FormData();
    data.set('productId', 'product-1');
    data.set('headline', 'Mega Greninja');
    data.set('supportingText', 'Premium collection');
    data.set('ctaLabel', 'Shop now');
    data.set('ctaHref', '/catalogue/mega-greninja');
    data.set('displayMode', 'FULL_BLEED');
    data.set('focalPoint', 'RIGHT');
    data.set('overlayStrength', 'STRONG');

    await saveHomepageHeroPlacementAction(heroState, data);

    expect(mocks.saveHomepageHeroPlacement).toHaveBeenCalledWith(null, expect.objectContaining({
      productId: 'product-1',
      ctaHref: '/catalogue/mega-greninja',
      displayMode: 'FULL_BLEED',
      focalPoint: 'RIGHT',
      overlayStrength: 'STRONG',
      imageSource: 'PRODUCT',
    }));
  });

  it('passes a selected existing product image only through custom-image mode', async () => {
    const data = new FormData();
    data.set('productId', 'product-1');
    data.set('headline', 'Mega Greninja');
    data.set('supportingText', 'Premium collection');
    data.set('ctaLabel', 'Shop now');
    data.set('ctaHref', '/catalogue/mega-greninja');
    data.set('imageSource', 'CUSTOM');
    data.set('selectedProductImageId', 'image-2');
    data.set('displayMode', 'FULL_BLEED');
    data.set('focalPoint', 'RIGHT');
    data.set('overlayStrength', 'BALANCED');

    await saveHomepageHeroPlacementAction(heroState, data);

    expect(mocks.saveHomepageHeroPlacement).toHaveBeenCalledWith(null, expect.objectContaining({
      imageSource: 'CUSTOM',
      selectedProductImageId: 'image-2',
    }));
  });

  it('rejects hero copy that exceeds the guided layout limits', async () => {
    const data = new FormData();
    data.set('productId', 'product-1');
    data.set('headline', 'H'.repeat(91));
    data.set('supportingText', 'S'.repeat(181));
    data.set('ctaLabel', 'Shop now');
    data.set('ctaHref', '/catalogue/mega-greninja');
    data.set('displayMode', 'FULL_BLEED');
    data.set('focalPoint', 'RIGHT');
    data.set('overlayStrength', 'BALANCED');

    const result = await saveHomepageHeroPlacementAction(heroState, data);

    expect(result.fieldErrors).toMatchObject({
      headline: expect.stringContaining('90 characters'),
      supportingText: expect.stringContaining('180 characters'),
    });
    expect(mocks.saveHomepageHeroPlacement).not.toHaveBeenCalled();
  });

  it('saves maintained Shop landing content without changing product records', async () => {
    const data = new FormData();
    data.set('scopeKey', 'pokemon');
    data.set('heading', 'Explore Pokémon TCG');
    data.set('supportingText', 'Discover new products.');
    data.set('active', 'true');

    await saveShopLandingPageAction(data);

    expect(mocks.saveShopLandingPage).toHaveBeenCalledWith(expect.objectContaining({
      scopeKey: 'pokemon',
      heading: 'Explore Pokémon TCG',
      active: true,
    }));
  });
});
