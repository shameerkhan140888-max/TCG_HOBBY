import { describe, expect, it } from 'vitest';
import { buildIronSprueImportedImageKey, matchDistributorRecords, sanitizeDistributorHtml, validateDistributorImageSource } from './distributor-content';
import type { IronSprueProduct } from './catalogue';

const product: IronSprueProduct = {
  storeCode: 'IRON_SPRUE',
  sku: 'IS-AOS-05627',
  supplierSku: '05627',
  slug: 'aoshima-05627',
  name: 'Aoshima Toyota 2000GT',
  brand: 'Aoshima',
  category: 'model-kits',
  productType: 'kit',
  stockQuantity: 2,
  shortDescription: 'PO seeded product.',
};

describe('authorised distributor content import guards', () => {
  it('matches by strong identifiers and leaves ambiguous matches for review', () => {
    const [match, ambiguous] = matchDistributorRecords([product, { ...product, sku: 'IS-AMB', supplierSku: 'AMB' }], [
      { sourceId: 'dist-1', supplierSku: '05627', name: 'Different distributor title' },
      { sourceId: 'dist-2', supplierSku: 'AMB', name: 'Ambiguous 1' },
      { sourceId: 'dist-3', supplierSku: 'AMB', name: 'Ambiguous 2' },
    ]);

    expect(match?.status).toBe('matched');
    expect(match?.status === 'matched' ? match.method : undefined).toBe('supplierSku');
    expect(ambiguous?.status).toBe('ambiguous');
  });

  it('does not copy unsafe HTML, pricing or stock claims', () => {
    expect(sanitizeDistributorHtml('<p>Fine kit</p><script>x()</script><p>In stock now</p><form></form><strong>Official feature</strong>')).toBe('<p>Fine kit</p><p></p><strong>Official feature</strong>');
  });

  it('accepts only approved HTTPS image domains and safe extensions', () => {
    expect(validateDistributorImageSource('https://cdn.authorized-distributor.example/image.png', ['authorized-distributor.example']).hostname).toBe('cdn.authorized-distributor.example');
    expect(() => validateDistributorImageSource('http://authorized-distributor.example/image.png', ['authorized-distributor.example'])).toThrow(/HTTPS/);
    expect(() => validateDistributorImageSource('https://retailer.example/image.png', ['authorized-distributor.example'])).toThrow(/not approved/);
  });

  it('builds deterministic Iron Sprue R2 keys', () => {
    expect(buildIronSprueImportedImageKey({
      productSku: 'IS-AOS-05627',
      sourceUrl: 'https://authorized-distributor.example/images/05627.jpg',
      hash: 'abc123',
    }, {
      store: 'IRON_SPRUE',
      bucketBinding: 'IRON_SPRUE_MEDIA',
      bucketName: 'iron-sprue-media',
      publicBaseUrl: 'https://media.iron-sprue.example',
      uploadPrefix: 'products/',
      allowedMimeTypes: ['image/jpeg'],
      maxFileSizeBytes: 1_000_000,
      cacheControl: 'public, max-age=31536000, immutable',
    })).toBe('products/is-aos-05627/abc123.jpg');
  });
});
