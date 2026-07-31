import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructStripeWebhookEvent: vi.fn(),
  processStripeWebhookEvent: vi.fn(),
  requireStripeWebhookSecret: vi.fn(),
  sendPaidOrderConfirmationEmail: vi.fn(),
}));

vi.mock('@tcg-hobby/database', () => mocks);
vi.mock('../../../../lib/order-email', () => ({
  sendPaidOrderConfirmationEmail: mocks.sendPaidOrderConfirmationEmail,
}));

import { POST } from './route';

function request(signature = 't=123,v1=signature') {
  return new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body: JSON.stringify({ id: 'evt_1' }),
  });
}

describe('Stripe webhook route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireStripeWebhookSecret.mockImplementation(() => 'whsec_test');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.constructStripeWebhookEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
    });
    mocks.processStripeWebhookEvent.mockResolvedValue({
      eventId: 'evt_1',
      eventType: 'checkout.session.completed',
      outcome: 'processed',
      orderId: 'order-1',
    });
    mocks.sendPaidOrderConfirmationEmail.mockResolvedValue({ outcome: 'sent' });
  });

  it('fails safely when the webhook secret is missing', async () => {
    mocks.requireStripeWebhookSecret.mockImplementation(() => {
      throw new Error('missing');
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Stripe webhook configuration is unavailable.' });
    expect(mocks.constructStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects a missing signature', async () => {
    const response = await POST(request(''));

    expect(response.status).toBe(400);
    expect(mocks.processStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature without exposing framework errors', async () => {
    mocks.constructStripeWebhookEvent.mockImplementation(() => {
      throw new Error('provider detail');
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid Stripe webhook signature.' });
  });

  it('processes a valid signed event', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mocks.processStripeWebhookEvent).toHaveBeenCalledTimes(1);
    expect(mocks.sendPaidOrderConfirmationEmail).toHaveBeenCalledWith('order-1');
  });

  it('does not fail a paid webhook when confirmation email delivery is unavailable', async () => {
    mocks.sendPaidOrderConfirmationEmail.mockRejectedValue(new Error('database unavailable'));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  it('returns a retryable error without exposing raw processing details', async () => {
    mocks.processStripeWebhookEvent.mockRejectedValue(new Error('database detail'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Stripe webhook processing failed.' });
  });
});
