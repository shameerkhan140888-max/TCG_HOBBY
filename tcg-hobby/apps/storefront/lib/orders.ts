import 'server-only';

import {
  finalizePaidCheckoutOrder,
  getCustomerOrderByNumber,
  getCustomerOrders,
  getOrderByStripeCheckoutSessionId,
  retrieveStripeCheckoutSession,
} from '@tcg-hobby/database';
import { requireCustomerSession } from './auth';
import { clearGuestCart } from './cart';

export async function getCurrentCustomerOrders() {
  const session = await requireCustomerSession('/login?callbackUrl=%2Faccount%2Forders');
  return getCustomerOrders(session.user.id);
}

export async function getCurrentCustomerOrder(orderNumber: string) {
  const session = await requireCustomerSession(`/login?callbackUrl=%2Faccount%2Forders%2F${encodeURIComponent(orderNumber)}`);
  return getCustomerOrderByNumber(session.user.id, orderNumber);
}

export async function finalizeOrderFromStripeSession(sessionId: string) {
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

  if (!order.userId) {
    await clearGuestCart();
  }

  return order;
}
