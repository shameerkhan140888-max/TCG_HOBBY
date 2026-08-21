'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT,
  IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT,
  clearIronSprueAnalyticsConsent,
  getIronSprueAnalyticsConsent,
  setIronSprueAnalyticsConsent,
  type IronSprueAnalyticsConsent,
} from '../lib/analytics';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: {
      (command: 'init', pixelId: string): void;
      (command: 'track', eventName: string, parameters?: Record<string, unknown>): void;
    };
    _fbq?: unknown;
  }
}

let metaPixelId: string | null = null;
let metaScriptPromise: Promise<void> | null = null;
let gaScriptPromise: Promise<void> | null = null;

function loadScript(src: string, marker: string) {
  if (typeof window === 'undefined') return Promise.resolve();
  const existing = document.querySelector(`script[data-iron-sprue-analytics="${marker}"]`);
  if (existing) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.dataset.ironSprueAnalytics = marker;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`${marker} analytics script failed to load.`));
    document.head.appendChild(script);
  });
}

async function initializeGa4(measurementId: string) {
  if (!measurementId || typeof window === 'undefined') return false;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  gaScriptPromise = gaScriptPromise ?? loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, 'ga4');
  try {
    await gaScriptPromise;
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });
    return true;
  } catch {
    return false;
  }
}

async function initializeMeta(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return false;
  if (!window.fbq) {
    const queue: unknown[] = [];
    const fbq = ((...args: unknown[]) => queue.push(args)) as Window['fbq'] & { queue?: unknown[]; loaded?: boolean; version?: string };
    fbq.queue = queue;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
  }
  if (metaPixelId !== pixelId) {
    window.fbq?.('init', pixelId);
    metaPixelId = pixelId;
  }
  metaScriptPromise = metaScriptPromise ?? loadScript('https://connect.facebook.net/en_US/fbevents.js', 'meta');
  try {
    await metaScriptPromise;
    return true;
  } catch {
    return false;
  }
}

function eventNameForPath(pathname: string) {
  if (pathname.startsWith('/products/')) return 'view_item';
  if (pathname === '/checkout') return 'begin_checkout';
  return 'page_view';
}

function metaEventName(eventName: string) {
  if (eventName === 'view_item') return 'ViewContent';
  if (eventName === 'begin_checkout') return 'InitiateCheckout';
  if (eventName === 'add_to_cart') return 'AddToCart';
  if (eventName === 'purchase') return 'Purchase';
  return 'PageView';
}

function IronSprueAnalyticsRuntime({ ga4Id, metaPixelId: pixelId }: { ga4Id: string | null; metaPixelId: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<IronSprueAnalyticsConsent>('unknown');
  const lastEventKey = useRef<string | null>(null);

  useEffect(() => {
    setConsent(getIronSprueAnalyticsConsent());
    function handleConsentChange() {
      setConsent(getIronSprueAnalyticsConsent());
    }
    window.addEventListener(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
    window.addEventListener('storage', handleConsentChange);
    return () => {
      window.removeEventListener(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
      window.removeEventListener('storage', handleConsentChange);
    };
  }, []);

  useEffect(() => {
    if (consent !== 'marketing') return;
    const key = `${pathname}?${searchParams.toString()}`;
    if (lastEventKey.current === key) return;
    lastEventKey.current = key;
    const eventName = eventNameForPath(pathname);

    void initializeGa4(ga4Id ?? '').then((loaded) => {
      if (loaded && getIronSprueAnalyticsConsent() === 'marketing') {
        window.gtag?.('event', eventName, { page_path: pathname, page_location: window.location.href });
      }
    });
    void initializeMeta(pixelId ?? '').then((loaded) => {
      if (loaded && getIronSprueAnalyticsConsent() === 'marketing') {
        window.fbq?.('track', metaEventName(eventName));
      }
    });
  }, [consent, ga4Id, pathname, pixelId, searchParams]);

  useEffect(() => {
    function handleEcommerceEvent(event: Event) {
      if (getIronSprueAnalyticsConsent() !== 'marketing') return;
      const detail = (event as CustomEvent<{ eventName?: string; parameters?: Record<string, unknown> }>).detail;
      if (!detail?.eventName) return;
      void initializeGa4(ga4Id ?? '').then((loaded) => {
        if (loaded && getIronSprueAnalyticsConsent() === 'marketing') {
          window.gtag?.('event', detail.eventName!, detail.parameters ?? {});
        }
      });
      void initializeMeta(pixelId ?? '').then((loaded) => {
        if (loaded && getIronSprueAnalyticsConsent() === 'marketing') {
          window.fbq?.('track', metaEventName(detail.eventName!), detail.parameters ?? {});
        }
      });
    }
    window.addEventListener(IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT, handleEcommerceEvent);
    return () => window.removeEventListener(IRON_SPRUE_ANALYTICS_ECOMMERCE_EVENT, handleEcommerceEvent);
  }, [ga4Id, pixelId]);

  return null;
}

export function IronSprueAnalyticsProvider(props: { ga4Id: string | null; metaPixelId: string | null }) {
  return (
    <Suspense fallback={null}>
      <IronSprueAnalyticsRuntime {...props} />
    </Suspense>
  );
}

export function IronSprueCookieConsentBanner() {
  const [consent, setConsent] = useState<IronSprueAnalyticsConsent>('unknown');
  const [showPreferences, setShowPreferences] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    setConsent(getIronSprueAnalyticsConsent());
    function handleConsentChange() {
      setConsent(getIronSprueAnalyticsConsent());
    }
    window.addEventListener(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => window.removeEventListener(IRON_SPRUE_ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
  }, []);

  if (consent !== 'unknown') return null;

  return (
    <section className="cookie-consent" aria-label="Cookie preferences">
      <div>
        <h2>Cookie preferences</h2>
        <p>Essential storage keeps basket, account and checkout features working. With your permission, Iron Sprue also uses analytics and marketing tags to measure storefront performance.</p>
        {showPreferences ? (
          <div className="cookie-preference-panel" aria-label="Optional cookie preferences">
            <p><strong>Essential cookies</strong> Always on for security, basket, account and checkout.</p>
            <label>
              <input
                type="checkbox"
                checked={marketingEnabled}
                onChange={(event) => setMarketingEnabled(event.target.checked)}
              />
              Optional analytics and marketing
            </label>
          </div>
        ) : null}
      </div>
      <div className="cookie-consent-actions">
        <button type="button" onClick={() => { setIronSprueAnalyticsConsent('necessary'); setConsent('necessary'); }}>Necessary only</button>
        {showPreferences ? (
          <button
            type="button"
            onClick={() => {
              const nextConsent = marketingEnabled ? 'marketing' : 'necessary';
              setIronSprueAnalyticsConsent(nextConsent);
              setConsent(nextConsent);
            }}
          >
            Save preferences
          </button>
        ) : (
          <button type="button" onClick={() => setShowPreferences(true)}>Manage preferences</button>
        )}
        <button type="button" className="button" onClick={() => { setIronSprueAnalyticsConsent('marketing'); setConsent('marketing'); }}>Accept analytics</button>
      </div>
    </section>
  );
}

export function IronSprueCookiePreferenceLink() {
  return <button type="button" className="footer-link-button" onClick={() => clearIronSprueAnalyticsConsent()}>Cookie preferences</button>;
}

export function IronSprueCookiePreferenceButton() {
  return <button type="button" className="button cookie-preferences-button" onClick={() => clearIronSprueAnalyticsConsent()}>Manage cookie preferences</button>;
}
