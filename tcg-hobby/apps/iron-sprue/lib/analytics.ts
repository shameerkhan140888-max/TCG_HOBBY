export const IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY = 'iron_sprue_cookie_consent';
export const IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT = 'iron-sprue:analytics-consent-changed';
export const IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT = 'iron-sprue:ecommerce-event';

export type IronSprueAnalyticsConsent = 'unknown' | 'necessary' | 'marketing';

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeIronSprueAnalyticsConsent(value: string | null | undefined): IronSprueAnalyticsConsent {
  return value === 'marketing' || value === 'necessary' ? value : 'unknown';
}

export function getIronSprueAnalyticsConsent(): IronSprueAnalyticsConsent {
  if (!hasBrowserStorage()) return 'unknown';
  try {
    return normalizeIronSprueAnalyticsConsent(window.localStorage.getItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return 'unknown';
  }
}

export function setIronSprueAnalyticsConsent(value: Exclude<IronSprueAnalyticsConsent, 'unknown'>) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, { detail: value }));
}

export function clearIronSprueAnalyticsConsent() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, { detail: 'unknown' }));
}

export function trackIronSprueEcommerceEvent(eventName: 'add_to_cart' | 'begin_checkout' | 'purchase', parameters: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT, { detail: { eventName, parameters } }));
}

export function hasTrackedIronSpruePurchase(orderNumber: string) {
  if (!hasBrowserStorage()) return false;
  try {
    return window.localStorage.getItem(`iron_sprue_purchase_tracked:${orderNumber}`) === '1';
  } catch {
    return false;
  }
}

export function markIronSpruePurchaseTracked(orderNumber: string) {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.setItem(`iron_sprue_purchase_tracked:${orderNumber}`, '1');
  } catch {
    // Analytics bookkeeping must not affect checkout completion.
  }
}
