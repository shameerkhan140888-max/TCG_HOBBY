import { describe, expect, it } from 'vitest';
import finalManifest from '../data/final-launch-catalogue-manifest.json';
import launchProducts from '../data/launch-products.json';
import { deriveBrandsWeStock, productPriceMinor, type IronSprueProduct } from './catalogue';

const products = launchProducts as IronSprueProduct[];

describe('Iron Sprue PO-derived launch products', () => {
  it('contains the final workbook-backed Iron Sprue launch range', () => {
    expect(products).toHaveLength(81);
    expect(products.every((product) => product.storeCode === 'IRON_SPRUE')).toBe(true);
    expect(products.every((product) => product.stockQuantity > 0)).toBe(true);
    expect(products.reduce((total, product) => total + product.stockQuantity, 0)).toBe(256);
    expect(finalManifest.summary.saleableSkuCount).toBe(81);
    expect(finalManifest.summary.physicalUnitsSupplied).toBe(256);
  });

  it('preserves expected launch brands without TCG catalogue leakage', () => {
    const brands = Array.from(new Set(products.map((product) => product.brand))).sort();
    expect(brands).toEqual(['Aoshima', 'CubicFun', 'Deluxe Materials', 'Expo Tools', 'OcCre Creations', 'Pintoo', 'Tasma']);
    expect(products.every((product) => product.sku.startsWith('IS-'))).toBe(true);
    expect(products.every((product) => product.category !== 'Trading Cards')).toBe(true);
  });

  it('has VAT-inclusive launch prices for every product', () => {
    expect(products.every((product) => productPriceMinor(product) > 0)).toBe(true);
    expect(products.every((product) => product.vatRate === 20)).toBe(true);
    expect(products.every((product) => product.published === false)).toBe(true);
    expect(products.every((product) => product.assetContentStatus)).toBe(true);
  });

  it('derives brands we stock only from published Iron Sprue products', () => {
    const brands = deriveBrandsWeStock([
      ...products.map((product) => ({ ...product, published: true })),
      { ...products[0]!, sku: 'TCG-1', storeCode: 'TCG_HOBBY', brand: 'Pokemon' },
      { ...products[0]!, sku: 'IS-HIDDEN', brand: 'Hidden Brand', published: false },
    ]);

    expect(brands.map((brand) => brand.name)).toContain('Aoshima');
    expect(brands.map((brand) => brand.name)).not.toContain('Pokemon');
    expect(brands.map((brand) => brand.name)).not.toContain('Hidden Brand');
    expect(brands.every((brand) => brand.href.startsWith('/shop?brand='))).toBe(true);
    expect(brands.every((brand) => brand.approvalStatus === 'TEXT_APPROVED')).toBe(true);
  });

  it('keeps workbook warning rows out of publication until verified', () => {
    const reviewRequired = finalManifest.products.filter((product) => product.publicationState === 'REVIEW_REQUIRED');

    expect(reviewRequired).toHaveLength(5);
    expect(reviewRequired.map((product) => product.supplierSku)).toEqual(
      expect.arrayContaining(['06347', 'TW-01', 'C119H', 'MC093H', 'CARTON-24-SNAP-KNIFE']),
    );
    expect(reviewRequired.every((product) => product.validationWarnings.length > 0)).toBe(true);
  });

  it('preserves provisional PO source links for media tracing where available', () => {
    const linkedProducts = products.filter((product) => product.sourceMediaLinks && product.sourceMediaLinks.length > 0);

    expect(finalManifest.summary.sourceLinkedRows).toBe(43);
    expect(finalManifest.summary.sourceLinkRequiredRows).toBe(38);
    expect(linkedProducts).toHaveLength(43);
    expect(linkedProducts.every((product) => product.sourceMediaLinks?.every((link) => link.url.startsWith('https://')))).toBe(true);
  });
});
