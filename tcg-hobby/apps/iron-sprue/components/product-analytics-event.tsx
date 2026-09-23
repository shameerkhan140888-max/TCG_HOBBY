'use client';

import { useEffect } from 'react';
import { trackIronSprueEcommerceEvent } from '../lib/analytics';

export function ProductAnalyticsEvent({
  brand,
  category,
  currency = 'GBP',
  id,
  name,
  price,
}: {
  brand: string;
  category: string;
  currency?: string;
  id: string;
  name: string;
  price: number;
}) {
  useEffect(() => {
    trackIronSprueEcommerceEvent('view_item', {
      currency,
      value: price,
      items: [{
        item_id: id,
        item_name: name,
        item_brand: brand,
        item_category: category,
        price,
      }],
    });
  }, [brand, category, currency, id, name, price]);

  return null;
}
