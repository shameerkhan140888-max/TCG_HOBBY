import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMocks = vi.hoisted(() => ({
  finalizePaidCheckoutOrder: vi.fn(),
  getOrderByStripeCheckoutSessionId: vi.fn(),
  releaseCheckoutOrderReservation: vi.fn(),
}));

vi.mock('./orders', () => orderMocks);

import { processStripeWebhookEvent } from './stripe-webhook.js';

function stripeEvent(type: Stripe.Event.Type, object: Record<string, unknown>, id = 'evt_1') {
  return {
    id,
    object: 'event',
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

function databaseMock() {
  return {
    stripeWebhookEvent: {
      create: vi.fn().mockResolvedValue({
        stripeEventId: 'evt_1',
        processedAt: null,
        orderId: null,
      }),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    order: {
      findUnique: vi.fn(),
    },
  } as any;
}

describe('Stripe webhook processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finalizes a valid completed Checkout Session exactly once', async () => {
    const db = databaseMock();
    orderMocks.getOrderByStripeCheckoutSessionId.mockResolvedValue({
      id: 'order-1',
      totalMinor: 4999,
      currency: 'GBP',
    });
    orderMocks.finalizePaidCheckoutOrder.mockResolvedValue({ paymentStatus: 'SUCCEEDED' });

    const result = await processStripeWebhookEvent(stripeEvent('checkout.session.completed', {
      id: 'cs_test_1',
      payment_status: 'paid',
      payment_intent: 'pi_test_1',
      amount_total: 4999,
      currency: 'gbp',
      metadata: { orderId: 'order-1' },
    }), db);

    expect(result).toMatchObject({ outcome: 'processed', orderId: 'order-1' });
    expect(orderMocks.finalizePaidCheckoutOrder).toHaveBeenCalledTimes(1);
    expect(orderMocks.finalizePaidCheckoutOrder).toHaveBeenCalledWith({
      orderId: 'order-1',
      paymentIntentId: 'pi_test_1',
      stripeCheckoutSessionId: 'cs_test_1',
    }, db);
  });

  it('treats an already processed event as a harmless duplicate', async () => {
    const db = databaseMock();
    db.stripeWebhookEvent.create.mockResolvedValue({
      stripeEventId: 'evt_1',
      processedAt: new Date(),
      orderId: 'order-1',
    });

    const result = await processStripeWebhookEvent(stripeEvent('checkout.session.completed', {
      id: 'cs_test_1',
    }), db);

    expect(result.outcome).toBe('duplicate');
    expect(orderMocks.finalizePaidCheckoutOrder).not.toHaveBeenCalled();
  });

  it('records an unknown Checkout Session without changing an order', async () => {
    const db = databaseMock();
    orderMocks.getOrderByStripeCheckoutSessionId.mockResolvedValue(null);
    db.order.findUnique.mockResolvedValue(null);

    const result = await processStripeWebhookEvent(stripeEvent('checkout.session.completed', {
      id: 'cs_unknown',
      payment_status: 'paid',
      payment_intent: 'pi_unknown',
      amount_total: 4999,
      currency: 'gbp',
      metadata: {},
    }), db);

    expect(result).toMatchObject({ outcome: 'ignored', orderId: null });
    expect(orderMocks.finalizePaidCheckoutOrder).not.toHaveBeenCalled();
  });

  it('releases an expired session reservation once', async () => {
    const db = databaseMock();
    orderMocks.getOrderByStripeCheckoutSessionId.mockResolvedValue({ id: 'order-1' });

    await processStripeWebhookEvent(stripeEvent('checkout.session.expired', {
      id: 'cs_test_1',
      metadata: {},
    }), db);

    expect(orderMocks.releaseCheckoutOrderReservation).toHaveBeenCalledWith('order-1', db, 'CANCELED');
  });

  it('marks a failed PaymentIntent and releases its reservation', async () => {
    const db = databaseMock();
    db.order.findUnique.mockResolvedValue({ id: 'order-1' });

    await processStripeWebhookEvent(stripeEvent('payment_intent.payment_failed', {
      id: 'pi_test_1',
      metadata: { orderId: 'order-1' },
    }), db);

    expect(orderMocks.releaseCheckoutOrderReservation).toHaveBeenCalledWith('order-1', db, 'FAILED');
  });

  it('rejects a total mismatch without finalizing stock', async () => {
    const db = databaseMock();
    orderMocks.getOrderByStripeCheckoutSessionId.mockResolvedValue({
      id: 'order-1',
      totalMinor: 4999,
      currency: 'GBP',
    });

    await expect(processStripeWebhookEvent(stripeEvent('checkout.session.completed', {
      id: 'cs_test_1',
      payment_status: 'paid',
      payment_intent: 'pi_test_1',
      amount_total: 5999,
      currency: 'gbp',
      metadata: {},
    }), db)).rejects.toThrow('STRIPE_TOTAL_MISMATCH');

    expect(orderMocks.finalizePaidCheckoutOrder).not.toHaveBeenCalled();
  });
});
