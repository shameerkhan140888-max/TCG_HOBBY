import { describe, expect, it, vi } from 'vitest';
import type { CatalogueProduct } from '@tcg-hobby/types';

vi.mock('@tcg-hobby/database', () => ({
  getCatalogueProducts: vi.fn(),
  getFeaturedCatalogueProducts: vi.fn(),
}));

import {
  dedupeProducts,
  homepageHeroSlides,
  selectHomepageFeaturedProducts,
  selectHomepageNewReleaseProducts,
} from './homepage-data';

function product(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  const base: CatalogueProduct = {
    id: overrides.id ?? 'product-1',
    slug: overrides.slug ?? 'product-one',
    name: overrides.name ?? 'Product One',
    game: overrides.game ?? 'Pokemon',
    description: overrides.description ?? 'A product for collectors.',
    categoryName: overrides.categoryName ?? 'Sealed Product',
    categorySlug: overrides.categorySlug ?? 'sealed-product',
    price: overrides.price ?? { amountMinor: 4999, currency: 'GBP' },
    featured: overrides.featured ?? false,
    inStock: overrides.inStock ?? true,
    stockOnHand: overrides.stockOnHand ?? 10,
    reservedStock: overrides.reservedStock ?? 0,
    supplierName: overrides.supplierName ?? 'Supplier',
    badge: overrides.badge ?? 'Sealed Product',
    imageLabel: overrides.imageLabel ?? 'Booster box',
  };

  return {
    ...base,
    ...(overrides.imageUrl !== undefined ? { imageUrl: overrides.imageUrl } : {}),
    ...(overrides.imageAlt !== undefined ? { imageAlt: overrides.imageAlt } : {}),
    ...(overrides.releaseStatus !== undefined ? { releaseStatus: overrides.releaseStatus } : {}),
    ...(overrides.releaseDate !== undefined ? { releaseDate: overrides.releaseDate } : {}),
    ...(overrides.expectedDispatchAt !== undefined ? { expectedDispatchAt: overrides.expectedDispatchAt } : {}),
    ...(overrides.expectedArrivalAt !== undefined ? { expectedArrivalAt: overrides.expectedArrivalAt } : {}),
    ...(overrides.allocationLimit !== undefined ? { allocationLimit: overrides.allocationLimit } : {}),
    ...(overrides.customerPurchaseLimit !== undefined ? { customerPurchaseLimit: overrides.customerPurchaseLimit } : {}),
    ...(overrides.supplierAllocation !== undefined ? { supplierAllocation: overrides.supplierAllocation } : {}),
    ...(overrides.lowAllocationThreshold !== undefined ? { lowAllocationThreshold: overrides.lowAllocationThreshold } : {}),
    ...(overrides.availabilityMessage !== undefined ? { availabilityMessage: overrides.availabilityMessage } : {}),
    ...(overrides.preorderBadgeLabel !== undefined ? { preorderBadgeLabel: overrides.preorderBadgeLabel } : {}),
    ...(overrides.comingSoonBadgeLabel !== undefined ? { comingSoonBadgeLabel: overrides.comingSoonBadgeLabel } : {}),
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
    const featured = [
      product({ id: 'featured-1', featured: true }),
      product({ id: 'featured-2', featured: true }),
      product({ id: 'preorder-1', releaseStatus: 'PREORDER', featured: true }),
    ];
    const newest = [
      product({ id: 'featured-1' }),
      product({ id: 'new-1' }),
      product({ id: 'new-2' }),
      product({ id: 'new-3' }),
    ];

    const selected = selectHomepageFeaturedProducts(featured, newest);

    expect(selected).toHaveLength(4);
    expect(selected.map((item) => item.id)).toEqual(['featured-1', 'featured-2', 'new-1', 'new-2']);
    expect(new Set(selected.map((item) => item.id)).size).toBe(selected.length);
  });

  it('selects new releases separately without duplicating featured products', () => {
    const selected = selectHomepageNewReleaseProducts(
      [
        product({ id: 'featured-1' }),
        product({ id: 'new-1' }),
        product({ id: 'new-2' }),
        product({ id: 'new-3' }),
        product({ id: 'new-4' }),
        product({ id: 'new-5' }),
      ],
      [product({ id: 'featured-1' })],
    );

    expect(selected.map((item) => item.id)).toEqual(['new-1', 'new-2', 'new-3', 'new-4']);
  });

  it('can include one upcoming product in featured products when there is room', () => {
    const selected = selectHomepageFeaturedProducts(
      [product({ id: 'featured-1', featured: true }), product({ id: 'preorder-1', releaseStatus: 'PREORDER', featured: true })],
      [product({ id: 'new-1' })],
    );

    expect(selected.map((item) => item.id)).toEqual(['featured-1', 'new-1', 'preorder-1']);
  });

  it('deduplicates products by id while preserving first appearance', () => {
    const rows = [product({ id: 'a', name: 'First A' }), product({ id: 'b' }), product({ id: 'a', name: 'Second A' })];

    expect(dedupeProducts(rows).map((item) => item.name)).toEqual(['First A', 'Product One']);
  });
});
