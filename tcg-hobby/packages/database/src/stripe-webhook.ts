import type Stripe from 'stripe';
import { prisma } from './client.js';
import {
  finalizePaidCheckoutOrder,
  getOrderByStripeCheckoutSessionId,
  releaseCheckoutOrderReservation,
} from './orders.js';

type DatabaseClient = typeof prisma;

export type StripeWebhookProcessingResult = {
  eventId: string;
  eventType: string;
  outcome: 'processed' | 'duplicate' | 'ignored';
  orderId: string | null;
};

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function objectId(event: Stripe.Event) {
  const object = event.data.object as { id?: unknown };
  return typeof object.id === 'string' ? object.id : null;
}

function metadataOrderId(metadata: Stripe.Metadata | null | undefined) {
  const value = metadata?.orderId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function paymentIntentId(value: string | Stripe.PaymentIntent | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

async function findOrderForSession(session: Stripe.Checkout.Session, db: DatabaseClient) {
  const linked = await getOrderByStripeCheckoutSessionId(session.id, db);
  if (linked) return linked;

  const orderId = metadataOrderId(session.metadata);
  if (!orderId) return null;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      totalMinor: true,
      currency: true,
      paymentStatus: true,
    },
  });
  return order;
}

async function findOrderForPaymentIntent(intent: Stripe.PaymentIntent, db: DatabaseClient) {
  const linked = await db.order.findUnique({
    where: { paymentIntentId: intent.id },
    select: { id: true },
  });
  if (linked) return linked;

  const orderId = metadataOrderId(intent.metadata);
  if (!orderId) return null;
  return db.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
}

async function beginEventAudit(event: Stripe.Event, db: DatabaseClient) {
  try {
    return await db.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        stripeObjectId: objectId(event),
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return db.stripeWebhookEvent.findUniqueOrThrow({
      where: { stripeEventId: event.id },
    });
  }
}

async function finishEventAudit(
  eventId: string,
  state: 'PROCESSED' | 'IGNORED',
  outcome: string,
  orderId: string | null,
  db: DatabaseClient,
) {
  await db.stripeWebhookEvent.update({
    where: { stripeEventId: eventId },
    data: {
      processingState: state,
      outcome,
      orderId,
      errorCode: null,
      processedAt: new Date(),
    },
  });
}

async function failEventAudit(eventId: string, errorCode: string, db: DatabaseClient) {
  await db.stripeWebhookEvent.update({
    where: { stripeEventId: eventId },
    data: {
      processingState: 'FAILED',
      errorCode,
    },
  });
}

async function processCompletedSession(session: Stripe.Checkout.Session, db: DatabaseClient) {
  const order = await findOrderForSession(session, db);
  if (!order) return { outcome: 'unknown_checkout_session', orderId: null };

  if (session.payment_status !== 'paid') {
    return { outcome: 'payment_not_paid', orderId: order.id };
  }
  if (session.amount_total !== order.totalMinor || session.currency?.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error('STRIPE_TOTAL_MISMATCH');
  }

  await finalizePaidCheckoutOrder({
    orderId: order.id,
    paymentIntentId: paymentIntentId(session.payment_intent),
    stripeCheckoutSessionId: session.id,
  }, db);
  return { outcome: 'payment_finalized', orderId: order.id };
}

async function processExpiredSession(session: Stripe.Checkout.Session, db: DatabaseClient) {
  const order = await findOrderForSession(session, db);
  if (!order) return { outcome: 'unknown_checkout_session', orderId: null };
  await releaseCheckoutOrderReservation(order.id, db, 'CANCELED');
  return { outcome: 'reservation_released', orderId: order.id };
}

async function processFailedPayment(intent: Stripe.PaymentIntent, db: DatabaseClient) {
  const order = await findOrderForPaymentIntent(intent, db);
  if (!order) return { outcome: 'unknown_payment_intent', orderId: null };
  await releaseCheckoutOrderReservation(order.id, db, 'FAILED');
  return { outcome: 'payment_failed', orderId: order.id };
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  db: DatabaseClient = prisma,
): Promise<StripeWebhookProcessingResult> {
  const audit = await beginEventAudit(event, db);
  if (audit.processedAt) {
    return {
      eventId: event.id,
      eventType: event.type,
      outcome: 'duplicate',
      orderId: audit.orderId,
    };
  }

  try {
    let result: { outcome: string; orderId: string | null } | null = null;
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      result = await processCompletedSession(event.data.object, db);
    } else if (event.type === 'checkout.session.expired') {
      result = await processExpiredSession(event.data.object, db);
    } else if (event.type === 'payment_intent.payment_failed') {
      result = await processFailedPayment(event.data.object, db);
    }

    if (!result) {
      await finishEventAudit(event.id, 'IGNORED', 'unsupported_event', null, db);
      return { eventId: event.id, eventType: event.type, outcome: 'ignored', orderId: null };
    }

    const ignored = result.orderId === null || result.outcome === 'payment_not_paid';
    await finishEventAudit(event.id, ignored ? 'IGNORED' : 'PROCESSED', result.outcome, result.orderId, db);
    return {
      eventId: event.id,
      eventType: event.type,
      outcome: ignored ? 'ignored' : 'processed',
      orderId: result.orderId,
    };
  } catch (error) {
    const errorCode = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : 'WEBHOOK_PROCESSING_FAILED';
    await failEventAudit(event.id, errorCode, db);
    throw error;
  }
}
