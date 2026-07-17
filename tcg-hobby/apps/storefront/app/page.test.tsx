import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductionHomepageData } from '../lib/homepage-data';

const mocks = vi.hoisted(() => ({
  comingSoonMode: false,
  getProductionHomepageData: vi.fn(),
  getCurrentCustomerSession: vi.fn(async () => null),
  getWishlistProductIds: vi.fn(async () => []),
  socialLinks: [] as Array<{ label: 'Facebook' | 'Instagram' | 'TikTok'; href: string }>,
}));

vi.mock('../lib/site', () => ({
  getSiteUrl: () => 'https://tcg-hobby.co.uk',
  getSiteSocialLinks: () => mocks.socialLinks,
  isComingSoonMode: () => mocks.comingSoonMode,
  launchDescription: 'Launch description',
  siteName: 'TCG Hobby',
}));

vi.mock('../lib/homepage-data', () => ({
  getProductionHomepageData: mocks.getProductionHomepageData,
}));

vi.mock('../lib/auth', () => ({
  getCurrentCustomerSession: mocks.getCurrentCustomerSession,
}));

vi.mock('@tcg-hobby/database', () => ({
  getWishlistProductIds: mocks.getWishlistProductIds,
}));

vi.mock('../components/site-header', () => ({
  SiteHeader: () => <header>Storefront Header</header>,
}));

vi.mock('../components/cart-actions', () => ({
  AddToCartButton: ({ productId }: { productId: string }) => <button type="button">Add {productId}</button>,
}));

vi.mock('../components/homepage-hero-carousel', () => ({
  HomepageHeroCarousel: () => <section>Hero banner</section>,
}));

vi.mock('../lib/wishlist', () => ({
  toggleWishlistAction: vi.fn(),
}));

vi.mock('../lib/release-actions', () => ({
  toggleNotificationAction: vi.fn(),
}));

vi.mock('./coming-soon/page', () => ({
  default: () => <section>Coming Soon landing page</section>,
}));

import HomePage from './page';
import type { MerchandisingRecommendation } from '@tcg-hobby/database';

function recommendation(overrides: Partial<MerchandisingRecommendation> = {}): MerchandisingRecommendation {
  return {
    id: overrides.id ?? 'prod-1',
    slug: overrides.slug ?? 'product-one',
    name: overrides.name ?? 'Product One',
    imageUrl: overrides.imageUrl ?? null,
    imageAlt: overrides.imageAlt ?? null,
    price: overrides.price ?? { amountMinor: 4999, currency: 'GBP' },
    publicStockState: overrides.publicStockState ?? 'IN_STOCK',
    gameLabel: overrides.gameLabel ?? 'Pokemon',
    categoryLabel: overrides.categoryLabel ?? 'Sealed Product',
    categorySlug: overrides.categorySlug ?? 'sealed-product',
    freeUkStandardShipping: overrides.freeUkStandardShipping ?? false,
    customerPurchaseLimit: overrides.customerPurchaseLimit ?? null,
    wishlistEligible: overrides.wishlistEligible ?? true,
    basketEligible: overrides.basketEligible ?? true,
    strategyId: overrides.strategyId ?? 'featured',
  };
}

function homepageData(overrides: Partial<ProductionHomepageData> = {}): ProductionHomepageData {
  return {
    heroSlides: [],
    featuredProducts: [],
    latestProducts: [],
    staffPickProducts: [],
    ...overrides,
  };
}

describe('HomePage mode switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.comingSoonMode = false;
    mocks.socialLinks = [];
    mocks.getProductionHomepageData.mockResolvedValue(homepageData());
  });

  it('renders the Coming Soon experience at / when launch mode is enabled', async () => {
    mocks.comingSoonMode = true;

    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('Coming Soon landing page');
    expect(mocks.getProductionHomepageData).not.toHaveBeenCalled();
  });

  it('renders the refined production storefront homepage when launch mode is disabled', async () => {
    mocks.socialLinks = [{ label: 'Instagram', href: 'https://instagram.com/tcghobby' }];
    mocks.getProductionHomepageData.mockResolvedValue(
      homepageData({
        featuredProducts: [recommendation({ id: 'featured', name: 'Featured Product' })],
        latestProducts: [recommendation({ id: 'latest', name: 'Latest Product' })],
        staffPickProducts: [recommendation({ id: 'staff', name: 'Staff Pick Product' })],
      }),
    );

    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('Storefront Header');
    expect(markup).toContain('Hero banner');
    expect(markup).toContain('Popular catalogue categories');
    expect(markup).toContain('Magic: The Gathering');
    expect(markup).toContain('Featured products');
    expect(markup).toContain('Latest arrivals');
    expect(markup).toContain('Staff picks');
    expect(markup).toContain('Follow TCG Hobby');
    expect(markup).toContain('Follow TCG Hobby on Instagram');
    expect(markup).toContain('Trusted Service');
    expect(markup).not.toContain('Founding member');
    expect(markup).not.toContain('Shop by game');
    expect(markup).not.toContain('Today');
    expect(markup).not.toContain('Collection and player tools');
  });

  it('omits empty merchandising and social sections rather than showing filler', async () => {
    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(markup).not.toContain('Curated picks from the catalogue.');
    expect(markup).not.toContain('Fresh arrivals for launch.');
    expect(markup).not.toContain('Selected by TCG Hobby.');
    expect(markup).not.toContain('Follow TCG Hobby');
  });
});
