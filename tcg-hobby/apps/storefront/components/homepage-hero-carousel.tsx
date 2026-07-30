'use client';

import Image from 'next/image';
import React from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Badge, Button } from '@tcg-hobby/ui';
import type { HomepageHeroSlide } from '../lib/homepage-data';

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

function focalPointClass(focalPoint: HomepageHeroSlide['focalPoint']) {
  if (focalPoint === 'LEFT') return 'object-center sm:object-left';
  if (focalPoint === 'RIGHT') return 'object-center sm:object-[70%_center]';
  return 'object-center';
}

function overlayClass(overlayStrength: HomepageHeroSlide['overlayStrength']) {
  if (overlayStrength === 'LIGHT') {
    return 'bg-[linear-gradient(90deg,rgba(8,8,10,0.88)_0%,rgba(8,8,10,0.68)_34%,rgba(8,8,10,0.2)_66%,rgba(8,8,10,0.08)_100%),linear-gradient(180deg,rgba(8,8,10,0.08),rgba(8,8,10,0.55))]';
  }
  if (overlayStrength === 'STRONG') {
    return 'bg-[linear-gradient(90deg,rgba(8,8,10,0.99)_0%,rgba(8,8,10,0.9)_42%,rgba(8,8,10,0.48)_72%,rgba(8,8,10,0.22)_100%),linear-gradient(180deg,rgba(8,8,10,0.18),rgba(8,8,10,0.78))]';
  }
  return 'bg-[linear-gradient(90deg,rgba(8,8,10,0.98)_0%,rgba(8,8,10,0.82)_38%,rgba(8,8,10,0.3)_68%,rgba(8,8,10,0.12)_100%),linear-gradient(180deg,rgba(8,8,10,0.12),rgba(8,8,10,0.68))]';
}

export function HomepageHeroCarousel({ slides }: { slides: HomepageHeroSlide[] }) {
  const id = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const activeSlide = slides[activeIndex] ?? slides[0];
  const slideCount = slides.length;

  const labelledBy = useMemo(() => `${id}-heading-${activeSlide?.id ?? 'slide'}`, [activeSlide?.id, id]);

  useEffect(() => {
    if (reducedMotion || paused || slideCount <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [paused, reducedMotion, slideCount]);

  if (!activeSlide) {
    return null;
  }

  const goToPrevious = () => setActiveIndex((current) => (current - 1 + slideCount) % slideCount);
  const goToNext = () => setActiveIndex((current) => (current + 1) % slideCount);
  const displayMode = activeSlide.displayMode ?? 'FULL_BLEED';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Storefront highlights"
      aria-labelledby={labelledBy}
      className="relative overflow-hidden bg-surface-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-hero-display-mode={displayMode}
      data-hero-focal-point={activeSlide.focalPoint ?? 'CENTER'}
      data-hero-overlay-strength={activeSlide.overlayStrength ?? 'BALANCED'}
    >
      <div
        data-hero-frame
        className="relative h-[600px] overflow-hidden bg-surface-ink sm:h-[640px] lg:h-[680px]"
      >
        {displayMode === 'CONTAINED' ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(255,122,26,0.28),transparent_32%),linear-gradient(115deg,#08080a_0%,#101014_46%,#25150d_100%)]" aria-hidden="true" />
            <div className="absolute inset-x-4 top-4 h-[48%] sm:inset-y-10 sm:left-auto sm:right-[-4%] sm:h-auto sm:w-[68%] lg:right-0 lg:w-[58%]">
              <Image
                key={activeSlide.id}
                src={activeSlide.image.src}
                alt={activeSlide.image.alt}
                fill
                priority={activeIndex === 0}
                sizes="(min-width: 1024px) 54vw, 90vw"
                className="object-contain object-center drop-shadow-[0_34px_90px_rgba(0,0,0,0.42)] transition-transform duration-700 motion-reduce:transition-none"
              />
            </div>
            <div className={`absolute inset-0 ${overlayClass(activeSlide.overlayStrength)}`} aria-hidden="true" />
          </>
        ) : (
          <>
            <Image
              key={activeSlide.id}
              src={activeSlide.image.src}
              alt={activeSlide.image.alt}
              fill
              priority={activeIndex === 0}
              sizes="100vw"
              className={`object-cover ${focalPointClass(activeSlide.focalPoint)} transition-transform duration-700 motion-reduce:transition-none`}
            />
            <div className={`absolute inset-0 ${overlayClass(activeSlide.overlayStrength)}`} aria-hidden="true" />
          </>
        )}

        <div className="relative z-10 mx-auto h-full w-full max-w-[108rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8 2xl:max-w-[112rem]">
          <div
            data-hero-content-grid
            className="grid h-full max-w-2xl grid-rows-[1.5rem_7.5rem_5.25rem_6rem_3rem_2.5rem] gap-3 sm:grid-rows-[1.5rem_9rem_4.5rem_6rem_3rem_2.5rem] lg:grid-rows-[1.5rem_10rem_4.5rem_6rem_3rem_2.5rem] xl:grid-rows-[1.5rem_13rem_4.5rem_6rem_3rem_2.5rem]"
          >
            <div className="flex items-start">
              <Badge variant="accent">{activeSlide.eyebrow}</Badge>
            </div>
            <div data-hero-headline-region className="overflow-hidden">
              <h1
                id={labelledBy}
                className="line-clamp-3 text-3xl font-black leading-[1.1] text-neutral-50 sm:text-4xl lg:text-5xl xl:text-6xl"
                title={activeSlide.headline}
              >
                {activeSlide.headline}
              </h1>
            </div>
            <div data-hero-description-region className="overflow-hidden">
              <p
                className="line-clamp-3 max-w-xl text-base leading-7 text-neutral-300 sm:line-clamp-2 sm:text-lg sm:leading-8"
                title={activeSlide.body}
              >
                {activeSlide.body}
              </p>
            </div>
            <div
              data-hero-commerce-region
              className="grid grid-rows-[2.25rem_1fr] gap-2 overflow-hidden"
            >
              <div className="flex items-center">
                {activeSlide.priceLabel ? (
                  <p className="text-3xl font-black text-accent-soft">{activeSlide.priceLabel}</p>
                ) : null}
              </div>
              <div className="flex max-w-xl flex-wrap content-start gap-2 overflow-hidden">
                {activeSlide.badges?.map((badge) => (
                  <Badge key={badge} variant={badge === 'LOW STOCK' ? 'warning' : badge.includes('FREE') ? 'success' : 'accent'}>
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
            <div data-hero-cta-region className="flex items-center">
              <Button size="lg" asChild>
                <a href={activeSlide.primaryCta.href}>{activeSlide.primaryCta.label}</a>
              </Button>
            </div>
            <div
              data-hero-controls-region
              className="flex items-center"
            >
              {slideCount > 1 ? (
                <div className="flex flex-wrap items-center gap-3" aria-label="Hero carousel controls">
                  <Button type="button" variant="outline" size="sm" onClick={goToPrevious} aria-label="Show previous hero slide">
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`Show ${slide.eyebrow} slide`}
                        aria-current={index === activeIndex ? 'true' : undefined}
                        onClick={() => setActiveIndex(index)}
                        className="h-3 w-3 rounded-full border border-accent/50 bg-surface-panel transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent aria-current:bg-accent"
                      />
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={goToNext} aria-label="Show next hero slide">
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
