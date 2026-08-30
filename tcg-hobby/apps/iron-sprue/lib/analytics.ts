export const IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY = 'iron_sprue_cookie_consent';
export const IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME = 'iron_sprue_cookie_consent';
export const IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT = 'iron-sprue:analytics-consent-changed';
export const IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT = 'iron-sprue:ecommerce-event';

export type IronSprueAnalyticsConsent =
  | { status: 'unknown'; analytics: false; marketing: false }
  | { status: 'saved'; analytics: boolean; marketing: boolean };
export type SavedIronSprueAnalyticsConsent = Extract<IronSprueAnalyticsConsent, { status: 'saved' }>;

export const UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT: IronSprueAnalyticsConsent = {
  status: 'unknown',
  analytics: false,
  marketing: false,
};

export const NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT: SavedIronSprueAnalyticsConsent = {
  status: 'saved',
  analytics: false,
  marketing: false,
};

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeIronSprueAnalyticsConsent(value: string | null | undefined): IronSprueAnalyticsConsent {
  if (!value) return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
  if (value === 'marketing' || value === 'all') return { status: 'saved', analytics: true, marketing: true };
  if (value === 'analytics') return { status: 'saved', analytics: true, marketing: false };
  if (value === 'necessary') return NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT;
  try {
    const parsed = JSON.parse(value) as { analytics?: unknown; marketing?: unknown };
    if (typeof parsed === 'object' && parsed) {
      return { status: 'saved', analytics: parsed.analytics === true, marketing: parsed.marketing === true };
    }
  } catch {
    return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
  }
  return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
}

function readConsentCookie(): IronSprueAnalyticsConsent {
  if (typeof document === 'undefined') return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
  const entry = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=`));
  if (!entry) return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
  return normalizeIronSprueAnalyticsConsent(decodeURIComponent(entry.split('=').slice(1).join('=')));
}

function serializeConsent(value: SavedIronSprueAnalyticsConsent) {
  return JSON.stringify({ analytics: value.analytics, marketing: value.marketing });
}

function writeConsentCookie(value: SavedIronSprueAnalyticsConsent) {
  if (typeof document === 'undefined') return;
  document.cookie = `${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=${encodeURIComponent(serializeConsent(value))}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function clearConsentCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function getIronSprueAnalyticsConsent(): IronSprueAnalyticsConsent {
  const cookieConsent = readConsentCookie();
  if (cookieConsent.status !== 'unknown') return cookieConsent;
  if (!hasBrowserStorage()) return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
  try {
    return normalizeIronSprueAnalyticsConsent(window.localStorage.getItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT;
  }
}

export function setIronSprueAnalyticsConsent(value: SavedIronSprueAnalyticsConsent) {
  writeConsentCookie(value);
  if (hasBrowserStorage()) {
    window.localStorage.setItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY, serializeConsent(value));
    window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, { detail: value }));
  }
}

export function clearIronSprueAnalyticsConsent() {
  clearConsentCookie();
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, { detail: UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT }));
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
