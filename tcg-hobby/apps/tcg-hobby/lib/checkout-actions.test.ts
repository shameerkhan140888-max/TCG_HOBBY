import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  attachStripeSessionToOrder: vi.fn(),
  createPendingCheckoutOrder: vi.fn(),
  createStripeCheckoutSession: vi.fn(),
  getAvailableShippingMethods: vi.fn(),
  isStripeCheckoutConfigured: vi.fn(() => false),
  releaseCheckoutOrderReservation: vi.fn(),
  getCurrentCustomerCart: vi.fn(),
  getCurrentCustomerSession: vi.fn(),
}));

vi.mock('@capital-hobby/database/storefront', () => ({
  attachStripeSessionToOrder: mocks.attachStripeSessionToOrder,
  createPendingCheckoutOrder: mocks.createPendingCheckoutOrder,
  createStripeCheckoutSession: mocks.createStripeCheckoutSession,
  getAvailableShippingMethods: mocks.getAvailableShippingMethods,
  isStripeCheckoutConfigured: mocks.isStripeCheckoutConfigured,
  releaseCheckoutOrderReservation: mocks.releaseCheckoutOrderReservation,
}));

vi.mock('./cart', () => ({ getCurrentCustomerCart: mocks.getCurrentCustomerCart }));
vi.mock('./auth', () => ({ getCurrentCustomerSession: mocks.getCurrentCustomerSession }));

import { placeCheckoutOrderAction } from './checkout-actions';

const state = {
  fieldErrors: {},
  values: {
    fullName: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'GB',
    shippingMethodCode: 'UK_STANDARD' as const,
  },
  shippingMethods: [],
};

function checkoutForm() {
  const form = new FormData();
  form.set('fullName', 'Sam Collector');
  form.set('email', 'sam@example.test');
  form.set('line1', '1 Collector Street');
  form.set('city', 'London');
  form.set('postalCode', 'E1 5NF');
  form.set('country', 'GB');
  form.set('shippingMethodCode', 'UK_STANDARD');
  form.set('checkoutAttemptId', 'attempt-1');
  form.set('returnTo', '/checkout?step=delivery');
  return form;
}

describe('placeCheckoutOrderAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentCustomerSession.mockResolvedValue(null);
    mocks.getCurrentCustomerCart.mockResolvedValue({
      cartId: null,
      currency: 'GBP',
      subtotalMinor: 4999,
      totalItems: 1,
      items: [{
        id: 'cart-item-1',
        productId: 'product-1',
        productName: 'Test Product',
        productSlug: 'test-product',
        quantity: 1,
        unitPriceMinor: 4999,
        totalMinor: 4999,
      }],
    });
    mocks.getAvailableShippingMethods.mockResolvedValue([{
      code: 'UK_STANDARD',
      name: 'Standard delivery',
      amountMinor: 299,
      etaLabel: 'Estimated delivery in 2-4 working days',
    }]);
    mocks.createPendingCheckoutOrder.mockResolvedValue({
      order: { id: 'order-1', orderNumber: 'TCG-ORDER-1', userId: null },
      items: [{
        productName: 'Test Product',
        productSlug: 'test-product',
        quantity: 1,
        unitPriceMinor: 4999,
      }],
      shippingMinor: 299,
    });
    mocks.createStripeCheckoutSession.mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/test',
      payment_intent: null,
    });
    mocks.attachStripeSessionToOrder.mockResolvedValue(undefined);
    mocks.releaseCheckoutOrderReservation.mockResolvedValue('order-1');
  });

  it('returns a hosted checkout URL without treating the handoff as an error', async () => {
    const result = await placeCheckoutOrderAction(state, checkoutForm());

    expect(result.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/test');
    expect(mocks.createPendingCheckoutOrder).toHaveBeenCalledWith(null, expect.anything(), expect.objectContaining({
      checkoutAttemptId: 'attempt-1',
    }));
    expect(mocks.createStripeCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'checkout-session:order-1',
      cancelUrl: expect.stringContaining('attemptId=attempt-1'),
    }));
    expect(mocks.attachStripeSessionToOrder).toHaveBeenCalled();
    expect(mocks.releaseCheckoutOrderReservation).not.toHaveBeenCalled();
  });

  it('releases the reservation only when Stripe session creation genuinely fails', async () => {
    mocks.createStripeCheckoutSession.mockRejectedValueOnce(new Error('provider unavailable'));

    const result = await placeCheckoutOrderAction(state, checkoutForm());

    expect(result.formError).toBe('We could not start secure payment. Your basket is unchanged, so please try again.');
    expect(mocks.releaseCheckoutOrderReservation).toHaveBeenCalledWith('order-1');
    expect(JSON.stringify(result)).not.toContain('provider unavailable');
  });

  it('does not cancel a valid Stripe session when linking it needs a retry', async () => {
    mocks.attachStripeSessionToOrder.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await placeCheckoutOrderAction(state, checkoutForm());

    expect(result.formError).toContain('could not be linked safely');
    expect(mocks.releaseCheckoutOrderReservation).not.toHaveBeenCalled();
  });

  it('returns a safe basket error when inventory reservation fails', async () => {
    mocks.createPendingCheckoutOrder.mockRejectedValueOnce(new Error('raw inventory detail'));

    const result = await placeCheckoutOrderAction(state, checkoutForm());

    expect(result.formError).toBe('We could not reserve your basket for payment. Review your basket and try again.');
    expect(JSON.stringify(result)).not.toContain('raw inventory detail');
    expect(mocks.createStripeCheckoutSession).not.toHaveBeenCalled();
  });
});
