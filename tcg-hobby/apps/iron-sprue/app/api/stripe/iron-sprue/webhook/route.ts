import Stripe from 'stripe';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getStoreStripeConfig, processIronSprueStripeWebhookEvent } from '@tcg-hobby/database';

export const runtime = 'nodejs';

function loadLocalStripeEnvFallback() {
  if (process.env.NODE_ENV === 'production') return;
  const envPaths = [
    resolve(join(process.cwd(), '.env.local')),
    resolve(join(process.cwd(), 'apps', 'iron-sprue', '.env.local')),
    resolve(join(process.cwd(), '..', '..', '.env.local')),
  ];
  const allowedKeys = new Set([
    'IRON_SPRUE_STRIPE_ACCOUNT_ID',
    'IRON_SPRUE_STRIPE_TEST_SECRET_KEY',
    'IRON_SPRUE_STRIPE_TEST_WEBHOOK_SECRET',
    'IRON_SPRUE_STRIPE_TEST_PUBLISHABLE_KEY',
    'IRON_SPRUE_STRIPE_STATEMENT_DESCRIPTOR',
    'IRON_SPRUE_STRIPE_PUBLIC_BUSINESS_NAME',
    'IRON_SPRUE_CHECKOUT_SUCCESS_URL',
    'IRON_SPRUE_CHECKOUT_CANCEL_URL',
    'IRON_SPRUE_SUPPORT_EMAIL',
    'COMMERCE_ENVIRONMENT',
  ]);

  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!allowedKeys.has(key) || process.env[key]) continue;
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export async function POST(request: Request) {
  loadLocalStripeEnvFallback();
  const signature = request.headers.get('stripe-signature') ?? '';
  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const config = getStoreStripeConfig({ store: 'IRON_SPRUE' });
    event = Stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook.';
    console.warn('iron_sprue_stripe_webhook_rejected', { reason: message });
    return Response.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }

  try {
    const result = await processIronSprueStripeWebhookEvent(event);
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
