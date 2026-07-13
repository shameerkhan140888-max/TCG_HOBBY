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
    }, 9000);

    return () => window.clearInterval(interval);
  }, [paused, reducedMotion, slideCount]);

  if (!activeSlide) {
    return null;
  }

  const goToPrevious = () => setActiveIndex((current) => (current - 1 + slideCount) % slideCount);
  const goToNext = () => setActiveIndex((current) => (current + 1) % slideCount);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Storefront highlights"
      aria-labelledby={labelledBy}
      className="overflow-hidden border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.16),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_58%,#17120e_100%)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mx-auto grid min-h-[620px] w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
        <div className="max-w-3xl space-y-7">
          <Badge variant="accent">{activeSlide.eyebrow}</Badge>
          <div className="space-y-5">
            <h1 id={labelledBy} className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
              {activeSlide.headline}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">{activeSlide.body}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href={activeSlide.primaryCta.href}>{activeSlide.primaryCta.label}</a>
            </Button>
            {activeSlide.secondaryCta ? (
              <Button size="lg" variant="outline" asChild>
                <a href={activeSlide.secondaryCta.href}>{activeSlide.secondaryCta.label}</a>
              </Button>
            ) : null}
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

        <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-surface-line bg-surface-base shadow-[0_28px_80px_rgba(0,0,0,0.35)] sm:min-h-[420px] lg:min-h-[500px]">
          <Image
            key={activeSlide.id}
            src={activeSlide.image.src}
            alt={activeSlide.image.alt}
            fill
            priority={activeIndex === 0}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 motion-reduce:transition-none"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.18),transparent_42%,rgba(8,8,10,0.16))]" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
