import { afterEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { assertStripeEventMatchesStore, getStoreStripeConfig } from './store-stripe-config.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setIronSprueStripeEnv() {
  process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID = 'acct_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_SECRET_KEY = 'sk_test_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET = 'whsec_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_PUBLISHABLE_KEY = 'pk_test_iron';
  process.env.IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR = 'IRON SPRUE';
  process.env.IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME = 'Iron Sprue';
  process.env.IRON_SPRUE_CHECKOUT_SUCCESS_URL = 'https://iron-sprue.example/checkout/success';
  process.env.IRON_SPRUE_CHECKOUT_CANCEL_URL = 'https://iron-sprue.example/checkout';
}

describe('store-aware Stripe configuration', () => {
  it('selects the Iron Sprue sandbox account without using the TCG fallback', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_tcg';
    setIronSprueStripeEnv();

    expect(getStoreStripeConfig({ store: 'IRON_SPRUE', environment: 'test' })).toMatchObject({
      store: 'IRON_SPRUE',
      environment: 'test',
      accountId: 'acct_iron',
      secretKey: 'sk_test_iron',
      webhookSecret: 'whsec_iron',
      publishableKey: 'pk_test_iron',
      statementDescriptor: 'IRON SPRUE',
      webhookPath: '/api/stripe/iron-sprue/webhook',
    });
  });

  it('treats Iron Sprue staging as Stripe test mode and keeps staging redirects on the staging storefront', () => {
    setIronSprueStripeEnv();
    process.env.COMMERCE_ENVIRONMENT = 'staging';
    process.env.IRON_SPRUE_ENVIRONMENT = 'staging';
    process.env.PUBLIC_STOREFRONT_URL = 'https://staging.ironsprue.co.uk';
    process.env.IRON_SPRUE_CHECKOUT_SUCCESS_URL = 'https://ironsprue.co.uk/checkout/success';
    process.env.IRON_SPRUE_CHECKOUT_CANCEL_URL = 'https://ironsprue.co.uk/cart';

    expect(getStoreStripeConfig({ store: 'IRON_SPRUE' })).toMatchObject({
      store: 'IRON_SPRUE',
      environment: 'test',
      successUrl: 'https://staging.ironsprue.co.uk/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://staging.ironsprue.co.uk/checkout/cancel',
    });
  });

  it('fails closed instead of falling back to generic TCG Stripe credentials for Iron Sprue', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_tcg';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_tcg';
    process.env.IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR = 'IRON SPRUE';
    process.env.IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME = 'Iron Sprue';
    process.env.IRON_SPRUE_CHECKOUT_SUCCESS_URL = 'https://iron-sprue.example/checkout/success';
    process.env.IRON_SPRUE_CHECKOUT_CANCEL_URL = 'https://iron-sprue.example/checkout';

    expect(() => getStoreStripeConfig({ store: 'IRON_SPRUE', environment: 'test' })).toThrow('IRON_SPRUE_STRIPE_TEST_SECRET_KEY');
  });

  it('requires the Iron Sprue Stripe account id before accepting webhook configuration', () => {
    process.env.IRON_SPRUE_STRIPE_TEST_SECRET_KEY = 'sk_test_iron';
    process.env.IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET = 'whsec_iron';
    process.env.IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR = 'IRON SPRUE';
    process.env.IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME = 'Iron Sprue';
    process.env.IRON_SPRUE_CHECKOUT_SUCCESS_URL = 'https://iron-sprue.example/checkout/success';
    process.env.IRON_SPRUE_CHECKOUT_CANCEL_URL = 'https://iron-sprue.example/checkout';

    expect(() => getStoreStripeConfig({ store: 'IRON_SPRUE', environment: 'test' })).toThrow('IRON_SPRUE_STRIPE_ACCOUNT_ID');
  });

  it('preserves TCG Hobby generic Stripe configuration', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_tcg';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_tcg';
    process.env.TCG_HOBBY_STRIPE_STATEMENT_DESCRIPTOR = 'TCG HOBBY';
    process.env.TCG_HOBBY_STRIPE_PUBLIC_BUSINESS_NAME = 'TCG Hobby';
    process.env.TCG_HOBBY_CHECKOUT_SUCCESS_URL = 'https://tcg-hobby.example/checkout/success';
    process.env.TCG_HOBBY_CHECKOUT_CANCEL_URL = 'https://tcg-hobby.example/checkout';

    expect(getStoreStripeConfig({ store: 'TCG_HOBBY', environment: 'test' })).toMatchObject({
      store: 'TCG_HOBBY',
      environment: 'test',
      secretKey: 'sk_test_tcg',
      webhookSecret: 'whsec_tcg',
      statementDescriptor: 'TCG HOBBY',
      webhookPath: '/api/stripe/webhook',
    });
  });

  it('fails closed for an unknown store context', () => {
    expect(() => getStoreStripeConfig({ store: 'UNKNOWN' })).toThrow(/Unknown commerce store/);
  });

  it('rejects cross-store and cross-environment webhook finalisation', () => {
    const expected = { store: 'IRON_SPRUE' as const, environment: 'test' as const, accountId: 'acct_iron' };
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'TCG_HOBBY', eventAccountId: 'acct_iron', eventLivemode: false })).toThrow(/order store/);
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'IRON_SPRUE', eventAccountId: 'acct_tcg', eventLivemode: false })).toThrow(/account/);
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'IRON_SPRUE', eventAccountId: 'acct_iron', eventLivemode: true })).toThrow(/environment/);
  });

  it('verifies Iron Sprue webhook payloads only with the dedicated Iron Sprue webhook secret', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_tcg';
    setIronSprueStripeEnv();
    const config = getStoreStripeConfig({ store: 'IRON_SPRUE', environment: 'test' });
    const payload = JSON.stringify({
      id: 'evt_iron_test',
      object: 'event',
      account: config.accountId,
      livemode: false,
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_iron', object: 'checkout.session' } },
    });
    const stripe = new Stripe(config.secretKey, { apiVersion: '2026-06-24.dahlia' });
    const ironSignature = Stripe.webhooks.generateTestHeaderString({ payload, secret: config.webhookSecret });
    const tcgSignature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });

    expect(() => stripe.webhooks.constructEvent(payload, ironSignature, config.webhookSecret)).not.toThrow();
    expect(() => stripe.webhooks.constructEvent(payload, tcgSignature, config.webhookSecret)).toThrow();
  });

  it('skips account matching when the shared account id is not configured locally', () => {
    const expected = { store: 'IRON_SPRUE' as const, environment: 'test' as const };
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'IRON_SPRUE', eventAccountId: null, eventLivemode: false })).not.toThrow();
  });
});
