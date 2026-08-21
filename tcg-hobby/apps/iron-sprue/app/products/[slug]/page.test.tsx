import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import launchProducts from '../../../data/launch-products.json';
import type { IronSprueProduct } from '../../../lib/catalogue';
import ProductPage from './page';

const products = launchProducts as IronSprueProduct[];

vi.mock('../../../lib/admin-storefront-controls', () => ({
  getIronSprueStorefrontProducts: vi.fn(async () =>
    products.map((product) => {
      if (product.sku === 'IS-DLM-AC9') {
        return { ...product, imageUrl: '/media/iron-sprue/products/is-dlm-ac9/original.jpg' };
      }
      if (product.sku === 'IS-DLM-AC20') {
        return { ...product, imageUrl: '/media/iron-sprue/products/is-dlm-ac20/original.webp' };
      }
      return product;
    }),
  ),
}));

vi.mock('../../../lib/wishlist-actions', () => ({
  addIronSprueWishlistItemAction: vi.fn(),
}));

vi.mock('../../../components/product-gallery', () => ({
  ProductGallery: ({ images, productName }: { images: string[]; productName: string }) => (
    <div data-testid="gallery">
      {images.map((image) => <img src={image} alt={productName} key={image} />)}
    </div>
  ),
}));

vi.mock('../../../components/basket-client', () => ({
  AddToBasketButton: () => <button type="button">Add to basket</button>,
}));

describe('Iron Sprue product detail page', () => {
  it('renders core product detail data for a real Aoshima Back to the Future product', async () => {
    const markup = renderToStaticMarkup(await ProductPage({
      params: Promise.resolve({ slug: 'aoshima-06437-back-to-the-future-part-ii' }),
    }));

    expect(markup).toContain('Back to the Future');
    expect(markup).toContain('Aoshima');
    expect(markup).toContain('SKU IS-AOS-06437');
    expect(markup).toContain('Manufacturer Reference 06437');
    expect(markup).toContain('inc VAT');
    expect(markup).toContain('Add to basket');
    expect(markup).toContain('Save to wishlist');
    expect(markup).toContain('Build information');
  });

  it('renders configured add-ons with their resolved product images', async () => {
    const markup = renderToStaticMarkup(await ProductPage({
      params: Promise.resolve({ slug: 'aoshima-05628-toyota-2000gt-red' }),
    }));

    expect(markup).toContain('Toyota 2000GT Red');
    expect(markup).toContain('Recommended add-ons');
    expect(markup).toContain('/media/iron-sprue/products/is-dlm-ac9/original.jpg');
    expect(markup).toContain('/media/iron-sprue/products/is-dlm-ac20/original.webp');
    expect(markup).toContain('/products/deluxe-materials-ac9-micro-tips-tube');
    expect(markup.match(/Add to basket/g)?.length).toBeGreaterThan(1);
  });
});
