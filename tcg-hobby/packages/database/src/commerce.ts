import { randomBytes } from 'node:crypto';
import type { CartLineItem, CartSummary, CurrencyCode, OrderSummary, ShippingMethod, ShippingMethodCode } from '@tcg-hobby/types';

export const shippingMethods: ShippingMethod[] = [
  {
    code: 'UK_STANDARD',
    name: 'UK Standard',
    description: 'Reliable tracked delivery for UK customers.',
    etaLabel: '2-4 business days',
    currency: 'GBP',
    amountMinor: 499,
    countryScope: 'GB',
  },
  {
    code: 'UK_EXPRESS',
    name: 'UK Express',
    description: 'Faster tracked delivery for urgent UK orders.',
    etaLabel: 'Next business day',
    currency: 'GBP',
    amountMinor: 899,
    countryScope: 'GB',
  },
  {
    code: 'WORLDWIDE_STANDARD',
    name: 'Worldwide Standard',
    description: 'Tracked international shipping for collectors abroad.',
    etaLabel: '5-10 business days',
    currency: 'GBP',
    amountMinor: 1499,
    countryScope: 'WORLDWIDE',
  },
];

function normalizeCountry(country: string) {
  return country.trim().toUpperCase();
}

function formatDatePart(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function getShippingMethodsForCountry(country: string) {
  const normalized = normalizeCountry(country);

  if (normalized === 'GB' || normalized === 'UK') {
    return shippingMethods;
  }

  return shippingMethods.filter((method) => method.countryScope === 'WORLDWIDE');
}

export function getShippingMethodByCode(code: ShippingMethodCode, country: string) {
  return getShippingMethodsForCountry(country).find((method) => method.code === code) ?? null;
}

export function calculateLineTotal(unitPriceMinor: number, quantity: number) {
  return unitPriceMinor * quantity;
}

export function calculateCartSubtotal(items: Pick<CartLineItem, 'quantity' | 'unitPriceMinor'>[]) {
  return items.reduce((subtotal, item) => subtotal + calculateLineTotal(item.unitPriceMinor, item.quantity), 0);
}

export function calculateCartSummary(items: CartLineItem[], currency: CurrencyCode = 'GBP'): CartSummary {
  return {
    items,
    subtotalMinor: calculateCartSubtotal(items),
    currency,
    totalItems: items.reduce((count, item) => count + item.quantity, 0),
  };
}

export function calculateOrderTotal(subtotalMinor: number, shippingMinor: number, taxMinor = 0) {
  return {
    subtotalMinor,
    shippingMinor,
    taxMinor,
    totalMinor: subtotalMinor + shippingMinor + taxMinor,
  };
}

export function calculateVatEstimateMinor(subtotalMinor: number, ratePercent = 20) {
  if (!Number.isFinite(subtotalMinor) || subtotalMinor <= 0) {
    return 0;
  }

  if (!Number.isFinite(ratePercent) || ratePercent <= 0) {
    return 0;
  }

  return Math.round((subtotalMinor * ratePercent) / 100);
}

export function validateQuantityAgainstAvailability(quantity: number, available: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, message: 'Quantity must be at least 1.' };
  }

  if (quantity > available) {
    return {
      ok: false,
      message: `Only ${available} in stock for this item.`,
    };
  }

  return { ok: true as const };
}

export function generateOrderNumber(date = new Date(), entropy = randomBytes(3).toString('hex').toUpperCase()) {
  return `TCG-${formatDatePart(date)}-${entropy}`;
}

export function buildCartReservationExpiry(date = new Date(), minutes = 30) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function summarizeOrderTotals(params: {
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor?: number;
}): OrderSummary {
  const taxMinor = params.taxMinor ?? 0;

  return {
    orderNumber: '',
    status: 'REQUIRES_PAYMENT',
    fulfilmentStatus: 'PENDING',
    currency: 'GBP',
    subtotalMinor: params.subtotalMinor,
    shippingMinor: params.shippingMinor,
    taxMinor,
    totalMinor: params.subtotalMinor + params.shippingMinor + taxMinor,
  };
}
