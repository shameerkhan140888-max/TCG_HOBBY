'use client';

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';

type ProductGalleryProps = {
  images: string[];
  productName: string;
  fallbackLabel: string;
};

export function ProductGallery({ images, productName, fallbackLabel }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panStartRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const activeImage = images[activeIndex] ?? null;
  const activeImageIsImage2 = Boolean(activeImage?.includes('/image-2/'));

  useEffect(() => {
    if (activeIndex >= images.length) setActiveIndex(0);
  }, [activeIndex, images.length]);

  useEffect(() => {
    if (!enlarged) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const mobileViewport = window.matchMedia('(max-width: 700px)').matches;
    setLightboxZoom(mobileViewport ? 1.65 : 1.25);
    setLightboxOffset({ x: 0, y: 0 });
    panStartRef.current = null;
    activePointersRef.current.clear();
    pinchStartRef.current = null;

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

  function updateLightboxZoom(nextZoom: number) {
    const clampedZoom = Math.min(2.8, Math.max(1, nextZoom));
    setLightboxZoom(clampedZoom);
    if (clampedZoom === 1) setLightboxOffset({ x: 0, y: 0 });
  }

  function pointerDistance() {
    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length < 2 || !pointers[0] || !pointers[1]) return 0;
    return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
  }

  function handleWheelZoom(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    updateLightboxZoom(lightboxZoom + direction * 0.18);
  }

  function handlePanStart(event: PointerEvent<HTMLImageElement>) {
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activePointersRef.current.size >= 2) {
      pinchStartRef.current = { distance: pointerDistance(), zoom: lightboxZoom };
      panStartRef.current = null;
      return;
    }
    if (lightboxZoom <= 1) return;
    panStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: lightboxOffset.x,
      offsetY: lightboxOffset.y,
    };
  }

  function handlePanMove(event: PointerEvent<HTMLImageElement>) {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const pinchStart = pinchStartRef.current;
    if (pinchStart && activePointersRef.current.size >= 2) {
      const distance = pointerDistance();
      if (pinchStart.distance > 0 && distance > 0) updateLightboxZoom(pinchStart.zoom * (distance / pinchStart.distance));
      return;
    }
    const start = panStartRef.current;
    if (!start || start.pointerId !== event.pointerId || lightboxZoom <= 1) return;
    const movementLimitX = Math.max(180, window.innerWidth * 0.42) * lightboxZoom;
    const movementLimitY = Math.max(240, window.innerHeight * 0.56) * lightboxZoom;
    setLightboxOffset({
      x: Math.max(-movementLimitX, Math.min(movementLimitX, start.offsetX + event.clientX - start.x)),
      y: Math.max(-movementLimitY, Math.min(movementLimitY, start.offsetY + event.clientY - start.y)),
    });
  }

  function handlePanEnd(event: PointerEvent<HTMLImageElement>) {
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) pinchStartRef.current = null;
    if (panStartRef.current?.pointerId === event.pointerId) panStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

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
        <img
          className={activeImageIsImage2 ? 'product-gallery-image product-gallery-image--image2' : 'product-gallery-image'}
          src={ironSprueDisplayMediaUrl(activeImage, 960)}
          srcSet={ironSprueDisplayMediaSrcSet(activeImage, [480, 640, 960, 1400])}
          sizes="(max-width: 700px) 82vw, (max-width: 1100px) 48vw, 620px"
          alt={productName}
          width="1000"
          height="1000"
          loading="eager"
          decoding="async"
        />
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
              <img
                className={image.includes('/image-2/') ? 'product-gallery-image product-gallery-image--image2' : 'product-gallery-image'}
                src={ironSprueDisplayMediaUrl(image, 320)}
                srcSet={ironSprueDisplayMediaSrcSet(image, [320, 480])}
                sizes="80px"
                alt={`${productName} gallery image ${index + 1}`}
                width="160"
                height="160"
                loading="lazy"
                decoding="async"
              />
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
            <div className="product-image-lightbox__viewport" aria-label="Scroll or pinch to zoom. Drag enlarged image to pan." onWheel={handleWheelZoom}>
              <img
                className={activeImageIsImage2 ? 'product-gallery-lightbox-image product-gallery-lightbox-image--image2' : 'product-gallery-lightbox-image'}
                src={activeImage}
                sizes="100vw"
                alt={productName}
                width="1600"
                height="1600"
                draggable={false}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerCancel={handlePanEnd}
                style={{ transform: `translate3d(${lightboxOffset.x}px, ${lightboxOffset.y}px, 0) scale(${lightboxZoom})` }}
              />
            </div>
            <div className="product-image-lightbox__tools" aria-label="Image zoom controls">
              <button type="button" onClick={() => updateLightboxZoom(lightboxZoom - 0.25)} aria-label="Zoom out">-</button>
              <button type="button" onClick={() => updateLightboxZoom(lightboxZoom + 0.25)} aria-label="Zoom in">+</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
