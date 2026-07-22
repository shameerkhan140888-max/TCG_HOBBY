import { describe, expect, it } from 'vitest';
import { orderActiveProductImages, resolveProductCardImage, resolveProductImageUrl, selectPrimaryProductImage } from './product-image-resolution';

const images = [
  { id: 'b', url: 'https://cdn.example.test/gallery.webp', thumbnailUrl: null, altText: 'Gallery', isPrimary: false, sortOrder: 1, deletionState: 'ACTIVE' },
  { id: 'a', url: 'https://cdn.example.test/primary.webp', thumbnailUrl: 'https://cdn.example.test/primary-card.webp', altText: 'Primary', isPrimary: true, sortOrder: 4, deletionState: 'ACTIVE' },
  { id: 'c', url: 'https://cdn.example.test/deleted.webp', thumbnailUrl: null, altText: 'Deleted', isPrimary: true, sortOrder: 0, deletionState: 'DELETED' },
];

describe('canonical product image resolution', () => {
  it('selects an active primary image before gallery ordering and ignores deleted media', () => {
    expect(selectPrimaryProductImage(images)?.id).toBe('a');
    expect(orderActiveProductImages(images).map((image) => image.id)).toEqual(['a', 'b']);
  });

  it('prefers the card derivative and accepts managed remote URLs', () => {
    expect(resolveProductCardImage(images)).toMatchObject({ image: { id: 'a' }, url: 'https://cdn.example.test/primary-card.webp' });
    expect(resolveProductImageUrl('https://cdn.example.test/primary.webp')).toBe('https://cdn.example.test/primary.webp');
  });

  it('uses a stable id tie-breaker when primary state and sort order are equal', () => {
    const tied = images.slice(0, 2).map((image) => ({ ...image, isPrimary: false, sortOrder: 1 }));
    expect(orderActiveProductImages(tied).map((image) => image.id)).toEqual(['a', 'b']);
  });
});
