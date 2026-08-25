import { afterEach, describe, expect, it } from 'vitest';
import type { CatalogueProduct, CatalogueProductDetail } from '@tcg-hobby/types';
import { publicStockState, toPublicProductDetail, toPublicProductSummary } from './public-commerce.service.js';

const originalPublicCommerceStoreCode = process.env.PUBLIC_COMMERCE_STORE_CODE;
const originalIronSpruePublicMediaBase = process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL;
const originalPublicStorefrontUrl = process.env.PUBLIC_STOREFRONT_URL;

afterEach(() => {
  if (originalPublicCommerceStoreCode === undefined) delete process.env.PUBLIC_COMMERCE_STORE_CODE;
  else process.env.PUBLIC_COMMERCE_STORE_CODE = originalPublicCommerceStoreCode;
  if (originalIronSpruePublicMediaBase === undefined) delete process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL;
  else process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = originalIronSpruePublicMediaBase;
  if (originalPublicStorefrontUrl === undefined) delete process.env.PUBLIC_STOREFRONT_URL;
  else process.env.PUBLIC_STOREFRONT_URL = originalPublicStorefrontUrl;
});

function product(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    id: 'product-1', sku: 'PRODUCT-1', slug: 'test-product', name: 'Test Product', brand: 'TCG Hobby', game: 'Pokemon TCG',
    productType: 'Booster Pack', description: 'Description', categoryName: 'Pokemon TCG', categorySlug: 'pokemon-tcg',
    price: { amountMinor: 499, currency: 'GBP' }, featured: false, inStock: true, stockOnHand: 3, reservedStock: 0,
    supplierName: 'Private Supplier', badge: 'Badge', imageLabel: 'Test', imageUrl: '/products/test.webp', imageAlt: 'Test product box',
    releaseStatus: 'RELEASED', ...overrides,
  };
}

function detailProduct(): CatalogueProductDetail {
  return {
    ...product(),
    sku: 'PRODUCT-1',
    setName: null,
    condition: 'SEALED',
    longDescription: 'Long description',
    contents: ['1 promotional card', '8 booster packs'],
    searchText: 'test product',
    supplierSku: 'PRIVATE-SUPPLIER-SKU',
    leadTimeDays: 1,
    images: [],
    relatedProducts: [],
  };
}

describe('public commerce projection', () => {
  it('derives stable public stock states', () => {
    expect(publicStockState(0)).toBe('OUT_OF_STOCK');
    expect(publicStockState(3)).toBe('LOW_STOCK');
    expect(publicStockState(4)).toBe('IN_STOCK');
  });

  it('returns storefront-safe data without exact stock or supplier details', () => {
    const result = toPublicProductSummary(product());
    expect(result.stockState).toBe('LOW_STOCK');
    expect(result.sku).toBe('PRODUCT-1');
    expect(result.availableQuantity).toBe(3);
    expect(result.image?.url).toBe('https://tcg-hobby.co.uk/products/test.webp');
    expect(result).not.toHaveProperty('stockOnHand');
    expect(result).not.toHaveProperty('reservedStock');
    expect(result).not.toHaveProperty('supplierName');
  });

  it('serves Iron Sprue product media through the same-origin storefront media route', () => {
    process.env.PUBLIC_COMMERCE_STORE_CODE = 'IRON_SPRUE';
    process.env.PUBLIC_STOREFRONT_URL = 'https://staging.ironsprue.co.uk';
    process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL = 'https://media.ironsprue.co.uk';

    const result = toPublicProductSummary(product({
      game: 'Iron Sprue',
      imageUrl: '/media/iron-sprue/products/is-aos-05628/image-2/iron-sprue-image-2-acf115ef37eb.png',
    }));

    expect(result.image?.url).toBe(
      '/media/iron-sprue/products/is-aos-05628/image-2/iron-sprue-image-2-acf115ef37eb.png',
    );
  });

  it('rewrites stale Iron Sprue media-origin product URLs through the same-origin storefront media route', () => {
    process.env.PUBLIC_COMMERCE_STORE_CODE = 'IRON_SPRUE';
    process.env.PUBLIC_STOREFRONT_URL = 'https://staging.ironsprue.co.uk';

    const result = toPublicProductSummary(product({
      game: 'Iron Sprue',
      imageUrl: 'https://media.ironsprue.co.uk/products/is-pin-s1025/image-2/iron-sprue-image-2-4d59ae9d34d5.png',
    }));

    expect(result.image?.url).toBe(
      '/media/iron-sprue/products/is-pin-s1025/image-2/iron-sprue-image-2-4d59ae9d34d5.png',
    );
  });

  it('normalizes absolute staging media route URLs to same-origin paths', () => {
    process.env.PUBLIC_COMMERCE_STORE_CODE = 'IRON_SPRUE';

    const result = toPublicProductSummary(product({
      game: 'Iron Sprue',
      imageUrl: 'https://staging.ironsprue.co.uk/media/iron-sprue/products/is-cub-mc133h/image-2/iron-sprue-image-2-37d0a60e4ffb.png',
    }));

    expect(result.image?.url).toBe(
      '/media/iron-sprue/products/is-cub-mc133h/image-2/iron-sprue-image-2-37d0a60e4ffb.png',
    );
  });

  it('does not mark unreleased products as purchasable', () => {
    expect(toPublicProductSummary(product({ releaseStatus: 'COMING_SOON' })).purchasable).toBe(false);
  });

  it('includes customer-facing contents in the public product detail projection', () => {
    const result = toPublicProductDetail(detailProduct());
    expect(result.sku).toBe('PRODUCT-1');
    expect(result.contents).toEqual(['1 promotional card', '8 booster packs']);
    expect(result).not.toHaveProperty('verifiedContents');
  });
});
