'use server';

import type { CheckoutAddress, ShippingMethodCode } from '@tcg-hobby/types';
import {
  attachStripeSessionToOrder,
  createPendingCheckoutOrder,
  createStripeCheckoutSession,
  getAvailableShippingMethods,
  releaseCheckoutOrderReservation,
} from '@tcg-hobby/database';
import { redirect } from 'next/navigation';
import type { CheckoutFieldErrors, CheckoutFormState } from './checkout';
import { getCurrentCustomerCart } from './cart';
import { getCurrentCustomerSession } from './auth';

function siteUrl() {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function sanitizeReturnUrl(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/checkout';
  }

  return value;
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
  const shippingMethods = await getAvailableShippingMethods(shippingAddress.country);

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

  const reservation = await createPendingCheckoutOrder(customerUserId, cart, {
    shippingAddress,
    shippingMethodCode: shippingMethod.code,
  });

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

    const checkoutSession = await createStripeCheckoutSession({
      orderNumber: reservation.order.orderNumber,
      customerEmail: shippingAddress.email,
      lineItems,
      successUrl: `${siteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl()}${returnTo}`,
    });

    await attachStripeSessionToOrder({
      orderId: reservation.order.id,
      stripeCheckoutSessionId: checkoutSession.id,
      stripeCheckoutUrl: checkoutSession.url,
      paymentIntentId: checkoutSession.payment_intent,
    });

    redirect(checkoutSession.url ?? `/checkout/success?session_id=${checkoutSession.id}`);
  } catch (error) {
    await releaseCheckoutOrderReservation(reservation.order.id);
    const message = error instanceof Error ? error.message : 'Unable to start checkout.';

    return {
      formError: message,
      fieldErrors: {},
      values: shippingAddress,
      shippingMethods,
    };
  }
}
