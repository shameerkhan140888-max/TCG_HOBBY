import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hasTrackedIronSpruePurchase,
  markIronSpruePurchaseTracked,
  normalizeIronSprueAnalyticsConsent,
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
});
