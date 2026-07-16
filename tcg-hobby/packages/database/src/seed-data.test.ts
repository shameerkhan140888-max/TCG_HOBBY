import { describe, expect, it } from 'vitest';
import {
  MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG,
  isCatalogueProductVisible,
  seedInventory,
  seedProductImages,
  seedProducts,
  seedCategories,
  toCatalogueCategory,
  toMoney,
} from './seed-data';

describe('database seed data', () => {
  it('builds catalogue categories with product counts in the UI shape', () => {
    const category = toCatalogueCategory(seedCategories[0]!, 3);

    expect(category).toEqual({
      id: 'cat-sealed',
      name: 'Sealed Product',
      slug: 'sealed-product',
      description: 'Booster boxes, bundles, and collector products ready for shelf display.',
      sortOrder: 1,
      productCount: 3,
    });
  });

  it('creates money objects in minor units', () => {
    expect(toMoney(11999)).toEqual({ amountMinor: 11999, currency: 'GBP' });
  });

  it('marks seeded published products as visible', () => {
    expect(isCatalogueProductVisible(seedProducts[0]!)).toBe(true);
  });

  it('includes preorder release metadata in the seed set', () => {
    expect(seedProducts.some((product) => product.releaseStatus === 'PREORDER')).toBe(true);
  });

  it('includes the Mega Greninja launch product with editable production image paths', () => {
    const product = seedProducts.find((item) => item.slug === MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG);

    expect(product).toMatchObject({
      name: 'Pokémon TCG: Mega Greninja ex Premium Collection',
      game: 'Pokémon TCG',
      priceMinor: 4999,
      featured: true,
      published: true,
      customerPurchaseLimit: 1,
      categorySlug: 'sealed-product',
      condition: 'SEALED',
    });
    expect(seedInventory.find((item) => item.productSlug === MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG)).toMatchObject({
      stockOnHand: 3,
      reservedStock: 0,
    });
    expect(seedProductImages.filter((image) => image.productSlug === MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG).map((image) => image.url)).toEqual([
      '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp',
      '/products/pokemon/mega-greninja-ex-premium-collection/booster-packs.webp',
      '/products/pokemon/mega-greninja-ex-premium-collection/promo-cards.webp',
      '/products/pokemon/mega-greninja-ex-premium-collection/rear-packaging.webp',
    ]);
    expect(seedProductImages.filter((image) => image.productSlug === MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG).map((image) => image.altText)).toEqual([
      'Pokémon TCG Mega Greninja ex Premium Collection box',
      'Eight Pokémon TCG booster packs included in the Mega Greninja ex Premium Collection',
      'Mega Greninja ex promotional card and oversized lenticular promotional card',
      'Rear packaging of the Pokémon TCG Mega Greninja ex Premium Collection',
    ]);
  });
});
