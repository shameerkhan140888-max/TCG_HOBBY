import Stripe from 'stripe';

export function requireStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) {
    throw new Error('Stripe Checkout is not configured. Set the server-only STRIPE_SECRET_KEY environment variable.');
  }
  return value;
}

export function isStripeCheckoutConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function requireStripeWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!value) {
    throw new Error('Stripe webhooks are not configured. Set the server-only STRIPE_WEBHOOK_SECRET environment variable.');
  }
  return value;
}

export function constructStripeWebhookEvent(rawBody: string | Buffer, signature: string) {
  if (!signature.trim()) {
    throw new Error('The Stripe-Signature header is required.');
  }

  return Stripe.webhooks.constructEvent(rawBody, signature, requireStripeWebhookSecret());
}
