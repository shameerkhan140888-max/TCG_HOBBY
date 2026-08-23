import { describe, expect, it } from 'vitest';
import {
  calculateCartSubtotal,
  calculateCartSummary,
  calculateOrderTotal,
  calculatePromotionalShippingMinor,
  calculateVatEstimateMinor,
  getFreeStandardDeliveryProgress,
  generateOrderNumber,
  getShippingMethodByCode,
  getShippingMethodsForCountry,
  MEGA_GRENINJA_PRODUCT_SLUG,
  validateQuantityAgainstAvailability,
  validateQuantityAgainstPurchaseLimit,
} from './commerce.js';

describe('commerce helpers', () => {
  it('calculates cart totals from line items', () => {
    const summary = calculateCartSummary([
      { id: 'item-1', productId: 'prod-1', productName: 'Alpha', productSlug: 'alpha', quantity: 2, unitPriceMinor: 1250, totalMinor: 2500, inStock: true },
      { id: 'item-2', productId: 'prod-2', productName: 'Beta', productSlug: 'beta', quantity: 1, unitPriceMinor: 499, totalMinor: 499, inStock: true },
    ]);

    expect(calculateCartSubtotal([
      { quantity: 2, unitPriceMinor: 1250 },
      { quantity: 1, unitPriceMinor: 499 },
    ])).toBe(2999);
    expect(summary.totalItems).toBe(3);
  });

  it('calculates order totals in minor units', () => {
    expect(calculateOrderTotal(2999, 499, 0)).toEqual({
      subtotalMinor: 2999,
      shippingMinor: 499,
      taxMinor: 0,
      totalMinor: 3498,
    });
  });

  it('extracts VAT included in public basket prices', () => {
    expect(calculateVatEstimateMinor(10000)).toBe(1667);
    expect(calculateVatEstimateMinor(4999)).toBe(833);
    expect(calculateVatEstimateMinor(0)).toBe(0);
  });

  it('validates quantities against available stock', () => {
    expect(validateQuantityAgainstAvailability(2, 3)).toEqual({ ok: true });
    expect(validateQuantityAgainstAvailability(0, 3)).toEqual({
      ok: false,
      message: 'Quantity must be at least 1.',
    });
    expect(validateQuantityAgainstAvailability(4, 3)).toEqual({
      ok: false,
      message: 'Only 3 in stock for this item.',
    });
  });

  it('returns UK and worldwide shipping methods for UK customers', () => {
    const methods = getShippingMethodsForCountry('GB');
    expect(methods).toHaveLength(3);
    expect(getShippingMethodByCode('UK_STANDARD', 'GB')?.amountMinor).toBe(299);
    expect(getShippingMethodByCode('UK_EXPRESS', 'GB')?.name).toBe('Express delivery');
    expect(getShippingMethodByCode('UK_EXPRESS', 'GB')?.amountMinor).toBe(499);
  });

  it('returns only worldwide shipping for international customers', () => {
    const methods = getShippingMethodsForCountry('US');
    expect(methods).toHaveLength(1);
    expect(methods[0]?.code).toBe('WORLDWIDE_STANDARD');
  });

  it('applies free UK standard shipping only when every basket item is eligible', () => {
    const standard = getShippingMethodByCode('UK_STANDARD', 'GB');

    expect(standard).not.toBeNull();
    expect(calculatePromotionalShippingMinor(standard!, [{ productSlug: MEGA_GRENINJA_PRODUCT_SLUG }], 'GB', 4999)).toBe(0);
    expect(calculatePromotionalShippingMinor(standard!, [{ productSlug: MEGA_GRENINJA_PRODUCT_SLUG }, { productSlug: 'other-product' }], 'GB', 4999)).toBe(299);
    expect(calculatePromotionalShippingMinor(standard!, [{ productSlug: MEGA_GRENINJA_PRODUCT_SLUG }], 'US', 4999)).toBe(299);
  });

  it('applies the UK delivery threshold to the discounted subtotal', () => {
    expect(getShippingMethodByCode('UK_STANDARD', 'GB', 0)?.amountMinor).toBe(299);
    expect(getShippingMethodByCode('UK_STANDARD', 'GB', 4999)?.amountMinor).toBe(299);
    expect(getShippingMethodByCode('UK_STANDARD', 'GB', 5000)?.amountMinor).toBe(0);
    expect(getShippingMethodByCode('UK_EXPRESS', 'GB', 5000)?.amountMinor).toBe(299);
    expect(getFreeStandardDeliveryProgress(4999)).toEqual({
      qualified: false,
      remainingMinor: 1,
      thresholdMinor: 5000,
    });
    expect(getFreeStandardDeliveryProgress(5000)).toEqual({
      qualified: true,
      remainingMinor: 0,
      thresholdMinor: 5000,
    });
  });

  it('validates customer purchase limits', () => {
    expect(validateQuantityAgainstPurchaseLimit(1, 1)).toEqual({ ok: true });
    expect(validateQuantityAgainstPurchaseLimit(2, 1)).toEqual({
      ok: false,
      message: 'Limited to one collection per person or household.',
    });
  });

  it('generates readable order numbers with a testable entropy segment', () => {
    expect(generateOrderNumber(new Date('2026-07-04T00:00:00.000Z'), 'ABC123')).toBe('TCG-20260704-ABC123');
  });
});
