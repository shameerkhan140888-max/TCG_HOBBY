'use client';

import { useEffect, useRef, useState } from 'react';

type ProductGalleryProps = {
  images: string[];
  productName: string;
  fallbackLabel: string;
};

export function ProductGallery({ images, productName, fallbackLabel }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeImage = images[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex >= images.length) setActiveIndex(0);
  }, [activeIndex, images.length]);

  useEffect(() => {
    if (!enlarged) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEnlarged(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      (previousActiveElement ?? openButtonRef.current)?.focus();
    };
  }, [enlarged]);

  if (!activeImage) {
    return (
      <div className="product-gallery">
        <div className="primary-product-image product-gallery-main">
          <span>{fallbackLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="product-gallery">
      <button
        ref={openButtonRef}
        className="primary-product-image product-gallery-main zoomable-product-image"
        type="button"
        onClick={() => setEnlarged(true)}
        aria-label={`Enlarge image of ${productName}`}
      >
        <img src={activeImage} alt={productName} width="1000" height="1000" />
      </button>

      {images.length > 1 ? (
        <div className="thumbnail-row product-gallery-thumbnails" aria-label={`${productName} image gallery`}>
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
            <button ref={closeButtonRef} className="product-image-lightbox__close" type="button" onClick={() => setEnlarged(false)}>
              Close image
            </button>
            <img src={activeImage} alt={productName} width="1600" height="1600" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
