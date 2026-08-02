'use server';

import type { CheckoutAddress, ShippingMethodCode } from '@tcg-hobby/types';
import { randomUUID } from 'node:crypto';
import {
  attachStripeSessionToOrder,
  createPendingCheckoutOrder,
  createStripeCheckoutSession,
  getAvailableShippingMethods,
  isStripeCheckoutConfigured,
  releaseCheckoutOrderReservation,
} from '@tcg-hobby/database/storefront';
import type { CheckoutFieldErrors, CheckoutFormState } from './checkout';
import { getCurrentCustomerCart } from './cart';
import { getCurrentCustomerSession } from './auth';
import { resolveInternalReturnTo } from './internal-return';

function siteUrl() {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function sanitizeReturnUrl(value: FormDataEntryValue | null) {
  return resolveInternalReturnTo(typeof value === 'string' ? value : null, '/checkout');
}

function parseInput(formData: FormData) {
  const shippingAddress: CheckoutAddress & { shippingMethodCode: ShippingMethodCode | '' } = {
    fullName: String(formData.get('fullName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    line1: String(formData.get('line1') ?? '').trim(),
    line2: String(formData.get('line2') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    region: String(formData.get('region') ?? '').trim(),
    postalCode: String(formData.get('postalCode') ?? '').trim(),
    country: String(formData.get('country') ?? 'GB').trim().toUpperCase(),
    shippingMethodCode: String(formData.get('shippingMethodCode') ?? '') as ShippingMethodCode | '',
  };

  const fieldErrors: CheckoutFieldErrors = {};

  if (!shippingAddress.fullName) fieldErrors.fullName = 'Enter the full name for this delivery.';
  if (!shippingAddress.email) {
    fieldErrors.email = 'Enter a delivery email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }
  if (!shippingAddress.line1) fieldErrors.line1 = 'Enter the first address line.';
  if (!shippingAddress.city) fieldErrors.city = 'Enter the town or city.';
  if (!shippingAddress.postalCode) fieldErrors.postalCode = 'Enter the postal code.';
  if (!shippingAddress.country) fieldErrors.country = 'Enter a country code.';
  if (!shippingAddress.shippingMethodCode) fieldErrors.shippingMethodCode = 'Choose a shipping method.';

  return {
    shippingAddress,
    fieldErrors,
  };
}

export async function placeCheckoutOrderAction(_state: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const session = await getCurrentCustomerSession();
  const cart = await getCurrentCustomerCart();
  const { shippingAddress, fieldErrors } = parseInput(formData);
  const returnTo = sanitizeReturnUrl(formData.get('returnTo'));
  const shippingMethods = await getAvailableShippingMethods(shippingAddress.country, cart.subtotalMinor, cart.items);
  const checkoutAttemptId = String(formData.get('checkoutAttemptId') ?? '').trim() || randomUUID();

  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
      values: shippingAddress,
      shippingMethods,
    };
  }

  const shippingMethod = shippingMethods.find((method) => method.code === shippingAddress.shippingMethodCode);

  if (!shippingMethod) {
    return {
      formError: 'Choose a valid shipping method for the selected country.',
      fieldErrors: {
        shippingMethodCode: 'Choose a valid shipping method.',
      },
      values: shippingAddress,
      shippingMethods,
    };
  }

  const customerUserId = session?.user.role === 'CUSTOMER' && session ? session.user.id : null;

  let reservation: Awaited<ReturnType<typeof createPendingCheckoutOrder>>;
  try {
    reservation = await createPendingCheckoutOrder(customerUserId, cart, {
      shippingAddress,
      shippingMethodCode: shippingMethod.code,
      checkoutAttemptId,
    });
  } catch {
    return {
      formError: 'We could not reserve your basket for payment. Review your basket and try again.',
      fieldErrors: {},
      values: shippingAddress,
      shippingMethods,
    };
  }

  let checkoutSession;
  try {
    const lineItems = [
      ...reservation.items.map((item) => ({
        name: item.productName,
        description: `${item.quantity} x ${item.productSlug}`,
        amountMinor: item.unitPriceMinor,
        quantity: item.quantity,
      })),
      {
        name: shippingMethod.name,
        description: reservation.shippingMinor === 0 ? `${shippingMethod.etaLabel} - free for this basket` : shippingMethod.etaLabel,
        amountMinor: reservation.shippingMinor,
        quantity: 1,
      },
    ];

    checkoutSession = await createStripeCheckoutSession({
      orderId: reservation.order.id,
      checkoutAttemptId,
      orderNumber: reservation.order.orderNumber,
      customerEmail: shippingAddress.email,
      lineItems,
      successUrl: `${siteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl()}/checkout/cancel?orderId=${encodeURIComponent(reservation.order.id)}&attemptId=${encodeURIComponent(checkoutAttemptId)}&returnTo=${encodeURIComponent(returnTo)}`,
      idempotencyKey: `checkout-session:${reservation.order.id}`,
    });
  } catch (error) {
    console.error('stripe_checkout_start_failed', {
      configured: isStripeCheckoutConfigured(),
      reason: isStripeCheckoutConfigured() ? 'provider_request_failed' : 'missing_secret_key',
    });
    await releaseCheckoutOrderReservation(reservation.order.id);

    return {
      formError: 'We could not start secure payment. Your basket is unchanged, so please try again.',
      fieldErrors: {},
      values: shippingAddress,
      shippingMethods,
    };
  }

  if (!checkoutSession.url) {
    await releaseCheckoutOrderReservation(reservation.order.id);
    return {
      formError: 'Secure payment is temporarily unavailable. Your basket is unchanged, so please try again.',
      fieldErrors: {},
      values: shippingAddress,
      shippingMethods,
    };
  }

  try {
    await attachStripeSessionToOrder({
      orderId: reservation.order.id,
      stripeCheckoutSessionId: checkoutSession.id,
      stripeCheckoutUrl: checkoutSession.url,
      paymentIntentId: checkoutSession.payment_intent,
    });
  } catch {
    return {
      formError: 'Your payment session was created but could not be linked safely. Please retry to resume it.',
      fieldErrors: {},
      values: shippingAddress,
      shippingMethods,
    };
  }

  return {
    checkoutUrl: checkoutSession.url,
    fieldErrors: {},
    values: shippingAddress,
    shippingMethods,
  };
}
