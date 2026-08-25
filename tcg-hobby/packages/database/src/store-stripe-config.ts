export type CommerceStoreCode = 'TCG_HOBBY' | 'IRON_SPRUE';
export type CommerceEnvironment = 'test' | 'live';

export type StoreStripeConfig = {
  store: CommerceStoreCode;
  environment: CommerceEnvironment;
  accountId?: string;
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
  if (value === 'staging' || value === 'development') return 'test';
  if (value === 'test' || value === 'live') return value;
  throw new Error('Commerce environment must be test or live.');
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for store-specific Stripe configuration.`);
  return value;
}

function configured(name: string) {
  return process.env[name]?.trim() || undefined;
}

function requiredWithFallback(primaryName: string, fallbackName: string) {
  const primary = configured(primaryName);
  if (primary) return primary;
  const fallback = configured(fallbackName);
  if (fallback) return fallback;
  throw new Error(`${primaryName} or ${fallbackName} is required for Stripe configuration.`);
}

function configuredCheckoutUrl(store: CommerceStoreCode, kind: 'success' | 'cancel') {
  const configuredValue = required(`${STORE_PREFIXES[store]}_CHECKOUT_${kind.toUpperCase()}_URL`);
  const businessEnvironment = process.env.IRON_SPRUE_ENVIRONMENT?.trim() || process.env.COMMERCE_ENVIRONMENT?.trim();
  const storefrontUrl = process.env.PUBLIC_STOREFRONT_URL?.trim();
  if (store !== 'IRON_SPRUE' || businessEnvironment !== 'staging' || !storefrontUrl) return configuredValue;

  const base = storefrontUrl.replace(/\/+$/, '');
  return kind === 'success'
    ? `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    : `${base}/checkout/cancel`;
}

export function getStoreStripeConfig(input: { store: string; environment?: string }): StoreStripeConfig {
  const store = normalizeStore(input.store);
  const environment = normalizeEnvironment(input.environment);
  const prefix = STORE_PREFIXES[store];
  const envPrefix = environment === 'live' ? 'LIVE' : 'TEST';
  const secretKeyName = `${prefix}_STRIPE_${envPrefix}_SECRET_KEY`;
  const webhookSecretName = `${prefix}_STRIPE_${envPrefix}_WEBHOOK_SECRET`;

  const accountIdName = `${prefix}_STRIPE_ACCOUNT_ID`;
  const requiresDedicatedAccount = store === 'IRON_SPRUE';
  const secretKey = requiresDedicatedAccount ? required(secretKeyName) : requiredWithFallback(secretKeyName, 'STRIPE_SECRET_KEY');
  const webhookSecret = requiresDedicatedAccount ? required(webhookSecretName) : requiredWithFallback(webhookSecretName, 'STRIPE_WEBHOOK_SECRET');
  const accountId = requiresDedicatedAccount ? required(accountIdName) : configured(accountIdName);

  const config: StoreStripeConfig = {
    store,
    environment,
    ...(accountId ? { accountId } : {}),
    secretKey,
    webhookSecret,
    statementDescriptor: required(`${prefix}_STRIPE_STATEMENT_DESCRIPTOR`),
    publicBusinessName: required(`${prefix}_STRIPE_PUBLIC_BUSINESS_NAME`),
    successUrl: configuredCheckoutUrl(store, 'success'),
    cancelUrl: configuredCheckoutUrl(store, 'cancel'),
    webhookPath: store === 'IRON_SPRUE' ? '/api/stripe/iron-sprue/webhook' : '/api/stripe/webhook',
  };
  const publishableKey = requiresDedicatedAccount
    ? configured(`${prefix}_STRIPE_${envPrefix}_PUBLISHABLE_KEY`)
    : configured(`${prefix}_STRIPE_${envPrefix}_PUBLISHABLE_KEY`) ?? configured('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  const supportEmail = configured(`${prefix}_SUPPORT_EMAIL`);
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
  if (input.expected.accountId && input.eventAccountId && input.eventAccountId !== input.expected.accountId) {
    throw new Error('Stripe event account does not match the configured store account.');
  }
  const eventEnvironment: CommerceEnvironment = input.eventLivemode ? 'live' : 'test';
  if (eventEnvironment !== input.expected.environment) {
    throw new Error('Stripe event environment does not match the order environment.');
  }
}
