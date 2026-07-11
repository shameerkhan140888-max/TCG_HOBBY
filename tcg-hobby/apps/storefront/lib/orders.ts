import 'server-only';

import {
  finalizePaidCheckoutOrder,
  getCustomerOrderByNumber,
  getCustomerOrders,
  getOrderByStripeCheckoutSessionId,
  retrieveStripeCheckoutSession,
  type CustomerOrderSummary,
  type OrderWithItems,
} from '@tcg-hobby/database';
import { requireCustomerSession } from './auth';

export async function getCurrentCustomerOrders(): Promise<CustomerOrderSummary[]> {
  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Forders');
  return getCustomerOrders(session.user.id);
}

export async function getCurrentCustomerOrder(orderNumber: string): Promise<OrderWithItems | null> {
  const session = await requireCustomerSession(`/login?callbackUrl=%2Faccount%2Forders%2F${encodeURIComponent(orderNumber)}`);
  return getCustomerOrderByNumber(session.user.id, orderNumber);
}

export async function finalizeOrderFromStripeSession(sessionId: string): Promise<OrderWithItems | null> {
  const stripeSession = await retrieveStripeCheckoutSession(sessionId);

  if (stripeSession.payment_status !== 'paid') {
    return null;
  }

  const orderRecord = await getOrderByStripeCheckoutSessionId(stripeSession.id);
  if (!orderRecord) {
    return null;
  }

  const order = await finalizePaidCheckoutOrder({
    orderId: orderRecord.id,
    paymentIntentId: stripeSession.payment_intent,
    stripeCheckoutSessionId: stripeSession.id,
  });

  return order;
}
