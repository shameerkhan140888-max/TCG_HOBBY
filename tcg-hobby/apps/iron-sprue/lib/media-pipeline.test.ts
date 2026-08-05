import { describe, expect, it } from 'vitest';
import {
  createIronSprueMediaPlan,
  IRON_SPRUE_MEDIA_DOMAIN,
  IRON_SPRUE_MEDIA_PREFIXES,
  IRON_SPRUE_PRODUCT_MEDIA_BUCKET,
  IRON_SPRUE_PRODUCT_MEDIA_STAGES,
  IRON_SPRUE_WORKSHOP_IDENTITY,
} from './media-pipeline';

const product = {
  sku: 'IS-TAS06348',
  slug: 'aoshima-lamborghini-aventador-green',
  brand: 'Aoshima',
  name: 'Aoshima Lamborghini Aventador Green',
};

describe('Iron Sprue product media pipeline', () => {
  it('defines the approved permanent image stages for each launch product', () => {
    expect(IRON_SPRUE_PRODUCT_MEDIA_STAGES.map((stage) => stage.kind)).toEqual([
      'manufacturer-original',
      'catalogue-white',
      'completed-render',
      'workshop-photography',
      'supporting-workshop',
      'hero-artwork',
    ]);
    expect(IRON_SPRUE_PRODUCT_MEDIA_STAGES.filter((stage) => stage.required)).toHaveLength(5);
    expect(IRON_SPRUE_PRODUCT_MEDIA_STAGES.every((stage) => stage.adminEditable)).toBe(true);
  });

  it('builds product media keys only inside the dedicated Iron Sprue R2 bucket namespace', () => {
    const plan = createIronSprueMediaPlan(product, {
      bucketName: IRON_SPRUE_PRODUCT_MEDIA_BUCKET,
      publicBaseUrl: `https://${IRON_SPRUE_MEDIA_DOMAIN}`,
    });

    expect(plan).toHaveLength(6);
    expect(plan.every((item) => item.keyPrefix.startsWith('products/is-tas06348-aoshima-lamborghini-aventador-green/'))).toBe(
      true,
    );
    expect(plan.every((item) => item.publicUrlPrefix?.startsWith(`https://${IRON_SPRUE_MEDIA_DOMAIN}/products/`))).toBe(true);
    expect(plan.every((item) => item.responsiveWidths.includes(1280))).toBe(true);
  });

  it('keeps the future R2 object-prefix strategy explicit without creating folders', () => {
    expect(IRON_SPRUE_MEDIA_PREFIXES.incomingProduct(product.sku)).toBe('incoming/products/is-tas06348/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.archiveOriginal(product.sku)).toBe('archive/products/is-tas06348/original/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.processedCatalogue(product.sku)).toBe('processed/products/is-tas06348/catalogue/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.processedCompleted(product.sku)).toBe('processed/products/is-tas06348/completed/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.processedWorkshop(product.sku)).toBe('processed/products/is-tas06348/workshop/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.processedLifestyle(product.sku)).toBe('processed/products/is-tas06348/lifestyle/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.publishedProduct(product.sku)).toBe('published/products/is-tas06348/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.marketingHeroes).toBe('marketing/heroes/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.brandLogos).toBe('brands/logos/');
    expect(IRON_SPRUE_MEDIA_PREFIXES.categories).toBe('categories/');
  });

  it('can plan private R2 upload work before a public media domain exists', () => {
    const plan = createIronSprueMediaPlan(product, {
      bucketName: IRON_SPRUE_PRODUCT_MEDIA_BUCKET,
    });

    expect(plan).toHaveLength(6);
    expect(plan.every((item) => item.keyPrefix.startsWith('products/is-tas06348-aoshima-lamborghini-aventador-green/'))).toBe(
      true,
    );
    expect(plan.every((item) => item.publicUrlPrefix === undefined)).toBe(true);
  });

  it('fails closed when a plan is requested for any non-Iron Sprue media bucket', () => {
    expect(() =>
      createIronSprueMediaPlan(product, {
        bucketName: 'tcg-hobby-media',
        publicBaseUrl: `https://${IRON_SPRUE_MEDIA_DOMAIN}`,
      }),
    ).toThrow(/iron-sprue-product-media/);
  });

  it('keeps workshop photography and hero artwork as separate replaceable admin assets', () => {
    expect(IRON_SPRUE_WORKSHOP_IDENTITY.playmat).toMatch(/cutting playmat/i);
    expect(IRON_SPRUE_WORKSHOP_IDENTITY.foamexDisplay).toMatch(/foamex display/i);

    const workshop = IRON_SPRUE_PRODUCT_MEDIA_STAGES.find((stage) => stage.kind === 'workshop-photography');
    const hero = IRON_SPRUE_PRODUCT_MEDIA_STAGES.find((stage) => stage.kind === 'hero-artwork');

    expect(workshop?.description).toContain('playmat');
    expect(hero?.description).toContain('HTML/CSS');
    expect(hero?.description).not.toContain('raw packaging');
  });
});
