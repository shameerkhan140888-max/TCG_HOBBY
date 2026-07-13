import { describe, expect, it, vi } from 'vitest';
import type { CatalogueCategory, CatalogueProduct, ReleaseSummary } from '@tcg-hobby/types';

vi.mock('@tcg-hobby/database', () => ({
  getCatalogueCategories: vi.fn(),
  getCatalogueProducts: vi.fn(),
  getFeaturedCatalogueProducts: vi.fn(),
  getComingSoonHubData: vi.fn(),
}));

import {
  buildHotProducts,
  buildNewsItems,
  buildShopGameCategories,
  dedupeProducts,
  selectFeaturedProducts,
  selectNewReleaseProducts,
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

function category(overrides: Partial<CatalogueCategory> = {}): CatalogueCategory {
  return {
    id: overrides.id ?? 'cat-sealed',
    name: overrides.name ?? 'Sealed Product',
    slug: overrides.slug ?? 'sealed-product',
    description: overrides.description ?? 'Sealed products.',
    sortOrder: overrides.sortOrder ?? 1,
    productCount: overrides.productCount ?? 1,
  };
}

function release(overrides: Partial<ReleaseSummary> = {}): ReleaseSummary {
  return {
    id: overrides.id ?? 'release-1',
    name: overrides.name ?? 'Release One',
    slug: overrides.slug ?? 'release-one',
    brand: overrides.brand ?? 'Pokemon',
    game: overrides.game ?? 'Pokemon',
    categorySlug: overrides.categorySlug ?? 'sealed-product',
    categoryName: overrides.categoryName ?? 'Sealed Product',
    releaseDate: overrides.releaseDate ?? '2026-08-01T00:00:00.000Z',
    expectedDispatchAt: overrides.expectedDispatchAt ?? null,
    expectedArrivalAt: overrides.expectedArrivalAt ?? null,
    announcementText: overrides.announcementText ?? 'A real release announcement.',
    releaseNotes: overrides.releaseNotes ?? null,
    visible: overrides.visible ?? true,
    featuredOnHomepage: overrides.featuredOnHomepage ?? false,
    supplierName: overrides.supplierName ?? 'Supplier',
    productCount: overrides.productCount ?? 1,
    preorderProductCount: overrides.preorderProductCount ?? 0,
    comingSoonProductCount: overrides.comingSoonProductCount ?? 1,
    lowAllocationCount: overrides.lowAllocationCount ?? 0,
    products: overrides.products ?? [],
  };
}

describe('homepage data selection', () => {
  it('builds valid shop category links without requiring matching products for every tile', () => {
    const categories = buildShopGameCategories([category({ name: 'Accessories', slug: 'accessories' })], [
      product({ game: 'Magic: The Gathering', id: 'magic-1' }),
    ]);

    expect(categories).toHaveLength(6);
    expect(categories.every((item) => item.href.startsWith('/catalogue'))).toBe(true);
    expect(categories.find((item) => item.name === 'Magic: The Gathering')?.available).toBe(true);
    expect(categories.find((item) => item.name === 'Disney Lorcana')?.available).toBe(false);
    expect(categories.map((item) => item.href).join(' ')).not.toContain('search=');
  });

  it('selects released new products and excludes preorder-only rows', () => {
    const rows = [
      product({ id: 'new-1', releaseStatus: 'RELEASED' }),
      product({ id: 'preorder-1', releaseStatus: 'PREORDER' }),
      product({ id: 'new-2' }),
    ];

    expect(selectNewReleaseProducts(rows).map((item) => item.id)).toEqual(['new-1', 'new-2']);
  });

  it('filters featured duplicates already shown in new releases', () => {
    const rows = [product({ id: 'new-1' }), product({ id: 'featured-1' })];

    expect(selectFeaturedProducts(rows, new Set(['new-1']))).toEqual([rows[1]]);
  });

  it('deduplicates products by id while preserving first appearance', () => {
    const rows = [product({ id: 'a', name: 'First A' }), product({ id: 'b' }), product({ id: 'a', name: 'Second A' })];

    expect(dedupeProducts(rows).map((item) => item.name)).toEqual(['First A', 'Product One']);
  });

  it('builds deterministic hot products without fabricated analytics', () => {
    const rows = [
      product({ id: 'standard', featured: false, stockOnHand: 2 }),
      product({ id: 'featured', featured: true, stockOnHand: 1 }),
      product({ id: 'oos', inStock: false, stockOnHand: 0 }),
    ];

    const hotProducts = buildHotProducts(rows);

    expect(hotProducts.map((item) => item.product.id)).toEqual(['featured', 'standard']);
    expect(hotProducts[0]?.badge).toBe('Popular');
    expect(hotProducts.map((item) => item.reason).join(' ')).toContain('deterministic');
  });

  it('builds news items from real release announcements', () => {
    const items = buildNewsItems([release({ name: 'August Wave', brand: 'One Piece Card Game' })]);

    expect(items).toEqual([
      expect.objectContaining({
        title: 'August Wave',
        label: 'One Piece Card Game',
        href: '/releases',
      }),
    ]);
  });
});
