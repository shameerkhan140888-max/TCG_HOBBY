import { describe, expect, it } from 'vitest';
import { buildStorefrontProductPath, calculatePercentage, clampMinorAmount, formatBasketSummary, formatMoney, roundToMinor, slugify, sumMinorAmounts } from './index';

describe('utils', () => {
  it('formats money in minor units', () => {
    expect(formatMoney({ amountMinor: 1299, currency: 'GBP' })).toContain('12.99');
  });

  it('formats basket summaries', () => {
    expect(formatBasketSummary(2499, 2)).toBe('£24.99 · 2 items');
    expect(formatBasketSummary(0, 0)).toBe('£0.00 · 0 items');
  });

  it('creates stable slugs', () => {
    expect(slugify('Premium Booster Box!')).toBe('premium-booster-box');
  });

  it('builds canonical storefront product paths', () => {
    expect(buildStorefrontProductPath('pokemon-mega-evolution-pitch-black-booster-pack')).toBe('/catalogue/pokemon-mega-evolution-pitch-black-booster-pack');
    expect(buildStorefrontProductPath(' product with spaces ')).toBe('/catalogue/product%20with%20spaces');
  });

  it('handles integer money helpers safely', () => {
    expect(clampMinorAmount(1299.8)).toBe(1299);
    expect(sumMinorAmounts([100, -2, 250.9])).toBe(350);
    expect(calculatePercentage(250, 1000)).toBe(25);
    expect(roundToMinor(12.4)).toBe(12);
  });
});
