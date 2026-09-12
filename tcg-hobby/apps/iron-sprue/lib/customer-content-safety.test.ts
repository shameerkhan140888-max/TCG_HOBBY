import { describe, expect, it } from 'vitest';
import launchProducts from '../data/launch-products.json';
import type { IronSprueProduct } from './catalogue';
import { customerProductDescription } from './storefront';

const products = launchProducts as IronSprueProduct[];

const prohibitedPublicPhrases = [
  'launch catalogue',
  'launch range',
  'catalogue-confirmed',
  'catalogue confirmed',
  'source data',
  'verified source',
  'Iron Sprue source',
  'not listed unless',
  'manual review',
  'enrichment',
  'placeholder',
  'source material',
  'source information',
  'supplier data',
  'confidence score',
  'factual review',
  'database',
  'seeded',
  'missing data',
  'information unavailable',
  'data not provided',
  'display-kit positioning',
  'display-build positioning',
  'puzzle-object positioning',
  'unverified kit-part claims',
  'product page relying on',
  'omitted uncertain specifications',
  'keeps the current',
] as const;

function publicText(product: IronSprueProduct) {
  return [
    product.name,
    product.shortDescription,
    product.description,
    product.metaDescription,
    product.seoTitle,
    ...(product.features ?? []),
    ...Object.entries(product.specifications ?? {}).flatMap(([key, value]) => [key, String(value)]),
  ]
    .filter(Boolean)
    .join('\n');
}

describe('Iron Sprue public catalogue copy', () => {
  it('does not expose internal catalogue, review or enrichment language', () => {
    const violations = products.flatMap((product) => {
      const text = publicText(product).toLowerCase();
      return prohibitedPublicPhrases
        .filter((phrase) => text.includes(phrase.toLowerCase()))
        .map((phrase) => `${product.sku}: ${phrase}`);
    });

    expect(violations).toEqual([]);
  });

  it('uses customer-facing manufacturer reference language instead of supplier-code labels', () => {
    const publicTextBlob = products.map(publicText).join('\n').toLowerCase();

    expect(publicTextBlob).not.toContain('supplier code');
    expect(publicTextBlob).toContain('manufacturer reference');
  });

  it('strips stale internal PDP positioning language before rendering customer copy', () => {
    const description = customerProductDescription({
      name: 'Back to the Future Part II',
      brand: 'Aoshima',
      category: 'Film & Television Vehicles',
      sku: 'IS-AOS-06437',
      slug: 'aoshima-06437-back-to-the-future-part-ii',
      description: [
        'Back to the Future Part II captures the DeLorean time machine in its Part II form.',
        'Back to the Future Part II keeps the current Aoshima display-kit positioning, but gives the page more useful context around the subject.',
        'It suits builders who want a recognisable automotive or screen-vehicle subject without the product page relying on unverified kit-part claims.',
      ].join(' '),
    } as IronSprueProduct);

    expect(description).toContain('captures the DeLorean time machine');
    expect(description).not.toContain('display-kit positioning');
    expect(description).not.toContain('unverified kit-part claims');
  });

  it('strips stale Pintoo and CubicFun source-positioning sentences before rendering customer copy', () => {
    const description = customerProductDescription({
      name: 'Koi Carp and Lotus',
      brand: 'Pintoo',
      category: 'Vases',
      sku: 'IS-PIN-S1024',
      slug: 'pintoo-s1024-3d-jigsaw-vase-koi-carp-and-lotus',
      description: [
        'Koi Carp and Lotus builds into a decorative vase with a calm floral finish.',
        'Koi Carp and Lotus keeps the current Pintoo puzzle-object positioning while avoiding omitted uncertain specifications.',
        'Use manufacturer and authorised distributor information as factual source material only.',
        'It is a display puzzle for builders who want a finished object for the shelf.',
      ].join(' '),
    } as IronSprueProduct);

    expect(description).toContain('decorative vase');
    expect(description).toContain('finished object');
    expect(description).not.toContain('puzzle-object positioning');
    expect(description).not.toContain('omitted uncertain specifications');
    expect(description).not.toContain('factual source material');
  });

  it('uses plain customer-facing scale wording in rendered PDP copy', () => {
    const description = customerProductDescription({
      name: 'Pagani Zonda F',
      brand: 'Aoshima',
      category: 'Model Kits',
      sku: 'IS-AOS-05603',
      slug: 'aoshima-05603-pagani-zonda-f-05',
      description: 'Pagani Zonda F is a 1:24 Aoshima model kit. The canonical scale is 1:24.',
    } as IronSprueProduct);

    expect(description).toContain('Scale: 1:24.');
    expect(description.toLowerCase()).not.toContain('canonical scale');
  });
});
