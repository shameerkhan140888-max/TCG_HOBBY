export type CommerceStoreCode = 'TCG_HOBBY' | 'IRON_SPRUE';
export type CommerceEnvironment = 'test' | 'live';

export type StoreStripeConfig = {
  store: CommerceStoreCode;
  environment: CommerceEnvironment;
  accountId: string;
  secretKey: string;
  webhookSecret: string;
  publishableKey?: string;
  statementDescriptor: string;
  publicBusinessName: string;
  supportEmail?: string;
  successUrl: string;
  cancelUrl: string;
  webhookPath: string;
};

const STORE_PREFIXES: Record<CommerceStoreCode, string> = {
  TCG_HOBBY: 'TCG_HOBBY',
  IRON_SPRUE: 'IRON_SPRUE',
};

function normalizeStore(store: string): CommerceStoreCode {
  if (store === 'TCG_HOBBY' || store === 'IRON_SPRUE') return store;
  throw new Error(`Unknown commerce store "${store}".`);
}

function normalizeEnvironment(environment: string | undefined): CommerceEnvironment {
  const value = environment?.trim() || process.env.COMMERCE_ENVIRONMENT?.trim() || 'test';
  if (value === 'test' || value === 'live') return value;
  throw new Error('Commerce environment must be test or live.');
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for store-specific Stripe configuration.`);
  return value;
}

export function getStoreStripeConfig(input: { store: string; environment?: string }): StoreStripeConfig {
  const store = normalizeStore(input.store);
  const environment = normalizeEnvironment(input.environment);
  const prefix = STORE_PREFIXES[store];
  const envPrefix = environment === 'live' ? 'LIVE' : 'TEST';
  const secretKeyName = `${prefix}_STRIPE_${envPrefix}_SECRET_KEY`;
  const webhookSecretName = `${prefix}_STRIPE_${envPrefix}_WEBHOOK_SECRET`;

  const secretKey = required(secretKeyName);
  if (store === 'IRON_SPRUE' && secretKey === process.env.STRIPE_SECRET_KEY?.trim()) {
    throw new Error('Iron Sprue Stripe configuration must not reuse the unqualified STRIPE_SECRET_KEY.');
  }

  const config: StoreStripeConfig = {
    store,
    environment,
    accountId: required(`${prefix}_STRIPE_ACCOUNT_ID`),
    secretKey,
    webhookSecret: required(webhookSecretName),
    statementDescriptor: required(`${prefix}_STRIPE_STATEMENT_DESCRIPTOR`),
    publicBusinessName: required(`${prefix}_STRIPE_PUBLIC_BUSINESS_NAME`),
    successUrl: required(`${prefix}_CHECKOUT_SUCCESS_URL`),
    cancelUrl: required(`${prefix}_CHECKOUT_CANCEL_URL`),
    webhookPath: store === 'IRON_SPRUE' ? '/api/stripe/iron-sprue/webhook' : '/api/stripe/webhook',
  };
  const publishableKey = process.env[`${prefix}_STRIPE_${envPrefix}_PUBLISHABLE_KEY`]?.trim();
  const supportEmail = process.env[`${prefix}_SUPPORT_EMAIL`]?.trim();
  if (publishableKey) config.publishableKey = publishableKey;
  if (supportEmail) config.supportEmail = supportEmail;
  return config;
}

export function assertStripeEventMatchesStore(input: {
  expected: Pick<StoreStripeConfig, 'store' | 'environment' | 'accountId'>;
  orderStore: string | null | undefined;
  eventAccountId: string | null | undefined;
  eventLivemode: boolean;
}) {
  if (input.orderStore !== input.expected.store) {
    throw new Error('Stripe event store does not match the order store.');
  }
  if (input.eventAccountId && input.eventAccountId !== input.expected.accountId) {
    throw new Error('Stripe event account does not match the configured store account.');
  }
  const eventEnvironment: CommerceEnvironment = input.eventLivemode ? 'live' : 'test';
  if (eventEnvironment !== input.expected.environment) {
    throw new Error('Stripe event environment does not match the order environment.');
  }
}
