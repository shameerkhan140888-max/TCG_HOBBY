import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY, NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT } from '../lib/analytics';
import {
  IronSprueCookieConsentBanner,
  initialiseIronSprueGoogleConsentFromStoredPreference,
  updateIronSprueGoogleConsent,
} from './analytics-consent';

function queuedGtagCalls() {
  return (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

describe('Iron Sprue cookie consent banner', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not render before stored consent has been checked', () => {
    const markup = renderToStaticMarkup(<IronSprueCookieConsentBanner />);

    expect(markup).toBe('');
  });

  it('restores saved analytics consent into Google Consent Mode on page load', () => {
    const storage = new Map<string, string>([
      [IRON_SPRUE_ANALYTICS_CONSENT_STORAGE_KEY, '{"analytics":true,"marketing":false}'],
    ]);
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('window', {
      dataLayer: [],
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
      },
    });

    const consent = initialiseIronSprueGoogleConsentFromStoredPreference();

    expect(consent).toEqual({ status: 'saved', analytics: true, marketing: false });
    expect(queuedGtagCalls()).toEqual([
      ['consent', 'default', {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'denied',
      }],
      ['consent', 'update', {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'granted',
      }],
    ]);
  });

  it('pushes denied and granted Google consent updates without granting ads from analytics-only consent', () => {
    vi.stubGlobal('window', { dataLayer: [] });

    updateIronSprueGoogleConsent(NECESSARY_IRON_SPRUE_ANALYTICS_CONSENT);
    updateIronSprueGoogleConsent({ status: 'saved', analytics: true, marketing: false });

    expect(queuedGtagCalls()).toEqual([
      ['consent', 'update', {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'denied',
      }],
      ['consent', 'update', {
        ad_personalization: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'granted',
      }],
    ]);
  });
});
