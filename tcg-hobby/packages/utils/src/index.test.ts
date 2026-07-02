import { describe, expect, it } from 'vitest';
import { formatMoney, slugify } from './index';

describe('utils', () => {
  it('formats money in minor units', () => {
    expect(formatMoney({ amountMinor: 1299, currency: 'GBP' })).toContain('12.99');
  });

  it('creates stable slugs', () => {
    expect(slugify('Premium Booster Box!')).toBe('premium-booster-box');
  });
});
