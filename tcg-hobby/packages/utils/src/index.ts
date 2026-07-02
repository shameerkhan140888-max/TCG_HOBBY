import type { Money } from '@tcg-hobby/types';

export function formatMoney(value: Money, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinor / 100);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
