'use client';

import React from 'react';
import type { IronSprueProduct } from '../lib/catalogue';
import { ProductCard } from './product-card';

type AddonCarouselProps = {
  products: IronSprueProduct[];
};

export function AddonCarousel({ products }: AddonCarouselProps) {
  return (
    <div className="pdp-addon-carousel">
      <div className="pdp-addon-carousel-track" aria-label="Recommended add-on products">
        {products.map((item) => (
          <ProductCard detailsLabel="View details" headingLevel={3} key={item.sku} product={item} />
        ))}
      </div>
    </div>
  );
}
