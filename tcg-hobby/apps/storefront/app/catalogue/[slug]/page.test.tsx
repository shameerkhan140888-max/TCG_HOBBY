import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CatalogueProductDetail } from '@tcg-hobby/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  product: undefined as CatalogueProductDetail | undefined,
  session: null as { user: { id: string; role: 'CUSTOMER' } } | null,
  wishlistIds: [] as string[],
  notificationIds: [] as Array<{ productId: string }>,
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not-found');
  },
}));

vi.mock('@tcg-hobby/database', () => ({
  MEGA_GRENINJA_PRODUCT_SLUG: 'pokemon-tcg-mega-greninja-ex-premium-collection',
  getCatalogueProductBySlug: vi.fn(async () => mocks.product),
  getCustomerNotificationSubscriptions: vi.fn(async () => mocks.notificationIds),
  getWishlistProductIds: vi.fn(async () => mocks.wishlistIds),
}));

vi.mock('../../../components/site-header', () => ({
  SiteHeader: () => <header>Storefront Header</header>,
}));

vi.mock('../../../components/product-gallery', () => ({
  ProductGallery: ({ images }: { images: CatalogueProductDetail['images'] }) => (
    <section data-testid="product-gallery">Gallery with {images.length} images</section>
  ),
}));

vi.mock('../../../components/cart-actions', () => ({
  AddToCartButton: ({ productId }: { productId: string }) => <button type="button">Add {productId}</button>,
  AddToCartWithQuantityForm: ({ productId }: { productId: string }) => <button type="button">Add to basket {productId}</button>,
}));

vi.mock('../../../lib/auth', () => ({
  getCurrentCustomerSession: vi.fn(async () => mocks.session),
}));

vi.mock('../../../lib/wishlist', () => ({
  toggleWishlistAction: vi.fn(),
}));

vi.mock('../../../lib/release-actions', () => ({
  toggleNotificationAction: vi.fn(),
}));

function megaGreninjaProduct(overrides: Partial<CatalogueProductDetail> = {}): CatalogueProductDetail {
  return {
    id: 'prod-mega-greninja',
    slug: 'pokemon-tcg-mega-greninja-ex-premium-collection',
    name: 'Pokemon TCG: Mega Greninja ex Premium Collection',
    game: 'Pokemon TCG',
    description: 'Take Mega Greninja ex into battle with a premium sealed collection.',
    categoryName: 'Pokemon',
    categorySlug: 'pokemon',
    price: { amountMinor: 4999, currency: 'GBP' },
    featured: true,
    inStock: true,
    stockOnHand: 3,
    reservedStock: 0,
    supplierName: 'Card Citadel',
    badge: 'Premium Collection',
    imageLabel: 'Product photography',
    imageUrl: '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp',
    imageAlt: 'Pokemon TCG Mega Greninja ex Premium Collection box',
    heroImageUrl: null,
    freeUkStandardShipping: true,
    releaseStatus: 'RELEASED',
    releaseDate: null,
    expectedDispatchAt: null,
    expectedArrivalAt: null,
    allocationLimit: null,
    customerPurchaseLimit: 1,
    supplierAllocation: null,
    lowAllocationThreshold: null,
    availabilityMessage: null,
    preorderBadgeLabel: null,
    comingSoonBadgeLabel: null,
    sku: 'PKM-MGREN-PC',
    setName: 'Premium Collection',
    condition: 'SEALED',
    longDescription:
      'Mega Greninja ex flips the battle upside down in this premium Pokemon TCG collection.\n\nTake Mega Greninja ex into battle with an exclusive promotional card, an oversized lenticular card, a reusable tech sticker and eight Pokemon TCG booster packs.\n\nThe collection includes Mega Greninja ex in both playable and oversized display formats, making it a strong choice for collectors, players and Mega Greninja fans looking for a premium Pokemon TCG release.',
    searchText: 'pokemon mega greninja',
    supplierSku: 'SUPPLIER-ONLY',
    leadTimeDays: 1,
    images: [
      {
        id: 'img-primary',
        url: '/products/pokemon/mega-greninja-ex-premium-collection/primary.webp',
        altText: 'Pokemon TCG Mega Greninja ex Premium Collection box',
        imageType: 'primary',
        sortOrder: 1,
        isPrimary: true,
      },
    ],
    relatedProducts: [],
    ...overrides,
  };
}

describe('Product detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.product = megaGreninjaProduct();
    mocks.session = { user: { id: 'customer-1', role: 'CUSTOMER' } };
    mocks.wishlistIds = [];
    mocks.notificationIds = [];
  });

  it('renders a premium purchase-focused hierarchy with consolidated product information', async () => {
    const ProductPage = (await import('./page')).default;
    const markup = renderToStaticMarkup(
      await ProductPage({
        params: Promise.resolve({ slug: 'pokemon-tcg-mega-greninja-ex-premium-collection' }),
      }),
    );

    const galleryIndex = markup.indexOf('data-testid="product-gallery"');
    const informationIndex = markup.indexOf('product-information-heading');
    const lowStockIndex = markup.indexOf('LOW STOCK');
    const priceIndex = markup.indexOf('49.99', lowStockIndex);
    const overviewCopyIndex = markup.indexOf('Take Mega Greninja ex into battle with an exclusive promotional card');

    expect(galleryIndex).toBeGreaterThan(-1);
    expect(informationIndex).toBeGreaterThan(galleryIndex);
    expect(lowStockIndex).toBeGreaterThan(-1);
    expect(lowStockIndex).toBeLessThan(priceIndex);
    expect(markup).toContain('LOW STOCK');
    expect(markup).toContain('FREE UK STANDARD DELIVERY');
    expect(markup).toContain('LIMIT 1 PER HOUSEHOLD');
    expect(markup).toContain('Add to basket prod-mega-greninja');
    expect(markup).toContain('aria-label="Add to wishlist"');
    expect(markup).toContain('Product information');
    expect(markup).toContain('Pokemon TCG: Mega Greninja ex Premium Collection');
    expect(markup).not.toContain('Everything in one place');
    expect(overviewCopyIndex).toBeGreaterThan(informationIndex);
    expect(markup).toContain('What’s Included');
    expect(markup).toContain('1 foil promo card featuring Mega Greninja ex');
    expect(markup).toContain('1 oversized lenticular promo card featuring Mega Greninja ex');
    expect(markup).toContain('1 tech sticker featuring Mega Greninja');
    expect(markup).toContain('8 Pokémon TCG booster packs');
    expect(markup).toContain('Booster-pack artwork and assortment may vary.');
    expect(markup).not.toContain('Detailed contents will be added');
    expect(markup).toContain('Delivery &amp; Returns');
    expect(markup).toContain('Purchase Limit');
    expect(markup).not.toContain('Sealed Product');
    expect(markup).not.toContain('Additional Product Details');
    expect(markup).not.toContain('Card Citadel');
    expect(markup).not.toContain('SUPPLIER-ONLY');
    expect(markup).not.toContain('Available stock');
    expect(markup).not.toContain('3 available');
    expect(markup).not.toContain('Only 3');
    expect(markup.match(/<details/g)).toHaveLength(4);
  });
});
