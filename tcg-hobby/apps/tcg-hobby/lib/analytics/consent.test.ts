import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  clearAnalyticsConsent,
  getAnalyticsConsent,
  hasMarketingAnalyticsConsent,
  normalizeAnalyticsConsent,
  setAnalyticsConsent,
} from './consent';

function stubBrowserStorage() {
  const storage = new Map<string, string>();
  const events = new EventTarget();

  vi.stubGlobal('window', {
    localStorage: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
    },
    dispatchEvent: (event: Event) => events.dispatchEvent(event),
    addEventListener: (eventName: string, listener: EventListener) => events.addEventListener(eventName, listener),
    removeEventListener: (eventName: string, listener: EventListener) => events.removeEventListener(eventName, listener),
  });

  return storage;
}

describe('analytics consent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes missing and rejected consent as non-marketing', () => {
    expect(normalizeAnalyticsConsent(null)).toBe('unknown');
    expect(normalizeAnalyticsConsent('necessary')).toBe('necessary');
    expect(normalizeAnalyticsConsent('marketing')).toBe('marketing');
    expect(normalizeAnalyticsConsent('yes')).toBe('unknown');
  });

  it('blocks tracking before consent, after reject all, and after withdrawal', () => {
    const storage = stubBrowserStorage();

    expect(getAnalyticsConsent()).toBe('unknown');
    expect(hasMarketingAnalyticsConsent()).toBe(false);

    setAnalyticsConsent('necessary');
    expect(storage.get(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('necessary');
    expect(hasMarketingAnalyticsConsent()).toBe(false);

    setAnalyticsConsent('marketing');
    expect(hasMarketingAnalyticsConsent()).toBe(true);

    clearAnalyticsConsent();
    expect(getAnalyticsConsent()).toBe('unknown');
    expect(hasMarketingAnalyticsConsent()).toBe(false);
  });

  it('emits a consent-change event when marketing is accepted', () => {
    stubBrowserStorage();
    const listener = vi.fn();

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, listener);
    setAnalyticsConsent('marketing');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
