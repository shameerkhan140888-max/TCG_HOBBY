import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MerchandisingRecommendation } from '@tcg-hobby/database';
import { describe, expect, it, vi } from 'vitest';
import { ProductMerchandisingRail } from './product-merchandising-rail';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('../lib/wishlist', () => ({
  toggleWishlistAction: vi.fn(),
}));

vi.mock('./cart-actions', () => ({
  AddToCartButton: ({ productId, returnTo }: { productId: string; returnTo: string }) => (
    <form action="/cart">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit">Add to basket</button>
    </form>
  ),
}));

function recommendation(overrides: Partial<MerchandisingRecommendation> = {}): MerchandisingRecommendation {
  return {
    id: 'prod-sleeves',
    slug: 'premium-card-sleeves',
    name: 'Premium Card Sleeves',
    imageUrl: '/products/accessories/premium-card-sleeves.webp',
    imageAlt: 'Premium card sleeves for trading cards',
    price: { amountMinor: 599, currency: 'GBP' },
    publicStockState: 'LOW_STOCK',
    gameLabel: 'Accessories',
    categoryLabel: 'Accessories',
    categorySlug: 'accessories',
    freeUkStandardShipping: true,
    customerPurchaseLimit: 2,
    wishlistEligible: true,
    basketEligible: true,
    strategyId: 'accessories',
    ...overrides,
  };
}

describe('ProductMerchandisingRail', () => {
  it('renders nothing when the merchandising engine returns no eligible products', () => {
    const markup = renderToStaticMarkup(
      <ProductMerchandisingRail
        products={[]}
        placement="PRODUCT_RELATED"
        sourceProductId="source-product"
        authenticated={false}
        wishlistProductIds={[]}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders storefront-safe recommendation cards without exposing exact stock or internal data', () => {
    const markup = renderToStaticMarkup(
      <ProductMerchandisingRail
        products={[recommendation()]}
        placement="PRODUCT_RELATED"
        sourceProductId="source-product"
        authenticated
        wishlistProductIds={[]}
      />,
    );

    expect(markup).toContain('You may also like');
    expect(markup).toContain('data-merchandising-placement="PRODUCT_RELATED"');
    expect(markup).toContain('data-source-product-id="source-product"');
    expect(markup).toContain('data-recommended-product-id="prod-sleeves"');
    expect(markup).toContain('data-recommendation-strategy="accessories"');
    expect(markup).toContain('Premium Card Sleeves');
    expect(markup).toContain('LOW STOCK');
    expect(markup).toContain('FREE UK DELIVERY');
    expect(markup).toContain('LIMIT 2');
    expect(markup).toContain('5.99');
    expect(markup).toContain('Add to basket');
    expect(markup).toContain('aria-label="Add to wishlist"');
    expect(markup).not.toContain('3 available');
    expect(markup).not.toContain('Only 3');
    expect(markup).not.toContain('supplier');
  });
});
