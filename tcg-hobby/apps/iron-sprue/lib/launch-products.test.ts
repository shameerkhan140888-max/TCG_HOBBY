import { describe, expect, it } from 'vitest';
import launchProducts from '../data/launch-products.json';
import { deriveBrandsWeStock, productPriceMinor, type IronSprueProduct } from './catalogue';

const products = launchProducts as IronSprueProduct[];

describe('Iron Sprue PO-derived launch products', () => {
  it('contains more than 50 genuine stocked Iron Sprue product lines', () => {
    expect(products).toHaveLength(67);
    expect(products.every((product) => product.storeCode === 'IRON_SPRUE')).toBe(true);
    expect(products.every((product) => product.stockQuantity > 0)).toBe(true);
    expect(products.reduce((total, product) => total + product.stockQuantity, 0)).toBe(183);
  });

  it('preserves expected launch brands without TCG catalogue leakage', () => {
    const brands = Array.from(new Set(products.map((product) => product.brand))).sort();
    expect(brands).toEqual(['Aoshima', 'Deluxe Materials', 'Expo Tools', 'OcCre Creations', 'Pintoo', 'Tasma']);
    expect(products.every((product) => product.sku.startsWith('IS-'))).toBe(true);
    expect(products.every((product) => product.category !== 'Trading Cards')).toBe(true);
  });

  it('has VAT-inclusive launch prices for every product', () => {
    expect(products.every((product) => productPriceMinor(product) > 0)).toBe(true);
    expect(products.every((product) => product.vatRate === 20)).toBe(true);
  });

  it('derives brands we stock only from published Iron Sprue products', () => {
    const brands = deriveBrandsWeStock([
      ...products,
      { ...products[0]!, sku: 'TCG-1', storeCode: 'TCG_HOBBY', brand: 'Pokemon' },
      { ...products[0]!, sku: 'IS-HIDDEN', brand: 'Hidden Brand', published: false },
    ]);

    expect(brands.map((brand) => brand.name)).toContain('Aoshima');
    expect(brands.map((brand) => brand.name)).not.toContain('Pokemon');
    expect(brands.map((brand) => brand.name)).not.toContain('Hidden Brand');
    expect(brands.every((brand) => brand.href.startsWith('/shop?brand='))).toBe(true);
    expect(brands.every((brand) => brand.approvalStatus === 'TEXT_APPROVED')).toBe(true);
  });
});
