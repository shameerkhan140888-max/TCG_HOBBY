'use client';

import { META_STANDARD_EVENTS, type CompleteRegistrationEvent } from './events';

declare global {
  interface Window {
    fbq?: {
      (command: 'init', pixelId: string): void;
      (command: 'track', eventName: string, parameters?: Record<string, unknown>, options?: { eventID?: string }): void;
    };
    _fbq?: unknown;
  }
}

let initializedPixelId: string | null = null;
let scriptPromise: Promise<void> | null = null;
const trackedCompleteRegistrationEventIds = new Set<string>();

function loadMetaPixelScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[data-tcg-meta-pixel="true"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.dataset.tcgMetaPixel = 'true';
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Meta Pixel script failed to load.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function installFbqStub() {
  if (typeof window === 'undefined' || window.fbq) {
    return;
  }

  const queue: unknown[] = [];
  const fbq = ((...args: unknown[]) => {
    queue.push(args);
  }) as Window['fbq'] & { queue?: unknown[]; loaded?: boolean; version?: string };

  fbq.queue = queue;
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;
}

export async function initializeMetaPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') {
    return false;
  }

  installFbqStub();

  if (initializedPixelId !== pixelId) {
    window.fbq?.('init', pixelId);
    initializedPixelId = pixelId;
  }

  try {
    await loadMetaPixelScript();
  } catch {
    return false;
  }

  return true;
}

export function trackPageView() {
  window.fbq?.('track', META_STANDARD_EVENTS.pageView);
}

export function trackCompleteRegistration(event: Pick<CompleteRegistrationEvent, 'eventId'>) {
  window.fbq?.('track', META_STANDARD_EVENTS.completeRegistration, {}, { eventID: event.eventId });
}

export function trackCompleteRegistrationOnce(event: Pick<CompleteRegistrationEvent, 'eventId'>) {
  if (trackedCompleteRegistrationEventIds.has(event.eventId)) {
    return false;
  }

  trackedCompleteRegistrationEventIds.add(event.eventId);
  trackCompleteRegistration(event);
  console.info('meta_complete_registration_browser_handoff_created', {
    event: 'meta_complete_registration_browser_handoff_created',
    eventName: META_STANDARD_EVENTS.completeRegistration,
    eventId: event.eventId,
  });
  return true;
}

export function trackViewContent() {
  // Reserved for future ecommerce tracking.
}

export function trackSearch() {
  // Reserved for future ecommerce tracking.
}

export function trackAddToCart() {
  // Reserved for future ecommerce tracking.
}

export function trackInitiateCheckout() {
  // Reserved for future ecommerce tracking.
}

export function trackPurchase() {
  // Reserved for future ecommerce tracking.
}
