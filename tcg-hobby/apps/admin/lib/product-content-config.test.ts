import { describe, expect, it } from 'vitest';
import type { ProductFactInput } from '@tcg-hobby/database';
import {
  assistedContentControlClass,
  hasSavedVerifiedFact,
  productFactDisplay,
  productFactsAreDirty,
  selectLatestReviewGeneration,
} from './product-content-config';

describe('assisted content presentation', () => {
  it('uses readable dark-theme control states', () => {
    expect(assistedContentControlClass).toContain('bg-surface-ink');
    expect(assistedContentControlClass).toContain('text-neutral-50');
    expect(assistedContentControlClass).toContain('placeholder:text-neutral-500');
    expect(assistedContentControlClass).toContain('focus:ring-2');
    expect(assistedContentControlClass).toContain('disabled:text-neutral-500');
  });

  it('provides customer-readable labels without changing fact keys', () => {
    expect(productFactDisplay.manufacturerSku.label).toBe('Manufacturer SKU');
    expect(productFactDisplay.boosterPackCount.label).toBe('Booster pack count');
    expect(productFactDisplay.countryRegion.label).toBe('Country / region');
    expect(productFactDisplay.variationNotice.label).toBe('Variation notice');
  });

  it('detects unsaved fact changes', () => {
    const saved: ProductFactInput[] = [{ key: 'boosterPackCount', value: '1', verificationState: 'VERIFIED', sourceReference: 'Product packaging' }];
    const unchanged = { boosterPackCount: saved[0]! };
    const changed = { boosterPackCount: { ...saved[0]!, value: '2' } };
    expect(productFactsAreDirty(unchanged, saved)).toBe(false);
    expect(productFactsAreDirty(changed, saved)).toBe(true);
  });

  it('requires a saved, sourced and verified fact', () => {
    expect(hasSavedVerifiedFact([])).toBe(false);
    expect(hasSavedVerifiedFact([{ key: 'boosterPackCount', value: '1', verificationState: 'UNVERIFIED', sourceReference: 'Product packaging' }])).toBe(false);
    expect(hasSavedVerifiedFact([{ key: 'boosterPackCount', value: '1', verificationState: 'VERIFIED', sourceReference: 'Product packaging' }])).toBe(true);
  });

  it('selects the latest unapplied draft rather than stale applied content', () => {
    const selected = selectLatestReviewGeneration([{ id: 'applied', status: 'APPLIED' }, { id: 'draft', status: 'DRAFT' }]);
    expect(selected?.id).toBe('draft');
  });
});
