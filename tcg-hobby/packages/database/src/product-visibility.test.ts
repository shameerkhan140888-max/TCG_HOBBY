import { describe, expect, it } from 'vitest';
import {
  getStorefrontListingProductWhere,
  getStorefrontPublicProductWhere,
  isProductPubliclyRouteable,
  isProductVisibleInStorefrontListings,
} from './product-visibility';

const baseProduct = {
  published: true,
  lifecycleState: 'PUBLISHED',
  archivedAt: null,
  releaseStatus: 'RELEASED',
  hideWhenOutOfStock: false,
  inventory: { stockOnHand: 3, reservedStock: 0 },
};

describe('storefront product visibility', () => {
  it('keeps in-stock public products visible in listings', () => {
    expect(isProductVisibleInStorefrontListings(baseProduct)).toBe(true);
  });

  it('keeps out-of-stock products visible in listings by default', () => {
    expect(
      isProductVisibleInStorefrontListings({
        ...baseProduct,
        inventory: { stockOnHand: 0, reservedStock: 0 },
        hideWhenOutOfStock: false,
      }),
    ).toBe(true);
  });

  it('hides out-of-stock products from listings when the product opts in', () => {
    expect(
      isProductVisibleInStorefrontListings({
        ...baseProduct,
        inventory: { stockOnHand: 1, reservedStock: 1 },
        hideWhenOutOfStock: true,
      }),
    ).toBe(false);
  });

  it('does not make unpublished or archived products visible', () => {
    expect(isProductVisibleInStorefrontListings({ ...baseProduct, published: false })).toBe(false);
    expect(isProductVisibleInStorefrontListings({ ...baseProduct, archivedAt: new Date() })).toBe(false);
    expect(isProductVisibleInStorefrontListings({ ...baseProduct, lifecycleState: 'HIDDEN' })).toBe(false);
    expect(isProductVisibleInStorefrontListings({ ...baseProduct, releaseStatus: 'ARCHIVED' })).toBe(false);
  });

  it('keeps direct route eligibility separate from the listing hide-at-zero rule', () => {
    expect(
      isProductPubliclyRouteable({
        published: true,
        lifecycleState: 'PUBLISHED',
        archivedAt: null,
        releaseStatus: 'RELEASED',
      }),
    ).toBe(true);
  });

  it('builds the normal public where clause once for catalogue and category queries', () => {
    expect(getStorefrontPublicProductWhere()).toEqual({
      published: true,
      lifecycleState: 'PUBLISHED',
      archivedAt: null,
      releaseStatus: { not: 'ARCHIVED' },
    });
  });

  it('builds the listing where clause without making stock the only visibility signal', () => {
    expect(getStorefrontListingProductWhere()).toEqual({
      AND: [
        {
          published: true,
          lifecycleState: 'PUBLISHED',
          archivedAt: null,
          releaseStatus: { not: 'ARCHIVED' },
        },
        {
          OR: [
            { hideWhenOutOfStock: false },
            {
              inventory: {
                is: {
                  stockOnHand: { gt: 0 },
                },
              },
            },
          ],
        },
      ],
    });
  });
});
