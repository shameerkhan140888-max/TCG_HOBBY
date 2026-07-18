import type { Money } from '@tcg-hobby/types';

export function formatMoney(value: Money, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinor / 100);
}

export function formatBasketSummary(subtotalMinor: number, itemCount: number, currency = 'GBP'): string {
  const subtotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(subtotalMinor / 100);

  return `${subtotal} · ${itemCount} item${itemCount === 1 ? '' : 's'}`;
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildStorefrontProductPath(slug: string): string {
  return `/catalogue/${encodeURIComponent(slug.trim())}`;
}

export function clampMinorAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

export function sumMinorAmounts(values: number[]) {
  return values.reduce((total, value) => total + clampMinorAmount(value), 0);
}

export function calculatePercentage(numeratorMinor: number, denominatorMinor: number) {
  if (denominatorMinor <= 0) {
    return 0;
  }

  return Math.round((numeratorMinor / denominatorMinor) * 100);
}

export function roundToMinor(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}
