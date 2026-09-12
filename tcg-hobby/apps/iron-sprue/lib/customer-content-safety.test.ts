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
  'unverified kit-part claims',
  'product page relying on',
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
