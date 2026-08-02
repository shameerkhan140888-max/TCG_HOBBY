import { afterEach, describe, expect, it } from 'vitest';
import { assertStripeEventMatchesStore, getStoreStripeConfig } from './store-stripe-config';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setIronSprueStripeEnv() {
  process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID = 'acct_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_SECRET_KEY = 'sk_test_iron';
  process.env.IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET = 'whsec_iron';
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
      statementDescriptor: 'IRON SPRUE',
      webhookPath: '/api/stripe/iron-sprue/webhook',
    });
  });

  it('fails closed for an unknown store context', () => {
    expect(() => getStoreStripeConfig({ store: 'UNKNOWN' })).toThrow(/Unknown commerce store/);
  });

  it('rejects Iron Sprue configuration that reuses the unqualified Stripe key', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_shared';
    setIronSprueStripeEnv();
    process.env.IRON_SPRUE_STRIPE_TEST_SECRET_KEY = 'sk_test_shared';

    expect(() => getStoreStripeConfig({ store: 'IRON_SPRUE', environment: 'test' })).toThrow(/unqualified STRIPE_SECRET_KEY/);
  });

  it('rejects cross-store and cross-environment webhook finalisation', () => {
    const expected = { store: 'IRON_SPRUE' as const, environment: 'test' as const, accountId: 'acct_iron' };
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'TCG_HOBBY', eventAccountId: 'acct_iron', eventLivemode: false })).toThrow(/order store/);
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'IRON_SPRUE', eventAccountId: 'acct_tcg', eventLivemode: false })).toThrow(/account/);
    expect(() => assertStripeEventMatchesStore({ expected, orderStore: 'IRON_SPRUE', eventAccountId: 'acct_iron', eventLivemode: true })).toThrow(/environment/);
  });
});
