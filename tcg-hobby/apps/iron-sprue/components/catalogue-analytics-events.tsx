'use client';

import { useEffect, useMemo } from 'react';
import type { IronSprueProduct } from '../lib/catalogue';
import { trackIronSprueEcommerceEvent } from '../lib/analytics';
import { productCommerceId } from '../lib/storefront';

function analyticsItemForProduct(product: IronSprueProduct, index: number) {
  return {
    item_id: productCommerceId(product),
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    index,
    price: (product.priceMinor ?? product.retailPriceMinor ?? 0) / 100,
  };
}

export function CatalogueAnalyticsEvents({
  listId,
  products,
  searchTerm,
}: {
  listId: string;
  products: IronSprueProduct[];
  searchTerm?: string | undefined;
}) {
  const items = useMemo(() => products.slice(0, 20).map(analyticsItemForProduct), [products]);

  useEffect(() => {
    if (!products.length) return;
    trackIronSprueEcommerceEvent('view_item_list', {
      currency: 'GBP',
      item_list_id: listId,
      item_list_name: listId.replace(/[-_]+/g, ' '),
      items,
    });
  }, [items, listId, products.length]);

  useEffect(() => {
    const query = searchTerm?.trim();
    if (!query) return;
    trackIronSprueEcommerceEvent('search', {
      search_term: query,
      item_list_id: listId,
      results_count: products.length,
    });
  }, [listId, products.length, searchTerm]);

  return null;
}
