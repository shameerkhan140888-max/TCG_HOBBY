import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME,
  IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY,
  NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT,
  UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT,
  hasTrackedIronSpruePurchase,
  getIronSprueAnalyticsConsent,
  markIronSpruePurchaseTracked,
  normalizeIronSprueAnalyticsConsent,
  setIronSprueAnalyticsConsent,
} from './analytics';

describe('Iron Sprue analytics helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalises unsupported consent values to unknown', () => {
    expect(normalizeIronSprueAnalyticsConsent('marketing')).toEqual({ status: 'saved', analytics: true, marketing: true });
    expect(normalizeIronSprueAnalyticsConsent('necessary')).toEqual(NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT);
    expect(normalizeIronSprueAnalyticsConsent('optional')).toEqual(UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT);
    expect(normalizeIronSprueAnalyticsConsent(null)).toEqual(UNKNOWN_IRON_SPRUE_ANALYTICS_CONSENT);
    expect(normalizeIronSprueAnalyticsConsent('{"analytics":true,"marketing":false}')).toEqual({
      status: 'saved',
      analytics: true,
      marketing: false,
    });
  });

  it('remembers purchase tracking by order number without throwing', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });

    expect(hasTrackedIronSpruePurchase('IS-20260821-ABC123')).toBe(false);
    markIronSpruePurchaseTracked('IS-20260821-ABC123');
    expect(hasTrackedIronSpruePurchase('IS-20260821-ABC123')).toBe(true);
  });

  it('mirrors consent to a first-party cookie so route changes do not reshow the banner', () => {
    const storage = new Map<string, string>();
    const documentStub = { cookie: '' };
    vi.stubGlobal('document', documentStub);
    vi.stubGlobal('CustomEvent', class CustomEvent<T = unknown> extends Event {
      detail: T | undefined;
      constructor(type: string, init?: CustomEventInit<T>) {
        super(type);
        this.detail = init?.detail;
      }
    });
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      dispatchEvent: vi.fn(),
    });

    setIronSprueAnalyticsConsent(NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT);

    expect(decodeURIComponent(documentStub.cookie)).toContain(`${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}={"analytics":false,"marketing":false}`);
    expect(storage.get(IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY)).toBe('{"analytics":false,"marketing":false}');
    expect(getIronSprueAnalyticsConsent()).toEqual(NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT);
  });
});
