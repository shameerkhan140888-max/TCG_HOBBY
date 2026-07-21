import type { CatalogueSort, PublicProductSummary, PublicStockState } from '@tcg-hobby/types';

export function normaliseHttpOrigin(value: string, label: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.origin;
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS origin.`);
  }
}

export function buildCatalogueQuery(input: { search: string; game: string; productType: string; set: string; language: string; category: string; sort: CatalogueSort; page: number; pageSize: number }): string {
  return new URLSearchParams({ ...input, page: String(input.page), pageSize: String(input.pageSize) }).toString();
}

export function mergeUniqueProducts(current: PublicProductSummary[], incoming: PublicProductSummary[]): PublicProductSummary[] {
  return Array.from(new Map([...current, ...incoming].map((item) => [item.id, item])).values());
}

export function stockLabel(state: PublicStockState): string {
  return state === 'LOW_STOCK' ? 'Low stock' : state === 'IN_STOCK' ? 'In stock' : 'Out of stock';
}

export function isTrustedCheckoutUrl(value: string, storefrontOrigin: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.hostname === 'checkout.stripe.com' || url.hostname.endsWith('.stripe.com'))) return true;
    return url.origin === storefrontOrigin && ['https:', 'http:'].includes(url.protocol);
  } catch { return false; }
}
