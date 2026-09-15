'use client';

import React, { useRef } from 'react';
import type { IronSprueProduct } from '../lib/catalogue';
import { ProductCard } from './product-card';

type AddonCarouselProps = {
  products: IronSprueProduct[];
};

export function AddonCarousel({ products }: AddonCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>('.product-card');
    const distance = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth * 0.72;
    track.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  return (
    <div className="pdp-addon-carousel">
      {products.length > 1 ? (
        <div className="pdp-addon-carousel-controls" aria-label="Recommended add-on carousel controls">
          <button type="button" aria-label="Previous add-ons" onClick={() => scroll(-1)}>
            <span aria-hidden="true">&lsaquo;</span>
          </button>
          <button type="button" aria-label="Next add-ons" onClick={() => scroll(1)}>
            <span aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      ) : null}
      <div className="pdp-addon-carousel-track" ref={trackRef} aria-label="Recommended add-on products" tabIndex={0}>
        {products.map((item) => (
          <ProductCard detailsLabel="View details" headingLevel={3} key={item.sku} product={item} />
        ))}
      </div>
    </div>
  );
}
