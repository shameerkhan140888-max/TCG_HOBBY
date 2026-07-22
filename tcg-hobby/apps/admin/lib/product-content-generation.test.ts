import { describe, expect, it, vi } from 'vitest';
import type { GeneratedProductContent, ProductFactInput } from '@tcg-hobby/database';
import { generateProductReviewDraft } from './product-content-generation';

const generatedContent: GeneratedProductContent = {
  shortDescription: 'New verified short description',
  fullDescription: 'New verified full description',
  contents: ['1 booster pack'],
  highlights: [],
  specificationSummary: '',
  seoTitle: 'Pitch Black Booster Pack | TCG Hobby',
  metaDescription: 'Shop the verified product.',
  searchTags: ['pokemon'],
  suggestedSlug: 'pitch-black-booster-pack',
  imageAltText: 'Pitch Black Booster Pack packaging',
  missingFactWarnings: [],
};

function workspace(facts: ProductFactInput[]) {
  return { name: 'Pitch Black Booster Pack', slug: 'pitch-black-booster-pack', brand: 'Pokemon TCG', game: 'POKEMON', setName: 'Mega Evolution', productType: 'Booster Pack', language: 'English', facts };
}

function dependencies(facts: ProductFactInput[]) {
  const generate = vi.fn().mockResolvedValue({ content: generatedContent, model: 'gpt-5-mini' });
  const createDraft = vi.fn().mockResolvedValue({ id: 'generation-1' });
  const createProvider = vi.fn(() => ({ generate }));
  return { generate, createDraft, createProvider, getWorkspace: vi.fn().mockResolvedValue(workspace(facts)) };
}

describe('assisted content generation preconditions', () => {
  const invalidCases: Array<[string, ProductFactInput[]]> = [
    ['no facts', []],
    ['an unverified value', [{ key: 'boosterPackCount', value: '1', verificationState: 'UNVERIFIED', sourceReference: 'Product packaging' }]],
    ['a verified value without its required source', [{ key: 'boosterPackCount', value: '1', verificationState: 'VERIFIED', sourceReference: '' }]],
  ];

  it.each(invalidCases)('does not call the provider for %s', async (_name, facts) => {
    const deps = dependencies(facts);
    await expect(generateProductReviewDraft('product-1', 'admin-1', ['shortDescription'], deps)).rejects.toThrow('Complete and verify at least one product fact');
    expect(deps.createProvider).not.toHaveBeenCalled();
    expect(deps.createDraft).not.toHaveBeenCalled();
  });

  it('sends saved verified facts to the provider and persists a new draft revision', async () => {
    const deps = dependencies([{ key: 'boosterPackCount', value: ' 1 ', verificationState: 'VERIFIED', sourceReference: ' Product packaging ' }]);
    await generateProductReviewDraft('product-1', 'admin-1', ['shortDescription', 'contents'], deps);
    expect(deps.generate).toHaveBeenCalledWith(expect.objectContaining({
      verifiedFacts: [{ key: 'boosterPackCount', value: '1', sourceReference: 'Product packaging' }],
      requestedFields: ['shortDescription', 'contents'],
    }));
    expect(deps.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-1',
      requestedById: 'admin-1',
      requestedFields: ['shortDescription', 'contents'],
      content: generatedContent,
    }));
  });
});
