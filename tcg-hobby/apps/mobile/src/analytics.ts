export type MobileAnalyticsEvent =
  | { name: 'mobile_home_view' }
  | { name: 'mobile_catalogue_view' }
  | { name: 'mobile_search'; hasQuery: boolean }
  | { name: 'mobile_filter_apply'; filter: 'game' | 'productType' | 'set' | 'language' | 'category' | 'sort' }
  | { name: 'mobile_product_view'; productId: string }
  | { name: 'mobile_add_to_basket'; productId: string }
  | { name: 'mobile_begin_checkout'; itemCount: number }
  | { name: 'mobile_login' }
  | { name: 'mobile_registration' }
  | { name: 'mobile_order_view'; orderNumber: string };

export interface MobileAnalytics {
  track(event: MobileAnalyticsEvent): void;
}

// Sprint 13 defines the provider-neutral contract only. No events leave the device.
export const mobileAnalytics: MobileAnalytics = { track: () => undefined };
