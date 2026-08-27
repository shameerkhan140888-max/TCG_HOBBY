import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrderByStripeCheckoutSessionId: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@capital-hobby/database/storefront', () => ({
  getCustomerOrderByNumber: vi.fn(),
  getCustomerOrders: vi.fn(),
  getOrderByStripeCheckoutSessionId: mocks.getOrderByStripeCheckoutSessionId,
}));
vi.mock('./auth', () => ({
  requireCustomerSession: vi.fn(),
}));

import { getOrderForStripeReturn } from './orders';

describe('Stripe success return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads a pending canonical order without finalizing payment', async () => {
    const pending = {
      id: 'order-1',
      paymentStatus: 'REQUIRES_PAYMENT',
      stripeCheckoutSessionId: 'cs_test_1',
    };
    mocks.getOrderByStripeCheckoutSessionId.mockResolvedValue(pending);

    await expect(getOrderForStripeReturn('cs_test_1')).resolves.toBe(pending);
    expect(mocks.getOrderByStripeCheckoutSessionId).toHaveBeenCalledWith('cs_test_1');
  });

  it('shows the webhook-finalized state when it arrived before the return', async () => {
    const paid = {
      id: 'order-1',
      paymentStatus: 'SUCCEEDED',
      stripeCheckoutSessionId: 'cs_test_1',
    };
    mocks.getOrderByStripeCheckoutSessionId.mockResolvedValue(paid);

    await expect(getOrderForStripeReturn('cs_test_1')).resolves.toBe(paid);
  });
});
