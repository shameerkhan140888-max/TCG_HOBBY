export const META_STANDARD_EVENTS = {
  pageView: 'PageView',
  completeRegistration: 'CompleteRegistration',
  viewContent: 'ViewContent',
  search: 'Search',
  addToCart: 'AddToCart',
  initiateCheckout: 'InitiateCheckout',
  purchase: 'Purchase',
} as const;

export type MetaStandardEventName = (typeof META_STANDARD_EVENTS)[keyof typeof META_STANDARD_EVENTS];

export type MetaEventId = string;

export type CompleteRegistrationEvent = {
  eventId: MetaEventId;
  eventSourceUrl?: string;
  email?: string;
  userAgent?: string | null;
};

export type EcommerceEventPlaceholder = {
  eventId: MetaEventId;
  eventSourceUrl?: string;
};

export type AnalyticsProvider = {
  trackPageView(): void;
  trackCompleteRegistration(event: Pick<CompleteRegistrationEvent, 'eventId'>): void;
  trackViewContent?(event: EcommerceEventPlaceholder): void;
  trackSearch?(event: EcommerceEventPlaceholder): void;
  trackAddToCart?(event: EcommerceEventPlaceholder): void;
  trackInitiateCheckout?(event: EcommerceEventPlaceholder): void;
  trackPurchase?(event: EcommerceEventPlaceholder): void;
};

export function createMetaEventId(prefix = 'tcg') {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return `${prefix}_${cryptoApi.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
