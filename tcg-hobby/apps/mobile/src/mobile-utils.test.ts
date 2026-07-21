import { describe, expect, it } from 'vitest';
import type { PublicProductSummary } from '@tcg-hobby/types';
import { buildCatalogueQuery, isTrustedCheckoutUrl, mergeUniqueProducts, normaliseHttpOrigin, stockLabel } from './mobile-utils';

function product(id: string): PublicProductSummary {
  return { id, slug: id, name: id, brand: null, game: 'Pokemon TCG', category: { name: 'Pokemon', slug: 'pokemon' }, productType: null, price: { amountMinor: 499, currency: 'GBP' }, stockState: 'IN_STOCK', purchasable: true, featured: false, releaseStatus: 'RELEASED', releaseDate: null, image: null, purchaseLimit: null, freeUkStandardShipping: false, availabilityMessage: null };
}

describe('mobile commerce utilities', () => {
  it('normalises valid public origins and rejects unsafe schemes', () => {
    expect(normaliseHttpOrigin('https://api.tcg-hobby.co.uk/path', 'API')).toBe('https://api.tcg-hobby.co.uk');
    expect(() => normaliseHttpOrigin('file:///secret', 'API')).toThrow('HTTP or HTTPS');
  });

  it('serialises every catalogue filter without floating application state', () => {
    const query = new URLSearchParams(buildCatalogueQuery({ search: 'greninja', game: 'pokemon', productType: 'sealed', set: '', language: 'english', category: 'pokemon', sort: 'newest', page: 2, pageSize: 20 }));
    expect(Object.fromEntries(query)).toEqual({ search: 'greninja', game: 'pokemon', productType: 'sealed', set: '', language: 'english', category: 'pokemon', sort: 'newest', page: '2', pageSize: '20' });
  });

  it('deduplicates paginated products while preserving stable order', () => {
    expect(mergeUniqueProducts([product('a'), product('b')], [product('b'), product('c')]).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('maps public stock states without exposing quantities', () => {
    expect(stockLabel('LOW_STOCK')).toBe('Low stock');
    expect(stockLabel('OUT_OF_STOCK')).toBe('Out of stock');
  });

  it('accepts Stripe or the configured storefront and rejects untrusted checkout URLs', () => {
    expect(isTrustedCheckoutUrl('https://checkout.stripe.com/c/pay/test', 'https://tcg-hobby.co.uk')).toBe(true);
    expect(isTrustedCheckoutUrl('https://tcg-hobby.co.uk/checkout', 'https://tcg-hobby.co.uk')).toBe(true);
    expect(isTrustedCheckoutUrl('https://example.com/checkout', 'https://tcg-hobby.co.uk')).toBe(false);
  });
});
