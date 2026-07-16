'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogueProductImage } from '@tcg-hobby/types';

type Point = {
  x: number;
  y: number;
};

type TouchState = {
  startX: number;
  startY: number;
  distance: number | null;
};

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function MagnifyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4M11 8v6M8 11h6" strokeLinecap="round" />
    </svg>
  );
}

function distanceBetweenTouches(touches: React.TouchList): number {
  if (touches.length < 2) {
    return 0;
  }

  const first = touches[0];
  const second = touches[1];
  if (!first || !second) {
    return 0;
  }

  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function ProductGallery({ images, productName }: { images: CatalogueProductImage[]; productName: string }) {
  const galleryImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);
  const [activeId, setActiveId] = useState(galleryImages[0]?.id ?? 'placeholder');
  const activeIndex = Math.max(
    0,
    galleryImages.findIndex((image) => image.id === activeId),
  );
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0] ?? null;
  const placeholders = galleryImages.length ? galleryImages : [0, 1, 2, 3];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const imageCount = galleryImages.length;

  const resetViewport = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragStart(null);
    setTouchState(null);
  }, []);

  const showImage = useCallback(
    (index: number) => {
      if (!imageCount) {
        return;
      }

      const nextIndex = (index + imageCount) % imageCount;
      const nextImage = galleryImages[nextIndex];
      if (!nextImage) {
        return;
      }

      setActiveId(nextImage.id);
      resetViewport();
    },
    [galleryImages, imageCount, resetViewport],
  );

  const showPrevious = useCallback(() => showImage(activeIndex - 1), [activeIndex, showImage]);
  const showNext = useCallback(() => showImage(activeIndex + 1), [activeIndex, showImage]);

  const openLightbox = useCallback(() => {
    if (!activeImage) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLightboxOpen(true);
    resetViewport();
  }, [activeImage, resetViewport]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    resetViewport();
    previousFocusRef.current?.focus();
  }, [resetViewport]);

  useEffect(() => {
    if (!galleryImages.length) {
      setActiveId('placeholder');
      return;
    }

    if (!galleryImages.some((image) => image.id === activeId)) {
      const firstImage = galleryImages[0];
      if (firstImage) {
        setActiveId(firstImage.id);
      }
    }
  }, [activeId, galleryImages]);

  useEffect(() => {
    if (!activeImage || typeof window === 'undefined') {
      return;
    }

    const adjacentImages = [galleryImages[(activeIndex - 1 + imageCount) % imageCount], galleryImages[(activeIndex + 1) % imageCount]].filter(
      (image): image is CatalogueProductImage => Boolean(image),
    );
    adjacentImages.forEach((image) => {
      const preload = new window.Image();
      preload.src = image.url;
    });
  }, [activeImage, activeIndex, galleryImages, imageCount]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrevious();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => !element.hasAttribute('disabled'));

        if (!focusable.length) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          return;
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeLightbox, lightboxOpen, showNext, showPrevious]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!lightboxOpen) {
      return;
    }

    event.preventDefault();
    setZoom((currentZoom) => {
      const nextZoom = currentZoom + (event.deltaY < 0 ? 0.16 : -0.16);
      return Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    });
  };

  const toggleZoom = () => {
    setZoom((currentZoom) => (currentZoom > 1 ? 1 : 2));
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || zoom <= 1) {
      return;
    }

    setPan({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
  };

  const handlePointerUp = () => {
    setDragStart(null);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      distance: event.touches.length > 1 ? distanceBetweenTouches(event.touches) : null,
    });
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchState) {
      return;
    }

    if (event.touches.length > 1 && touchState.distance) {
      event.preventDefault();
      const nextDistance = distanceBetweenTouches(event.touches);
      const scaleDelta = nextDistance / touchState.distance;
      setZoom((currentZoom) => Math.min(3, Math.max(1, Number((currentZoom * scaleDelta).toFixed(2)))));
      setTouchState({ ...touchState, distance: nextDistance });
      return;
    }

    if (zoom > 1 && event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      setPan({ x: touch.clientX - touchState.startX, y: touch.clientY - touchState.startY });
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchState || zoom > 1 || event.changedTouches.length === 0) {
      setTouchState(null);
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      setTouchState(null);
      return;
    }

    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;

    if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        showPrevious();
      } else {
        showNext();
      }
    }

    setTouchState(null);
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="overflow-hidden rounded-2xl bg-surface-base shadow-[0_30px_80px_rgba(0,0,0,0.34)]">
        <button
          type="button"
          disabled={!activeImage}
          onClick={openLightbox}
          className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-[radial-gradient(circle_at_70%_20%,rgba(255,122,26,0.18),transparent_34%),linear-gradient(135deg,#171717,#08080a)] text-left focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label={activeImage ? `Open image viewer for ${activeImage.altText}` : undefined}
        >
          {activeImage ? (
            <>
              <Image
                key={activeImage.id}
                src={activeImage.url}
                alt={activeImage.altText}
                fill
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-contain p-6 opacity-100 transition duration-300 group-hover:brightness-110 sm:p-8"
              />
              <div className="absolute left-4 top-4 rounded-full bg-neutral-950/75 px-3 py-1 text-xs font-bold text-neutral-100 backdrop-blur">
                {activeIndex + 1} / {imageCount}
              </div>
              <div className="absolute inset-x-4 bottom-4 flex justify-center opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-950/78 px-4 py-2 text-sm font-bold text-neutral-50 shadow-[0_12px_32px_rgba(0,0,0,0.3)] backdrop-blur">
                  <MagnifyIcon />
                  Click to enlarge
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-sm space-y-3">
                <p className="text-2xl font-black text-neutral-50">Photography coming soon</p>
                <p className="text-sm leading-6 text-neutral-400">Approved product photography will appear here once added.</p>
              </div>
            </div>
          )}
        </button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label={`${productName} image gallery`}>
        {placeholders.map((item, index) => {
          const image = typeof item === 'number' ? null : item;
          const selected = image ? image.id === activeImage?.id : index === 0 && !activeImage;

          return image ? (
            <button
              key={image.id}
              type="button"
              aria-label={`Show ${image.altText}`}
              aria-current={selected ? 'true' : undefined}
              title={`Show ${image.altText}`}
              onMouseEnter={() => setActiveId(image.id)}
              onFocus={() => setActiveId(image.id)}
              onClick={() => setActiveId(image.id)}
              className={`relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-surface-base shadow-[0_14px_36px_rgba(0,0,0,0.22)] ring-offset-2 ring-offset-surface-ink transition duration-200 hover:scale-[1.02] hover:ring-2 hover:ring-accent/70 focus:outline-none focus:ring-2 focus:ring-accent sm:w-32 lg:w-36 ${
                selected ? 'ring-2 ring-accent' : ''
              }`}
            >
              <Image src={image.url} alt="" fill sizes="180px" className="object-contain p-3" />
            </button>
          ) : (
            <div
              key={`placeholder-${index}`}
              className="flex aspect-[4/3] w-28 shrink-0 items-center justify-center rounded-xl bg-surface-base px-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600 shadow-[0_14px_36px_rgba(0,0,0,0.22)] sm:w-32 lg:w-36"
            >
              Image slot
            </div>
          );
        })}
      </div>

      {lightboxOpen && activeImage ? (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image viewer`}
          className="fixed inset-0 z-50 flex flex-col bg-neutral-950/88 p-4 text-neutral-50 backdrop-blur-lg sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLightbox();
            }
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-neutral-300">
              {activeIndex + 1} / {imageCount}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/80 text-neutral-100 transition hover:bg-accent hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Close image viewer"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="group relative min-h-0 flex-1">
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-950/75 text-neutral-100 opacity-0 transition hover:bg-accent hover:text-neutral-950 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent sm:inline-flex"
              aria-label="Show previous image"
            >
              <ChevronLeftIcon />
            </button>
            <div
              className={`relative h-full overflow-hidden rounded-2xl bg-neutral-950/35 ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
              onClick={toggleZoom}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <Image
                key={`lightbox-${activeImage.id}`}
                src={activeImage.url}
                alt={activeImage.altText}
                fill
                sizes="100vw"
                className="object-contain p-2 transition duration-300 sm:p-8"
                style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
              />
            </div>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-950/75 text-neutral-100 opacity-0 transition hover:bg-accent hover:text-neutral-950 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent sm:inline-flex"
              aria-label="Show next image"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label={`${productName} lightbox thumbnails`}>
            {galleryImages.map((image) => {
              const selected = image.id === activeImage.id;

              return (
                <button
                  key={`lightbox-thumb-${image.id}`}
                  type="button"
                  aria-label={`Show ${image.altText}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => setActiveId(image.id)}
                  className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-900 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent ${
                    selected ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <Image src={image.url} alt="" fill sizes="120px" className="object-contain p-2" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
