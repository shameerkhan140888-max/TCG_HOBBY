import { describe, expect, it } from 'vitest';
import { calculateMarginMinor, calculateMarkupPercent, evaluatePricingSnapshot } from './pricing';

describe('pricing engine', () => {
  it('calculates margin and markup in minor units', () => {
    expect(calculateMarginMinor(750, 1200)).toBe(450);
    expect(calculateMarkupPercent(750, 1200)).toBe(60);
  });

  it('chooses the highest-priority matching rule and enforces pricing guard rails', () => {
    const snapshot = evaluatePricingSnapshot(
      {
        productId: 'prod-1',
        categoryId: 'cat-1',
        supplierId: 'sup-1',
        costMinor: 800,
        retailMinor: 1200,
        currentBuyMinor: 500,
      },
      [
        {
          id: 'rule-global',
          name: 'Global baseline',
          ruleType: 'COST_PLUS_PERCENT',
          ruleScope: 'GLOBAL',
          productId: null,
          categoryId: null,
          supplierId: null,
          currency: 'GBP',
          priority: 5,
          active: true,
          config: { percentage: 10, minimumMarginPercent: 20, maximumDiscountPercent: 50 },
        },
        {
          id: 'rule-category',
          name: 'Category booster',
          ruleType: 'FIXED_MARGIN',
          ruleScope: 'CATEGORY',
          productId: null,
          categoryId: 'cat-1',
          supplierId: null,
          currency: 'GBP',
          priority: 10,
          active: true,
          config: { marginMinor: 250, minimumMarginPercent: 25, maximumDiscountPercent: 45 },
        },
      ],
    );

    expect(snapshot.pricingRuleId).toBe('rule-category');
    expect(snapshot.priceSource).toBe('Category booster');
    expect(snapshot.buyMinor).toBe(900);
    expect(snapshot.priceStatus).toBe('ACTIVE');
    expect(snapshot.manualOverride).toBe(false);
  });

  it('marks manual overrides explicitly', () => {
    const snapshot = evaluatePricingSnapshot(
      {
        productId: 'prod-2',
        categoryId: 'cat-2',
        supplierId: 'sup-2',
        costMinor: 600,
        retailMinor: 1000,
        manualOverrideBuyMinor: 700,
      },
      [],
    );

    expect(snapshot.priceStatus).toBe('MANUAL_OVERRIDE');
    expect(snapshot.manualOverride).toBe(true);
    expect(snapshot.buyMinor).toBe(700);
  });
});
