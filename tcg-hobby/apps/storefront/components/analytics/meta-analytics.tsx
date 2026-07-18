'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsentState,
} from '../../lib/analytics/consent';
import { initializeMetaPixel, trackCompleteRegistrationOnce, trackPageView } from '../../lib/analytics/browser';

function getSafeMetaEventId(value: string | null) {
  if (!value) {
    return null;
  }

  return /^[a-zA-Z0-9_-]{8,120}$/.test(value) ? value : null;
}

export function MetaAnalyticsProvider({ pixelId }: { pixelId: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<AnalyticsConsentState>('unknown');
  const lastPageViewKey = useRef<string | null>(null);

  useEffect(() => {
    setConsent(getAnalyticsConsent());

    function handleConsentChange() {
      setConsent(getAnalyticsConsent());
    }

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
    window.addEventListener('storage', handleConsentChange);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
      window.removeEventListener('storage', handleConsentChange);
    };
  }, []);

  useEffect(() => {
    if (!pixelId || consent !== 'marketing') {
      return;
    }

    const pageViewKey = `${pathname}?${searchParams.toString()}`;

    if (lastPageViewKey.current === pageViewKey) {
      return;
    }

    lastPageViewKey.current = pageViewKey;

    void initializeMetaPixel(pixelId).then((loaded) => {
      if (loaded && getAnalyticsConsent() === 'marketing') {
        trackPageView();
      }
    });
  }, [consent, pathname, pixelId, searchParams]);

  useEffect(() => {
    if (!pixelId || consent !== 'marketing' || searchParams.get('subscriberSignup') !== 'saved') {
      return;
    }

    const eventId = getSafeMetaEventId(searchParams.get('metaEventId'));

    if (!eventId) {
      return;
    }

    void initializeMetaPixel(pixelId).then((loaded) => {
      if (loaded && getAnalyticsConsent() === 'marketing') {
        trackCompleteRegistrationOnce({ eventId });
      }
    });
  }, [consent, pixelId, searchParams]);

  return null;
}

export function CookieConsentBanner() {
  const [consent, setConsentState] = useState<AnalyticsConsentState>('unknown');

  useEffect(() => {
    setConsentState(getAnalyticsConsent());

    function handleConsentChange() {
      setConsentState(getAnalyticsConsent());
    }

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChange);
  }, []);

  if (consent !== 'unknown') {
    return null;
  }

  return (
    <section
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-5xl rounded-lg bg-neutral-950/95 p-4 text-neutral-100 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-accent/25 backdrop-blur sm:bottom-5 sm:flex sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="max-w-2xl space-y-1">
        <h2 className="text-sm font-semibold text-neutral-50">Cookie preferences</h2>
        <p className="text-xs leading-5 text-neutral-300">
          We use necessary storage to run the site. With your permission, we also use marketing cookies to measure Meta ads and launch-list conversions.
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row">
        <button
          type="button"
          className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-300 ring-1 ring-white/15 transition hover:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent"
          onClick={() => {
            setAnalyticsConsent('necessary');
            setConsentState('necessary');
          }}
        >
          Reject all
        </button>
        <button
          type="button"
          className="rounded-md px-3 py-2 text-sm font-semibold text-neutral-300 ring-1 ring-white/15 transition hover:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent"
          onClick={() => {
            setAnalyticsConsent('necessary');
            setConsentState('necessary');
          }}
        >
          Necessary only
        </button>
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-2 text-sm font-black text-black transition hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
          onClick={() => {
            setAnalyticsConsent('marketing');
            setConsentState('marketing');
          }}
        >
          Accept marketing
        </button>
      </div>
    </section>
  );
}

export function LaunchSignupConversionTracker({ eventId, pixelId }: { eventId?: string; pixelId: string | null }) {
  const trackedEventId = useRef<string | null>(null);

  useEffect(() => {
    if (!eventId || !pixelId || trackedEventId.current === eventId || getAnalyticsConsent() !== 'marketing') {
      return;
    }

    trackedEventId.current = eventId;

    void initializeMetaPixel(pixelId).then((loaded) => {
      if (loaded && getAnalyticsConsent() === 'marketing') {
        trackCompleteRegistrationOnce({ eventId });
      }
    });
  }, [eventId, pixelId]);

  return null;
}
