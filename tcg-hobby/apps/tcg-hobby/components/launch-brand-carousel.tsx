'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@tcg-hobby/ui';

type LaunchBrandSlide = {
  name: string;
  message: string;
  label: string;
};

const slides: LaunchBrandSlide[] = [
  {
    name: 'Pokémon',
    message: 'Sealed releases, accessories and launch updates.',
    label: 'Popular sealed releases',
  },
  {
    name: 'Magic: The Gathering',
    message: 'Booster products, accessories and new-set releases.',
    label: 'New set releases',
  },
  {
    name: 'Yu-Gi-Oh!',
    message: 'Core sets, sealed products and player essentials.',
    label: 'Player essentials',
  },
  {
    name: 'One Piece Card Game',
    message: 'Upcoming releases, sealed products and accessories.',
    label: 'Upcoming releases',
  },
  {
    name: 'Accessories',
    message: 'Sleeves, binders, storage and protection.',
    label: 'Storage and protection',
  },
  {
    name: 'Sealed Products',
    message: 'Booster boxes, collections and launch-day stock.',
    label: 'Launch-day stock',
  },
];

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

function GenericCardIllustration({ label }: { label: string }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(255,122,26,0.16),rgba(8,8,10,0.42)_50%,rgba(255,255,255,0.035))] sm:h-28 md:h-32">
      <div className="absolute left-5 top-6 h-16 w-11 rotate-[-10deg] rounded-md border border-accent/45 bg-black/30 shadow-[0_0_24px_rgba(255,122,26,0.18)] sm:left-6 sm:top-7 sm:h-20 sm:w-14" />
      <div className="absolute left-16 top-4 h-20 w-14 rotate-[8deg] rounded-md border border-accent bg-surface-ink shadow-[0_0_30px_rgba(255,122,26,0.3)] sm:left-20 sm:top-5 sm:h-24 sm:w-16">
        <div className="m-2 h-10 rounded border border-white/10 bg-accent/10" />
        <div className="mx-2 mt-3 h-1 rounded bg-accent/50" />
        <div className="mx-2 mt-2 h-1 rounded bg-white/20" />
      </div>
      <div className="absolute bottom-3 right-3 rounded-full border border-accent/30 bg-black/30 px-3 py-1 text-xs font-semibold text-accent">
        {label}
      </div>
    </div>
  );
}

export function LaunchBrandCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const activeSlide = slides[activeIndex];

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slides.length);
  }, []);
  const previous = useCallback(() => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }, []);

  const handleSwipe = useCallback(
    (startX: number | null, endX: number | null) => {
      if (startX == null || endX == null || Math.abs(startX - endX) < 40) {
        return;
      }

      if (startX > endX) {
        next();
      } else {
        previous();
      }
    },
    [next, previous],
  );

  useEffect(() => {
    if (paused || reducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [paused, reducedMotion]);

  const transform = useMemo(() => `translateX(-${activeIndex * 100}%)`, [activeIndex]);

  return (
    <div
      id="launch-preview-carousel"
      className="space-y-3"
      aria-roledescription="carousel"
      aria-label="Launch brand and category preview"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        handleSwipe(pointerStartX.current, event.clientX);
        pointerStartX.current = null;
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        handleSwipe(touchStartX.current, event.changedTouches[0]?.clientX ?? null);
        touchStartX.current = null;
      }}
    >
      <div className="overflow-hidden rounded-lg border border-surface-line bg-surface-base">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform }}
          >
            {slides.map((slide, index) => (
              <article
                key={slide.name}
                className="grid min-w-full gap-4 p-4 md:grid-cols-[0.82fr_1.18fr] md:gap-6 md:p-6"
                aria-hidden={index !== activeIndex}
              >
                <GenericCardIllustration label={slide.label} />
                <div className="flex flex-col justify-center space-y-2 md:min-h-32">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Launch category</p>
                  <h3 className="text-2xl font-black leading-tight text-neutral-50 sm:text-3xl">{slide.name}</h3>
                  <p className="max-w-xl text-sm leading-6 text-neutral-300">{slide.message}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-line/80 px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button type="button" variant="outline" size="sm" className="h-11" onClick={previous} aria-label="Previous launch category">
                Previous
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-11" onClick={next} aria-label="Next launch category">
                Next
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2" aria-label="Launch category pagination">
              {slides.map((slide, index) => (
                <button
                  key={slide.name}
                  type="button"
                  aria-label={`Show ${slide.name}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => goTo(index)}
                  className="flex h-11 w-8 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <span
                    className={`h-3 rounded-full transition-all motion-reduce:transition-none ${
                      index === activeIndex ? 'w-8 bg-accent' : 'w-3 bg-neutral-600 hover:bg-neutral-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-neutral-500">
        All trademarks belong to their respective owners. TCG Hobby is an independent retailer.
      </p>
    </div>
  );
}
