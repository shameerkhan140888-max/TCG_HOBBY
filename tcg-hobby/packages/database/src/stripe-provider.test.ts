import Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';
import {
  constructStripeWebhookEvent,
  isStripeCheckoutConfigured,
  requireStripeSecretKey,
  requireStripeWebhookSecret,
} from './stripe-provider';

const originalSecretKey = process.env.STRIPE_SECRET_KEY;
const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  process.env.STRIPE_SECRET_KEY = originalSecretKey;
  process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
});

describe('Stripe provider configuration', () => {
  it('fails with an actionable message when Checkout is not configured', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeCheckoutConfigured()).toBe(false);
    expect(() => requireStripeSecretKey()).toThrow('STRIPE_SECRET_KEY');
  });

  it('fails with an actionable message when webhook verification is not configured', () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => requireStripeWebhookSecret()).toThrow('STRIPE_WEBHOOK_SECRET');
  });

  it('verifies a signed raw webhook payload', () => {
    const secret = 'whsec_test_fixture';
    const payload = JSON.stringify({
      id: 'evt_test_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1' } },
    });
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });

    expect(constructStripeWebhookEvent(payload, signature).id).toBe('evt_test_1');
  });

  it('rejects an invalid signature', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fixture';
    expect(() => constructStripeWebhookEvent('{}', 't=1,v1=bad')).toThrow();
  });
});
