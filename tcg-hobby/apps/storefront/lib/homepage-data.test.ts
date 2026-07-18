import { describe, expect, it, vi } from 'vitest';
import type { MerchandisingRecommendation } from '@tcg-hobby/database';

vi.mock('@tcg-hobby/database', () => ({
  getMerchandisingFeaturedProducts: vi.fn(),
  getMerchandisingLatestProducts: vi.fn(),
  getMerchandisingStaffPickProducts: vi.fn(),
}));

import {
  dedupeProducts,
  getProductionHomepageData,
  homepageHeroSlides,
  selectHomepageFeaturedProducts,
  selectUniqueProducts,
} from './homepage-data';
import {
  getMerchandisingFeaturedProducts,
  getMerchandisingLatestProducts,
  getMerchandisingStaffPickProducts,
} from '@tcg-hobby/database';

function product(overrides: Partial<MerchandisingRecommendation> = {}): MerchandisingRecommendation {
  return {
    id: overrides.id ?? 'product-1',
    slug: overrides.slug ?? 'product-one',
    name: overrides.name ?? 'Product One',
    imageUrl: overrides.imageUrl === undefined ? '/products/product-one.webp' : overrides.imageUrl,
    imageAlt: overrides.imageAlt === undefined ? 'Product One' : overrides.imageAlt,
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

describe('homepage data selection', () => {
  it('uses promotional hero slides rather than game-category rotation', () => {
    expect(homepageHeroSlides.map((slide) => slide.id)).toEqual([
      'new-releases',
      'preorders',
      'accessories',
      'future-buylist',
    ]);
    expect(homepageHeroSlides).toHaveLength(4);
    expect(homepageHeroSlides.every((slide) => slide.primaryCta.href)).toBe(true);
  });

  it('selects one featured product set with a maximum of four products', () => {
    const selected = selectHomepageFeaturedProducts([
      product({ id: 'featured-1' }),
      product({ id: 'featured-2' }),
      product({ id: 'featured-3' }),
      product({ id: 'featured-4' }),
      product({ id: 'featured-5' }),
    ]);

    expect(selected).toHaveLength(4);
    expect(selected.map((item) => item.id)).toEqual(['featured-1', 'featured-2', 'featured-3', 'featured-4']);
  });

  it('selects adjacent sections without duplicating already selected products', () => {
    const selected = selectUniqueProducts(
      [
        product({ id: 'featured-1' }),
        product({ id: 'latest-1' }),
        product({ id: 'latest-2' }),
        product({ id: 'latest-3' }),
        product({ id: 'latest-4' }),
        product({ id: 'latest-5' }),
      ],
      [product({ id: 'featured-1' })],
    );

    expect(selected.map((item) => item.id)).toEqual(['latest-1', 'latest-2', 'latest-3', 'latest-4']);
  });

  it('calls merchandising services for featured, latest and staff-pick homepage sections', async () => {
    vi.mocked(getMerchandisingFeaturedProducts).mockResolvedValue([product({ id: 'featured' })]);
    vi.mocked(getMerchandisingLatestProducts).mockResolvedValue([product({ id: 'featured' }), product({ id: 'latest' })]);
    vi.mocked(getMerchandisingStaffPickProducts).mockResolvedValue([
      product({ id: 'featured' }),
      product({ id: 'latest' }),
      product({ id: 'staff' }),
    ]);

    const data = await getProductionHomepageData();

    expect(getMerchandisingFeaturedProducts).toHaveBeenCalledWith(8);
    expect(getMerchandisingLatestProducts).toHaveBeenCalledWith(8);
    expect(getMerchandisingStaffPickProducts).toHaveBeenCalledWith(8);
    expect(data.featuredProducts.map((item) => item.id)).toEqual(['featured']);
    expect(data.latestProducts.map((item) => item.id)).toEqual(['latest']);
    expect(data.staffPickProducts.map((item) => item.id)).toEqual(['staff']);
  });

  it('uses the default hero until the featured product image exists in merchandising data', async () => {
    vi.mocked(getMerchandisingFeaturedProducts).mockResolvedValue([
      product({
        id: 'mega',
        slug: 'pokemon-tcg-mega-greninja-ex-premium-collection',
        name: 'Pokémon TCG: Mega Greninja ex Premium Collection',
        imageUrl: null,
      }),
    ]);
    vi.mocked(getMerchandisingLatestProducts).mockResolvedValue([]);
    vi.mocked(getMerchandisingStaffPickProducts).mockResolvedValue([]);

    const data = await getProductionHomepageData();

    expect(data.featuredProducts[0]?.slug).toBe('pokemon-tcg-mega-greninja-ex-premium-collection');
    expect(data.heroSlides[0]?.id).toBe('new-releases');
    expect(data.heroSlides[0]?.image.src).toBe('/launch/tcg-hobby-production-hero.png');
  });

  it('switches the first hero slide when the first featured merchandising product has an image', async () => {
    vi.mocked(getMerchandisingFeaturedProducts).mockResolvedValue([
      product({
        id: 'mega',
        slug: 'pokemon-tcg-mega-greninja-ex-premium-collection',
        name: 'Pokémon TCG: Mega Greninja ex Premium Collection',
        imageUrl: '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp',
        imageAlt: 'Pokémon TCG Mega Greninja ex Premium Collection box',
        publicStockState: 'LOW_STOCK',
        freeUkStandardShipping: true,
        customerPurchaseLimit: 1,
      }),
    ]);
    vi.mocked(getMerchandisingLatestProducts).mockResolvedValue([]);
    vi.mocked(getMerchandisingStaffPickProducts).mockResolvedValue([]);

    const data = await getProductionHomepageData();

    expect(data.heroSlides[0]).toMatchObject({
      eyebrow: 'NOW AVAILABLE',
      badges: ['LOW STOCK', 'FREE UK STANDARD DELIVERY', 'LIMIT 1 PER HOUSEHOLD'],
      primaryCta: { label: 'Shop now', href: '/catalogue/pokemon-tcg-mega-greninja-ex-premium-collection' },
      image: { src: '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp' },
    });
  });

  it('falls back to static hero slides and empty product sections when merchandising queries are unavailable', async () => {
    vi.mocked(getMerchandisingFeaturedProducts).mockRejectedValue(new Error('database unavailable'));
    vi.mocked(getMerchandisingLatestProducts).mockRejectedValue(new Error('database unavailable'));
    vi.mocked(getMerchandisingStaffPickProducts).mockRejectedValue(new Error('database unavailable'));

    const data = await getProductionHomepageData();

    expect(data.heroSlides).toEqual(homepageHeroSlides);
    expect(data.featuredProducts).toEqual([]);
    expect(data.latestProducts).toEqual([]);
    expect(data.staffPickProducts).toEqual([]);
  });

  it('deduplicates products by id while preserving first appearance', () => {
    const rows = [product({ id: 'a', name: 'First A' }), product({ id: 'b' }), product({ id: 'a', name: 'Second A' })];

    expect(dedupeProducts(rows).map((item) => item.name)).toEqual(['First A', 'Product One']);
  });
});
