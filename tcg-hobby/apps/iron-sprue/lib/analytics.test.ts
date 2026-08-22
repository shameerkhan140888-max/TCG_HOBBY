import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME,
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
    expect(normalizeIronSprueAnalyticsConsent('marketing')).toBe('marketing');
    expect(normalizeIronSprueAnalyticsConsent('necessary')).toBe('necessary');
    expect(normalizeIronSprueAnalyticsConsent('optional')).toBe('unknown');
    expect(normalizeIronSprueAnalyticsConsent(null)).toBe('unknown');
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

    setIronSprueAnalyticsConsent('necessary');

    expect(documentStub.cookie).toContain(`${IRON_SPRUE_ANALYTICS_CONSENT_COOKIE_NAME}=necessary`);
    expect(getIronSprueAnalyticsConsent()).toBe('necessary');
  });
});
