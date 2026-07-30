import {
  constructStripeWebhookEvent,
  processStripeWebhookEvent,
  requireStripeWebhookSecret,
} from '@tcg-hobby/database';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireStripeWebhookSecret();
  } catch {
    console.error('stripe_webhook_configuration_error', {
      webhookSecretConfigured: false,
    });
    return Response.json({ error: 'Stripe webhook configuration is unavailable.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    console.warn('stripe_webhook_signature_rejected', { reason: 'missing_signature' });
    return Response.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch {
    console.warn('stripe_webhook_signature_rejected', { reason: 'invalid_signature' });
    return Response.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }

  console.info('stripe_webhook_received', {
    eventId: event.id,
    eventType: event.type,
  });

  try {
    const result = await processStripeWebhookEvent(event);
    console.info('stripe_webhook_processed', {
      eventId: result.eventId,
      eventType: result.eventType,
      outcome: result.outcome,
      orderMatched: Boolean(result.orderId),
    });
    return Response.json({ received: true });
  } catch {
    console.error('stripe_webhook_processing_failed', {
      eventId: event.id,
      eventType: event.type,
    });
    return Response.json({ error: 'Stripe webhook processing failed.' }, { status: 500 });
  }
}
