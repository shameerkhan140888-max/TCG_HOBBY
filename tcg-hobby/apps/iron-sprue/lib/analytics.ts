export const IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY = 'iron_sprue_cookie_consent';
export const IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME = 'iron_sprue_cookie_consent';
export const IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT = 'iron-sprue:analytics-consent-changed';
export const IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT = 'iron-sprue:ecommerce-event';

export type IronSprueAnalyticsConsent = 'unknown' | 'necessary' | 'marketing';

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeIronSprueAnalyticsConsent(value: string | null | undefined): IronSprueAnalyticsConsent {
  return value === 'marketing' || value === 'necessary' ? value : 'unknown';
}

function readConsentCookie(): IronSprueAnalyticsConsent {
  if (typeof document === 'undefined') return 'unknown';
  const entry = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=`));
  if (!entry) return 'unknown';
  return normalizeIronSprueAnalyticsConsent(decodeURIComponent(entry.split('=').slice(1).join('=')));
}

function writeConsentCookie(value: Exclude<IronSprueAnalyticsConsent, 'unknown'>) {
  if (typeof document === 'undefined') return;
  document.cookie = `${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function clearConsentCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function getIronSprueAnalyticsConsent(): IronSprueAnalyticsConsent {
  const cookieConsent = readConsentCookie();
  if (cookieConsent !== 'unknown') return cookieConsent;
  if (!hasBrowserStorage()) return 'unknown';
  try {
    return normalizeIronSprueAnalyticsConsent(window.localStorage.getItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return 'unknown';
  }
}

export function setIronSprueAnalyticsConsent(value: Exclude<IronSprueAnalyticsConsent, 'unknown'>) {
  writeConsentCookie(value);
  if (hasBrowserStorage()) {
    window.localStorage.setItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, { detail: value }));
  }
}

export function clearIronSprueAnalyticsConsent() {
  clearConsentCookie();
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, { detail: 'unknown' }));
  }
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
