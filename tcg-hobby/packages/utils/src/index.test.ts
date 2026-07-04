import { describe, expect, it } from 'vitest';
import { calculatePercentage, clampMinorAmount, formatMoney, roundToMinor, slugify, sumMinorAmounts } from './index';

describe('utils', () => {
  it('formats money in minor units', () => {
    expect(formatMoney({ amountMinor: 1299, currency: 'GBP' })).toContain('12.99');
  });

  it('creates stable slugs', () => {
    expect(slugify('Premium Booster Box!')).toBe('premium-booster-box');
  });

  it('handles integer money helpers safely', () => {
    expect(clampMinorAmount(1299.8)).toBe(1299);
    expect(sumMinorAmounts([100, -2, 250.9])).toBe(350);
    expect(calculatePercentage(250, 1000)).toBe(25);
    expect(roundToMinor(12.4)).toBe(12);
  });
});
