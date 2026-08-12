'use client';

import { useState } from 'react';

type ProductGalleryProps = {
  images: string[];
  productName: string;
  fallbackLabel: string;
};

export function ProductGallery({ images, productName, fallbackLabel }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const activeImage = images[activeIndex] ?? null;

  if (!activeImage) {
    return (
      <div className="product-gallery">
        <div className="primary-product-image">
          <span>{fallbackLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="product-gallery">
      <button
        className="primary-product-image zoomable-product-image"
        type="button"
        onClick={() => setEnlarged(true)}
        aria-label={`Enlarge image of ${productName}`}
      >
        <img src={activeImage} alt={productName} width="1000" height="1000" />
      </button>

      {images.length > 1 ? (
        <div className="thumbnail-row" aria-label={`${productName} image gallery`}>
          {images.map((image, index) => (
            <button
              className={index === activeIndex ? 'active' : ''}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show gallery image ${index + 1} for ${productName}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              key={`${image}-${index}`}
            >
              <img src={image} alt={`${productName} gallery image ${index + 1}`} width="160" height="160" />
            </button>
          ))}
        </div>
      ) : null}

      {enlarged ? (
        <div className="product-image-lightbox" role="dialog" aria-modal="true" aria-label={`${productName} enlarged image`}>
          <button className="product-image-lightbox__backdrop" type="button" onClick={() => setEnlarged(false)} aria-label="Close image preview" />
          <div className="product-image-lightbox__panel">
            <button className="product-image-lightbox__close" type="button" onClick={() => setEnlarged(false)}>
              Close
            </button>
            <img src={activeImage} alt={productName} width="1600" height="1600" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
