import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminSession: vi.fn(),
  countRecentContentGenerations: vi.fn(),
  generateProductReviewDraft: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('./auth.server', () => ({ requireAdminSession: mocks.requireAdminSession }));
vi.mock('./product-content-provider.server', () => ({ createOpenAiContentProvider: vi.fn() }));
vi.mock('./product-content-generation', () => ({ generateProductReviewDraft: mocks.generateProductReviewDraft }));
vi.mock('@tcg-hobby/database', () => ({
  GENERATED_CONTENT_FIELDS: ['shortDescription'],
  countRecentContentGenerations: mocks.countRecentContentGenerations,
  createContentGenerationDraft: vi.fn(),
  getProductContentWorkspace: vi.fn(),
  applyContentGeneration: vi.fn(),
  discardContentGeneration: vi.fn(),
  replaceProductFacts: vi.fn(),
  restoreContentGeneration: vi.fn(),
  setProductReviewLifecycle: vi.fn(),
}));

import { generateProductContentAction } from './product-content-actions.server';

describe('assisted content generation action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mocks.countRecentContentGenerations.mockResolvedValue(0);
    mocks.generateProductReviewDraft.mockResolvedValue({});
  });

  it('revalidates the Admin product and storefront paths after a new draft is saved', async () => {
    const result = await generateProductContentAction('product-1', ['shortDescription']);
    expect(result.ok).toBe(true);
    expect(mocks.generateProductReviewDraft).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(['/admin/products/product-1', '/catalogue', '/']);
  });

  it('returns the safe provider error and does not refresh stale content after failure', async () => {
    mocks.generateProductReviewDraft.mockRejectedValue(new Error('Content provider returned no structured output.'));
    const result = await generateProductContentAction('product-1', ['shortDescription']);
    expect(result).toEqual({ ok: false, message: 'Content provider returned no structured output.' });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
