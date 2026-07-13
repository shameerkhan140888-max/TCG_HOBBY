import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductionHomepageData } from '../lib/homepage-data';

const mocks = vi.hoisted(() => ({
  comingSoonMode: false,
  getProductionHomepageData: vi.fn(),
  getCurrentCustomerSession: vi.fn(async () => null),
  getWishlistProductIds: vi.fn(async () => []),
  getCustomerNotificationSubscriptions: vi.fn(async () => []),
}));

vi.mock('../lib/site', () => ({
  getSiteUrl: () => 'https://tcg-hobby.co.uk',
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
  getCustomerNotificationSubscriptions: mocks.getCustomerNotificationSubscriptions,
  getWishlistProductIds: mocks.getWishlistProductIds,
}));

vi.mock('../components/site-header', () => ({
  SiteHeader: () => <header>Storefront Header</header>,
}));

vi.mock('../components/cart-actions', () => ({
  AddToCartButton: ({ productId }: { productId: string }) => <button type="button">Add {productId}</button>,
}));

vi.mock('../components/homepage-hero-carousel', () => ({
  HomepageHeroCarousel: () => <section>Hero carousel</section>,
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

function homepageData(overrides: Partial<ProductionHomepageData> = {}): ProductionHomepageData {
  return {
    heroSlides: [],
    categories: [
      {
        name: 'Pokemon',
        href: '/catalogue?q=Pokemon',
        description: 'Cards and sealed products.',
        accent: 'Orange',
        available: true,
      },
    ],
    newReleases: [],
    releaseHub: {
      featuredRelease: null,
      upcomingReleases: [],
    },
    featuredProducts: [],
    hotProducts: [],
    tools: [],
    news: [],
    ...overrides,
  };
}

describe('HomePage mode switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.comingSoonMode = false;
    mocks.getProductionHomepageData.mockResolvedValue(homepageData());
  });

  it('renders the Coming Soon experience at / when launch mode is enabled', async () => {
    mocks.comingSoonMode = true;

    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('Coming Soon landing page');
    expect(mocks.getProductionHomepageData).not.toHaveBeenCalled();
  });

  it('renders the production storefront homepage when launch mode is disabled', async () => {
    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('Storefront Header');
    expect(markup).toContain('Shop by game');
    expect(markup).toContain('Stay close to launch drops.');
    expect(markup).toContain('name="marketingConsent"');
  });
});
