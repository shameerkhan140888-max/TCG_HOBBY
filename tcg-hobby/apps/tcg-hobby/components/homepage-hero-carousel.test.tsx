import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HomepageHeroSlide } from '../lib/homepage-data';
import { HomepageHeroCarousel } from './homepage-hero-carousel';

function slide(overrides: Partial<HomepageHeroSlide> = {}): HomepageHeroSlide {
  return {
    id: 'mega-greninja',
    eyebrow: 'NOW AVAILABLE',
    headline: 'Mega Greninja ex Premium Collection',
    body: 'Exclusive collector items and eight booster packs.',
    primaryCta: { label: 'Shop now', href: '/catalogue/mega-greninja' },
    image: {
      src: '/products/pokemon/mega-greninja/primary.webp',
      alt: 'Mega Greninja ex Premium Collection',
    },
    ...overrides,
  };
}

describe('HomepageHeroCarousel visual composition', () => {
  it('renders a full-bleed background with focal positioning and a legibility overlay', () => {
    const markup = renderToStaticMarkup(
      <HomepageHeroCarousel
        slides={[slide({
          displayMode: 'FULL_BLEED',
          focalPoint: 'RIGHT',
          overlayStrength: 'BALANCED',
        })]}
      />,
    );

    expect(markup).toContain('data-hero-display-mode="FULL_BLEED"');
    expect(markup).toContain('data-hero-focal-point="RIGHT"');
    expect(markup).toContain('data-hero-overlay-strength="BALANCED"');
    expect(markup).toContain('object-cover');
    expect(markup).toContain('sm:object-[70%_center]');
    expect(markup).toContain('linear-gradient');
    expect(markup).not.toContain('object-contain');
  });

  it('retains contained mode for artwork that cannot tolerate full-bleed cropping', () => {
    const markup = renderToStaticMarkup(
      <HomepageHeroCarousel
        slides={[slide({
          displayMode: 'CONTAINED',
          focalPoint: 'CENTER',
          overlayStrength: 'LIGHT',
        })]}
      />,
    );

    expect(markup).toContain('data-hero-display-mode="CONTAINED"');
    expect(markup).toContain('data-hero-overlay-strength="LIGHT"');
    expect(markup).toContain('object-contain');
    expect(markup).toContain('radial-gradient');
  });

  it('uses compact mobile hierarchy without changing the desktop copy position', () => {
    const markup = renderToStaticMarkup(
      <HomepageHeroCarousel slides={[slide({ displayMode: 'FULL_BLEED', focalPoint: 'LEFT' })]} />,
    );

    expect(markup).toContain('data-hero-frame');
    expect(markup).toContain('h-[600px]');
    expect(markup).toContain('sm:h-[640px]');
    expect(markup).toContain('lg:h-[680px]');
    expect(markup).toContain('text-3xl');
    expect(markup).toContain('sm:text-4xl');
    expect(markup).toContain('object-center sm:object-left');
  });

  it('reserves stable headline, description, commerce, CTA and control regions for long and short copy', () => {
    const shortSlide = slide({ id: 'short', headline: 'Short title', body: 'Short description.' });
    const longSlide = slide({
      id: 'long',
      headline: 'A deliberately longer product title that still uses the same reserved headline region',
      body: 'A deliberately longer supporting description that demonstrates how every slide keeps the same commerce, call-to-action and carousel-control positions without changing the fixed hero frame.',
    });
    const shortMarkup = renderToStaticMarkup(<HomepageHeroCarousel slides={[shortSlide, longSlide]} />);
    const longMarkup = renderToStaticMarkup(<HomepageHeroCarousel slides={[longSlide, shortSlide]} />);

    for (const markup of [shortMarkup, longMarkup]) {
      expect(markup).toContain('data-hero-content-grid');
      expect(markup).toContain('data-hero-headline-region');
      expect(markup).toContain('data-hero-description-region');
      expect(markup).toContain('data-hero-commerce-region');
      expect(markup).toContain('data-hero-cta-region');
      expect(markup).toContain('data-hero-controls-region');
      expect(markup).toContain('grid-rows-[1.5rem_7.5rem_5.25rem_6rem_3rem_2.5rem]');
      expect(markup).toContain('line-clamp-3');
      expect(markup).toContain('sm:line-clamp-2');
    }
  });
});
