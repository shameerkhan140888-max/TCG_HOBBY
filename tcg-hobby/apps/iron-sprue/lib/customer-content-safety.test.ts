import { describe, expect, it } from 'vitest';
import launchProducts from '../data/launch-products.json';
import type { IronSprueProduct } from './catalogue';

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
});
