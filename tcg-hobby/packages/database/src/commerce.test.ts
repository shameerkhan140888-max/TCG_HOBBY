import { describe, expect, it } from 'vitest';
import {
  calculateCartSubtotal,
  calculateOrderTotal,
  generateOrderNumber,
  getShippingMethodByCode,
  getShippingMethodsForCountry,
  validateQuantityAgainstAvailability,
} from './commerce';

describe('commerce helpers', () => {
  it('calculates cart totals from line items', () => {
    expect(
      calculateCartSubtotal([
        { quantity: 2, unitPriceMinor: 1250 },
        { quantity: 1, unitPriceMinor: 499 },
      ]),
    ).toBe(2999);
  });

  it('calculates order totals in minor units', () => {
    expect(calculateOrderTotal(2999, 499, 0)).toEqual({
      subtotalMinor: 2999,
      shippingMinor: 499,
      taxMinor: 0,
      totalMinor: 3498,
    });
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
    expect(getShippingMethodByCode('UK_EXPRESS', 'GB')?.name).toBe('UK Express');
  });

  it('returns only worldwide shipping for international customers', () => {
    const methods = getShippingMethodsForCountry('US');
    expect(methods).toHaveLength(1);
    expect(methods[0]?.code).toBe('WORLDWIDE_STANDARD');
  });

  it('generates readable order numbers with a testable entropy segment', () => {
    expect(generateOrderNumber(new Date('2026-07-04T00:00:00.000Z'), 'ABC123')).toBe('TCG-20260704-ABC123');
  });
});
