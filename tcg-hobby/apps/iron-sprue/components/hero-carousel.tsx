'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { IronSprueHeroSlide } from '../lib/admin-storefront-controls';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';

type HeroCarouselProps = {
  slides: readonly IronSprueHeroSlide[];
};

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [count]);

  const labelledSlides = useMemo(() => slides.map((slide, index) => ({
    ...slide,
    positionLabel: `${index + 1} of ${count}`,
  })), [slides, count]);

  if (!labelledSlides.length) return null;

  return (
    <div
      className="hero-carousel"
      aria-label="Featured Iron Sprue hero products"
      style={{ '--hero-count': Math.max(1, count) } as CSSProperties}
    >
      {labelledSlides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <article
            className={`hero-slide${isActive ? ' is-active' : ''}`}
            data-fit="cover"
            style={{ '--slide-index': index } as CSSProperties}
            key={`${slide.id ?? slide.image}-${slide.title}`}
            aria-hidden={isActive ? undefined : true}
          >
            <a className="hero-art-link" href={slide.ctaHref} aria-label={`View ${slide.title}`} tabIndex={isActive ? 0 : -1}>
              <img
                className="hero-art"
                src={ironSprueDisplayMediaUrl(slide.image, 1400)}
                srcSet={ironSprueDisplayMediaSrcSet(slide.image, [640, 960, 1400])}
                sizes="100vw"
                alt={slide.alt}
                width="1536"
                height="864"
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding={index === 0 ? 'sync' : 'async'}
              />
            </a>
            {slide.brandLogo ? (
              <div className="hero-brand">
                <img src={slide.brandLogo} alt={`${slide.brandName ?? 'Brand'} logo`} width="180" height="70" />
              </div>
            ) : null}
            <div className="hero-message">
              <div className="hero-availability-sticker" aria-label={slide.availabilityLabel}>
                <strong>{slide.availabilityLabel}</strong>
              </div>
              <h1>{slide.title}</h1>
              <p className="script-line">{slide.script}</p>
              {slide.copy ? <p className="lead">{slide.copy}</p> : null}
              <a className="hero-shop-now" href={slide.ctaHref} tabIndex={isActive ? 0 : -1}>{slide.ctaLabel ?? 'Shop now'}</a>
            </div>
          </article>
        );
      })}
      {count > 1 ? (
        <div className="hero-controls" aria-label="Hero carousel controls">
          <button type="button" onClick={() => setActiveIndex((activeIndex + count - 1) % count)} aria-label="Previous hero">Previous</button>
          <span>{labelledSlides[activeIndex]?.positionLabel}</span>
          <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % count)} aria-label="Next hero">Next</button>
        </div>
      ) : null}
      <div className="hero-dots" aria-label="Hero carousel position">
        {labelledSlides.map((slide, index) => (
          <button
            type="button"
            key={slide.title}
            className={index === activeIndex ? 'is-active' : ''}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show hero ${slide.positionLabel}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}
