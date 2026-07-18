import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CatalogueProduct } from '@tcg-hobby/types';
import { ProductCard } from '@tcg-hobby/ui';
import { describe, expect, it } from 'vitest';

function product(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    id: 'prod-test',
    slug: 'test-product',
    name: 'Test Product',
    brand: 'TCG Hobby',
    game: 'Pokemon TCG',
    productType: 'Booster Pack',
    description: 'A routeable catalogue product.',
    categoryName: 'Pokemon TCG',
    categorySlug: 'pokemon-tcg',
    price: { amountMinor: 499, currency: 'GBP' },
    featured: false,
    homepagePriority: null,
    heroFeatured: false,
    lifecycleState: 'PUBLISHED',
    inStock: true,
    stockOnHand: 10,
    reservedStock: 0,
    supplierName: 'Unassigned',
    badge: 'Pokemon TCG',
    imageLabel: 'Product image',
    imageUrl: null,
    imageAlt: null,
    heroImageUrl: null,
    vatRate: 20,
    freeUkStandardShipping: false,
    shippingPromotionProductOnly: true,
    releaseStatus: 'RELEASED',
    releaseDate: null,
    expectedDispatchAt: null,
    expectedArrivalAt: null,
    allocationLimit: null,
    customerPurchaseLimit: null,
    supplierAllocation: null,
    lowAllocationThreshold: null,
    availabilityMessage: null,
    preorderBadgeLabel: null,
    comingSoonBadgeLabel: null,
    seoTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
    noindex: false,
    ...overrides,
  };
}

describe('ProductCard image rendering', () => {
  it('renders a product image when the storefront-safe product includes one', () => {
    const markup = renderToStaticMarkup(
      <ProductCard
        product={product({
          imageUrl: '/products/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection/primary.webp',
          imageAlt: 'Pokemon TCG Mega Greninja ex Premium Collection box',
        })}
        href="/catalogue/pokemon-tcg-mega-greninja-ex-premium-collection"
      />,
    );

    expect(markup).toContain('src="/products/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection/primary.webp"');
    expect(markup).toContain('alt="Pokemon TCG Mega Greninja ex Premium Collection box"');
    expect(markup).not.toContain('Product image unavailable');
  });

  it('renders featured and stock badges below the media area before purchase actions', () => {
    const markup = renderToStaticMarkup(
      <ProductCard
        product={product({
          featured: true,
          stockOnHand: 3,
          imageUrl: '/products/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection/primary.webp',
        })}
        href="/catalogue/pokemon-tcg-mega-greninja-ex-premium-collection"
        actionSlot={<button type="button">Add to basket</button>}
      />,
    );

    const mediaIndex = markup.indexOf('src="/products/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection/primary.webp"');
    const featuredIndex = markup.indexOf('Featured');
    const lowStockIndex = markup.indexOf('LOW STOCK');
    const actionIndex = markup.indexOf('Add to basket');

    expect(mediaIndex).toBeGreaterThan(-1);
    expect(featuredIndex).toBeGreaterThan(mediaIndex);
    expect(lowStockIndex).toBeGreaterThan(mediaIndex);
    expect(featuredIndex).toBeLessThan(actionIndex);
    expect(lowStockIndex).toBeLessThan(actionIndex);
  });

  it('renders the shared branded placeholder when no image is configured', () => {
    const markup = renderToStaticMarkup(<ProductCard product={product()} href="/catalogue/test-product" />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Product image unavailable"');
    expect(markup).toContain('Product image unavailable');
    expect(markup).not.toContain('<img');
  });
});
