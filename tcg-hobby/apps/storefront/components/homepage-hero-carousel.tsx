'use client';

import Image from 'next/image';
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
  const isProductSlide = activeSlide.image.src.includes('/products/pokemon/mega-greninja-ex-premium-collection/');

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
    >
      <div className="relative min-h-[540px] overflow-hidden bg-surface-ink sm:min-h-[600px] lg:min-h-[680px]">
        {isProductSlide ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(255,122,26,0.28),transparent_32%),linear-gradient(115deg,#08080a_0%,#101014_46%,#25150d_100%)]" aria-hidden="true" />
            <div className="absolute inset-y-12 right-[-8%] w-[92%] sm:right-[-4%] sm:w-[76%] lg:right-0 lg:w-[58%]">
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
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.98)_0%,rgba(8,8,10,0.9)_37%,rgba(8,8,10,0.35)_62%,rgba(8,8,10,0.14)_100%),linear-gradient(180deg,rgba(8,8,10,0.08),rgba(8,8,10,0.72))]" aria-hidden="true" />
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
              className="object-cover object-[62%_center] transition-transform duration-700 motion-reduce:transition-none"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.98)_0%,rgba(8,8,10,0.86)_28%,rgba(8,8,10,0.36)_48%,rgba(8,8,10,0.06)_76%),linear-gradient(180deg,rgba(8,8,10,0.08),rgba(8,8,10,0.64))]" aria-hidden="true" />
          </>
        )}

        <div className="relative z-10 mx-auto flex min-h-[540px] w-full max-w-[108rem] flex-col justify-center px-4 py-12 sm:min-h-[600px] sm:px-6 lg:min-h-[680px] lg:px-8 2xl:max-w-[112rem]">
          <div className="space-y-7">
            <Badge variant="accent">{activeSlide.eyebrow}</Badge>
            <div className="space-y-5">
              <h1 id={labelledBy} className="max-w-2xl text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
                {activeSlide.headline}
              </h1>
              <p className="max-w-xl text-base leading-8 text-neutral-300 sm:text-lg">{activeSlide.body}</p>
            </div>
            {activeSlide.priceLabel || activeSlide.badges?.length ? (
              <div className="space-y-3">
                {activeSlide.priceLabel ? <p className="text-3xl font-black text-accent-soft">{activeSlide.priceLabel}</p> : null}
                {activeSlide.badges?.length ? (
                  <div className="flex max-w-xl flex-wrap gap-2">
                    {activeSlide.badges.map((badge) => (
                      <Badge key={badge} variant={badge === 'LOW STOCK' ? 'warning' : badge.includes('FREE') ? 'success' : 'accent'}>
                        {badge}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <a href={activeSlide.primaryCta.href}>{activeSlide.primaryCta.label}</a>
              </Button>
            </div>
            {slideCount > 1 ? (
              <div className="flex flex-wrap items-center gap-3 pt-2" aria-label="Hero carousel controls">
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
    </section>
  );
}
