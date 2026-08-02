export const ANALYTICS_CONSENT_STORAGE_KEY = 'tcg_hobby_cookie_consent';
export const ANALYTICS_CONSENT_CHANGED_EVENT = 'tcg-hobby:analytics-consent-changed';

export type AnalyticsConsentState = 'unknown' | 'necessary' | 'marketing';

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeAnalyticsConsent(value: string | null | undefined): AnalyticsConsentState {
  return value === 'marketing' || value === 'necessary' ? value : 'unknown';
}

export function getAnalyticsConsent(): AnalyticsConsentState {
  if (!hasBrowserStorage()) {
    return 'unknown';
  }

  try {
    return normalizeAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return 'unknown';
  }
}

export function hasMarketingAnalyticsConsent() {
  return getAnalyticsConsent() === 'marketing';
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsentState, 'unknown'>) {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, { detail: value }));
}

export function clearAnalyticsConsent() {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, { detail: 'unknown' }));
}
