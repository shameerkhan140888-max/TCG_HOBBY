import { describe, expect, it, vi } from 'vitest';
import { applyContentGeneration, validateProductFacts, type GeneratedProductContent } from './product-content';

const generated: GeneratedProductContent = { shortDescription: 'New short copy', fullDescription: 'New full copy', contents: ['One verified item'], highlights: ['Verified highlight'], specificationSummary: 'Verified summary', seoTitle: 'SEO title', metaDescription: 'Meta description', searchTags: ['pokemon'], suggestedSlug: 'suggested-only', imageAltText: 'Front of the verified product box', missingFactWarnings: [] };

describe('product content safety', () => {
  it('requires a source reference for verified facts', () => {
    expect(validateProductFacts([{ key: 'boxContents', value: 'Eight booster packs', verificationState: 'VERIFIED' }])).toContain('Verified fact boxContents requires a source reference.');
  });
  it('rejects duplicate fact keys', () => {
    expect(validateProductFacts([{ key: 'edition', value: 'First', verificationState: 'UNVERIFIED' }, { key: 'edition', value: 'Second', verificationState: 'UNVERIFIED' }])).toContain('Fact edition is duplicated.');
  });
  it('applies only explicitly selected fields and stores prior values', async () => {
    const tx = { productContentGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'gen', productId: 'product', requestedById: 'staff', status: 'DRAFT', generatedContent: generated, product: { description: 'Existing', longDescription: 'Existing full', verifiedContents: [], productHighlights: [], specificationSummary: null, seoTitle: null, metaDescription: null, searchTags: [] } }), update: vi.fn() }, product: { update: vi.fn() }, productImage: { findFirst: vi.fn(), update: vi.fn() } };
    const db = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    await applyContentGeneration('gen', ['shortDescription'], 'staff', db as never);
    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'product' }, data: { description: 'New short copy' } });
    expect(tx.productContentGeneration.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPLIED', appliedFields: ['shortDescription'], previousValues: { shortDescription: 'Existing' } }) }));
  });
  it('does not let another staff member apply a draft', async () => {
    const tx = { productContentGeneration: { findUnique: vi.fn().mockResolvedValue({ requestedById: 'owner', status: 'DRAFT', generatedContent: generated, product: {} }) } };
    const db = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    await expect(applyContentGeneration('gen', ['seoTitle'], 'other', db as never)).rejects.toThrow('Only the requesting staff member');
  });
});
