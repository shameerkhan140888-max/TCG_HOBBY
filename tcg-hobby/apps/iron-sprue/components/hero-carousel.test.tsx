import { describe, expect, it } from 'vitest';
import { heroStyleForSlide } from './hero-carousel';
import type { IronSprueHeroSlide } from '../lib/admin-storefront-controls';

function slide(overrides: Partial<IronSprueHeroSlide>): IronSprueHeroSlide {
  return {
    label: 'In stock',
    availabilityLabel: 'In stock',
    title: 'Display build',
    script: 'Built for the shelf.',
    copy: '',
    image: '/assets/example.png',
    sourceProductSlug: 'example-product',
    alt: 'Example hero',
    ctaHref: '/products/example-product',
    ctaLabel: 'Shop now',
    secondaryHref: '/shop',
    meta: [],
    ...overrides,
  };
}

describe('Iron Sprue hero carousel style keys', () => {
  it('uses the approved time-machine treatment for DeLorean heroes only', () => {
    expect(heroStyleForSlide(slide({
      title: 'DeLorean detail for the display shelf.',
      script: '1:24 scale, film icon, bench-ready.',
      sourceProductSlug: 'aoshima-06437-back-to-the-future-part-ii',
      brandName: 'Aoshima',
    }))).toBe('time-machine');
  });

  it('maps other hero moods to distinct typography treatments', () => {
    expect(heroStyleForSlide(slide({
      title: 'Bundle savings for display builds.',
      script: 'Three-piece sets, better value.',
    }))).toBe('workshop-bundle');

    expect(heroStyleForSlide(slide({
      title: 'A puzzle vase made to stay out.',
      script: 'Piece by piece, then display.',
      brandName: 'Pintoo',
      meta: ['3D Puzzle Objects'],
    }))).toBe('puzzle-object');

    expect(heroStyleForSlide(slide({
      title: 'Burj Khalifa for the display shelf.',
      brandName: 'CubicFun',
      meta: ['Architecture'],
    }))).toBe('skyline-architecture');

    expect(heroStyleForSlide(slide({
      title: 'Skyline GTR Red Pearl',
      brandName: 'Aoshima',
    }))).toBe('street-racer');

    expect(heroStyleForSlide(slide({
      title: 'Jigsaw Lantern - Floral',
      brandName: 'Pintoo',
    }))).toBe('lantern-glow');
  });
});
