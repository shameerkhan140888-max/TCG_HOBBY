'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { IronSprueHeroSlide } from '../lib/admin-storefront-controls';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';

type HeroCarouselProps = {
  slides: readonly IronSprueHeroSlide[];
};

export function heroStyleForSlide(slide: IronSprueHeroSlide) {
  const source = [
    slide.title,
    slide.script,
    slide.copy,
    slide.image,
    slide.brandName,
    slide.sourceProductSlug,
    ...slide.meta,
  ].join(' ').toLowerCase();

  if (source.includes('delorean') || source.includes('future')) return 'time-machine';
  if (source.includes('bundle') || source.includes('savings') || source.includes('three-piece')) return 'workshop-bundle';
  if (source.includes('aventador') || source.includes('countach') || source.includes('lamborghini')) return 'supercar';
  if (source.includes('skyline') || source.includes('gtr')) return 'street-racer';
  if (source.includes('toyota 2000gt')) return 'classic-coupe';
  if (source.includes('jimny')) return 'trail-compact';
  if (source.includes('khalifa') || source.includes('tower')) return 'skyline-architecture';
  if (source.includes('brandenburg') || source.includes('gate')) return 'monument';
  if (source.includes('santa maria') || source.includes('ship')) return 'nautical';
  if (source.includes('london at night') || source.includes('magic box')) return 'night-box';
  if (source.includes('blue marble') || source.includes('globe')) return 'planet-puzzle';
  if (source.includes('classic rose') || source.includes('clock')) return 'rose-clock';
  if (source.includes('lantern') || source.includes('floral')) return 'lantern-glow';
  if (source.includes('pintoo') || source.includes('puzzle') || source.includes('vase') || source.includes('lotus') || source.includes('koi')) return 'puzzle-object';
  if (source.includes('cubicfun') || source.includes('architecture') || source.includes('landmark')) return 'architecture';
  if (source.includes('aoshima') || source.includes('model kit') || source.includes('scale')) return 'precision-model';

  return 'display-build';
}

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
  const activeSlide = labelledSlides[activeIndex] ?? labelledSlides[0]!;

  return (
    <div
      className="hero-carousel"
      aria-label="Featured Iron Sprue hero products"
      style={{ '--hero-count': Math.max(1, count) } as CSSProperties}
    >
      {labelledSlides.map((slide, index) => {
        const isActive = index === activeIndex;
        const heroStyle = heroStyleForSlide(slide);
        const savingsBadge = heroStyle === 'night-box' ? '/assets/promo-save-33-banner.png' : null;
        return (
          <article
            className={`hero-slide${isActive ? ' is-active' : ''}`}
            data-fit="cover"
            data-hero-style={heroStyle}
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
            {savingsBadge ? (
              <div className="hero-brand hero-savings-badge">
                <img src={savingsBadge} alt="Save 33%" width="360" height="153" />
              </div>
            ) : slide.brandLogo ? (
              <div className="hero-brand">
                <img src={slide.brandLogo} alt={`${slide.brandName ?? 'Brand'} logo`} width="180" height="70" />
              </div>
            ) : null}
            <div className="hero-message">
              <h1>{slide.title}</h1>
              <p className="script-line">{slide.script}</p>
              {slide.copy ? <p className="lead">{slide.copy}</p> : null}
            </div>
          </article>
        );
      })}
      <a className="hero-shop-now" href={activeSlide.ctaHref}>{activeSlide.ctaLabel ?? 'Shop now'}</a>
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
