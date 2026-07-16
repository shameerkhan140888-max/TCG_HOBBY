import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CatalogueProductImage } from '@tcg-hobby/types';
import { ProductGallery } from './product-gallery';

const images: CatalogueProductImage[] = [
  {
    id: 'primary',
    url: '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp',
    altText: 'Pokemon TCG Mega Greninja ex Premium Collection box',
    imageType: 'primary',
    sortOrder: 1,
    isPrimary: true,
  },
  {
    id: 'boosters',
    url: '/products/pokemon/mega-greninja-ex-premium-collection/booster-packs.webp',
    altText: 'Eight Pokemon TCG booster packs included in the Mega Greninja ex Premium Collection',
    imageType: 'gallery',
    sortOrder: 2,
    isPrimary: false,
  },
  {
    id: 'promos',
    url: '/products/pokemon/mega-greninja-ex-premium-collection/promo-cards.webp',
    altText: 'Mega Greninja ex promotional card and oversized lenticular promotional card',
    imageType: 'gallery',
    sortOrder: 3,
    isPrimary: false,
  },
  {
    id: 'rear',
    url: '/products/pokemon/mega-greninja-ex-premium-collection/rear-packaging.webp',
    altText: 'Rear packaging of the Pokemon TCG Mega Greninja ex Premium Collection',
    imageType: 'gallery',
    sortOrder: 4,
    isPrimary: false,
  },
];

describe('ProductGallery', () => {
  it('renders a premium gallery entry point with thumbnails and image counter', () => {
    const markup = renderToStaticMarkup(<ProductGallery images={images} productName="Mega Greninja ex Premium Collection" />);

    expect(markup).toContain('Open image viewer for Pokemon TCG Mega Greninja ex Premium Collection box');
    expect(markup).toContain('Click to enlarge');
    expect(markup).toContain('1 / 4');
    expect(markup).toContain('Show Eight Pokemon TCG booster packs included in the Mega Greninja ex Premium Collection');
    expect(markup).toContain('Show Mega Greninja ex promotional card and oversized lenticular promotional card');
    expect(markup).toContain('Show Rear packaging of the Pokemon TCG Mega Greninja ex Premium Collection');
    expect(markup).toContain('object-contain');
  });
});
