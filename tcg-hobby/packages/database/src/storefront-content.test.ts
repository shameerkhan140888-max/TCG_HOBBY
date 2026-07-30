import { describe, expect, it, vi } from 'vitest';
import {
  getActiveHomepageHeroPlacements,
  getActiveStorefrontBanner,
  getHeroPlacementProductOptions,
  getPublicShopLandingPage,
  isSafeStorefrontHref,
  isSafeStorefrontMediaUrl,
  saveHomepageHeroPlacement,
  detachHomepageHeroImage,
  setManagedHomepageHeroImage,
} from './storefront-content';

describe('storefront content', () => {
  it('uses the canonical shipping message only before any banner has been configured', async () => {
    const db = {
      storefrontBanner: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
      },
    } as any;

    await expect(getActiveStorefrontBanner(new Date('2026-07-27T12:00:00Z'), db)).resolves.toMatchObject({
      message: 'Free standard delivery on orders over £50',
      active: true,
    });

    db.storefrontBanner.count.mockResolvedValue(1);
    await expect(getActiveStorefrontBanner(new Date('2026-07-27T12:00:00Z'), db)).resolves.toBeNull();
  });

  it('requests only active scheduled banners with deterministic ordering', async () => {
    const banner = { id: 'banner-1', message: 'Launch offer', active: true };
    const db = {
      storefrontBanner: {
        findFirst: vi.fn().mockResolvedValue(banner),
        count: vi.fn(),
      },
    } as any;
    const now = new Date('2026-07-27T12:00:00Z');

    await expect(getActiveStorefrontBanner(now, db)).resolves.toBe(banner);
    expect(db.storefrontBanner.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ active: true }),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    }));
    expect(db.storefrontBanner.count).not.toHaveBeenCalled();
  });

  it('returns only eligible in-stock hero placements and caps the public carousel at three', async () => {
    const placement = (id: string, stockOnHand: number) => ({
      id,
      headline: `Hero ${id}`,
      supportingText: 'Supporting text',
      ctaLabel: 'Shop now',
      ctaHref: `/catalogue/${id}`,
      imageUrl: null,
      imageAlt: null,
      imageSource: 'PRODUCT',
      imageDeletionState: 'ACTIVE',
      selectedProductImage: null,
      displayMode: 'FULL_BLEED',
      focalPoint: id === 'hero-1' ? 'RIGHT' : 'CENTER',
      overlayStrength: 'BALANCED',
      sortOrder: Number(id.slice(-1)),
      product: {
        id: `product-${id}`,
        slug: id,
        name: `Product ${id}`,
        priceMinor: 4999,
        salePriceMinor: null,
        freeUkStandardShipping: false,
        customerPurchaseLimit: null,
        inventory: { stockOnHand, reservedStock: 0 },
        images: [{ id: `image-${id}`, url: `/${id}.webp`, altText: `Product ${id}`, isPrimary: true, sortOrder: 1 }],
      },
    });
    const db = {
      homepageHeroPlacement: {
        findMany: vi.fn().mockResolvedValue([
          placement('hero-0', 0),
          placement('hero-1', 4),
          placement('hero-2', 4),
          placement('hero-3', 4),
          placement('hero-4', 4),
        ]),
      },
    } as any;

    const result = await getActiveHomepageHeroPlacements(new Date('2026-07-27T12:00:00Z'), db);

    expect(result.map((item) => item.id)).toEqual(['hero-1', 'hero-2', 'hero-3']);
    expect(result[0]).toMatchObject({
      displayMode: 'FULL_BLEED',
      focalPoint: 'RIGHT',
      overlayStrength: 'BALANCED',
    });
    expect(db.homepageHeroPlacement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ active: true }),
      take: 12,
    }));
  });

  it('uses canonical product media and routes for Admin hero product options', async () => {
    const db = {
      product: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'product-1',
          name: 'Mega Greninja',
          slug: 'mega-greninja',
          published: true,
          images: [{
            id: 'image-1',
            url: 'https://media.example.com/primary.webp',
            thumbnailUrl: null,
            altText: 'Mega Greninja collection box',
            isPrimary: true,
            sortOrder: 0,
            deletionState: 'ACTIVE',
            width: 1500,
            height: 1071,
          }],
        }]),
      },
    } as any;

    await expect(getHeroPlacementProductOptions(db)).resolves.toEqual([expect.objectContaining({
      id: 'product-1',
      storefrontPath: '/catalogue/mega-greninja',
      imageUrl: 'https://media.example.com/primary.webp',
      imageAlt: 'Mega Greninja collection box',
      imageWidth: 1500,
      imageHeight: 1071,
    })]);
  });

  it('prefers a dedicated hero image over the canonical product image', async () => {
    const db = {
      homepageHeroPlacement: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'hero-1',
          headline: 'Mega Greninja',
          supportingText: 'Premium collection',
          ctaLabel: 'Shop now',
          ctaHref: '/catalogue/mega-greninja',
          imageUrl: 'https://media.example/heroes/mega-greninja.webp',
          imageAlt: 'Mega Greninja hero artwork',
          imageSource: 'CUSTOM',
          imageDeletionState: 'ACTIVE',
          selectedProductImage: null,
          displayMode: 'FULL_BLEED',
          focalPoint: 'RIGHT',
          overlayStrength: 'BALANCED',
          sortOrder: 0,
          product: {
            id: 'product-1',
            slug: 'mega-greninja',
            name: 'Mega Greninja',
            priceMinor: 4999,
            salePriceMinor: null,
            freeUkStandardShipping: false,
            customerPurchaseLimit: null,
            inventory: { stockOnHand: 4, reservedStock: 0 },
            images: [{
              id: 'image-1',
              url: '/products/mega-greninja.webp',
              altText: 'Mega Greninja product image',
              isPrimary: true,
              sortOrder: 1,
            }],
          },
        }]),
      },
    } as any;

    const [placement] = await getActiveHomepageHeroPlacements(new Date('2026-07-27T12:00:00Z'), db);

    expect(placement).toMatchObject({
      imageUrl: 'https://media.example/heroes/mega-greninja.webp',
      imageAlt: 'Mega Greninja hero artwork',
    });
  });

  it('uses retained custom media only when the custom source is selected', async () => {
    const base = {
      id: 'hero-1',
      headline: 'Mega Greninja',
      supportingText: 'Premium collection',
      ctaLabel: 'Shop now',
      ctaHref: '/catalogue/mega-greninja',
      imageUrl: 'https://media.example/heroes/retained.webp',
      imageAlt: 'Retained hero artwork',
      imageDeletionState: 'ACTIVE',
      selectedProductImage: null,
      displayMode: 'FULL_BLEED',
      focalPoint: 'RIGHT',
      overlayStrength: 'BALANCED',
      sortOrder: 0,
      product: {
        id: 'product-1',
        slug: 'mega-greninja',
        name: 'Mega Greninja',
        priceMinor: 4999,
        salePriceMinor: null,
        freeUkStandardShipping: false,
        customerPurchaseLimit: null,
        inventory: { stockOnHand: 4, reservedStock: 0 },
        images: [{
          id: 'image-1',
          url: 'https://media.example/products/primary.webp',
          altText: 'Product image',
          isPrimary: true,
          sortOrder: 0,
        }],
      },
    };
    const db = { homepageHeroPlacement: { findMany: vi.fn() } } as any;

    db.homepageHeroPlacement.findMany.mockResolvedValue([{ ...base, imageSource: 'PRODUCT' }]);
    await expect(getActiveHomepageHeroPlacements(new Date(), db)).resolves.toEqual([
      expect.objectContaining({
        imageUrl: 'https://media.example/products/primary.webp',
        imageAlt: 'Product image',
      }),
    ]);

    db.homepageHeroPlacement.findMany.mockResolvedValue([{ ...base, imageSource: 'CUSTOM' }]);
    await expect(getActiveHomepageHeroPlacements(new Date(), db)).resolves.toEqual([
      expect.objectContaining({
        imageUrl: 'https://media.example/heroes/retained.webp',
        imageAlt: 'Retained hero artwork',
      }),
    ]);
  });

  it('uses an active selected product image and falls back when custom media is unavailable', async () => {
    const placement = {
      id: 'hero-1',
      productId: 'product-1',
      headline: 'Hero',
      supportingText: 'Copy',
      ctaLabel: 'Shop now',
      ctaHref: '/catalogue/product',
      imageUrl: null,
      imageAlt: null,
      imageSource: 'CUSTOM',
      imageDeletionState: 'ACTIVE',
      selectedProductImage: {
        id: 'image-2',
        productId: 'product-1',
        url: 'https://media.example/products/gallery.webp',
        altText: 'Gallery artwork',
        deletionState: 'ACTIVE',
      },
      displayMode: 'FULL_BLEED',
      focalPoint: 'CENTER',
      overlayStrength: 'BALANCED',
      sortOrder: 0,
      product: {
        id: 'product-1',
        slug: 'product',
        name: 'Product',
        priceMinor: 1000,
        salePriceMinor: null,
        freeUkStandardShipping: false,
        customerPurchaseLimit: null,
        inventory: { stockOnHand: 4, reservedStock: 0 },
        images: [{
          id: 'image-1',
          url: 'https://media.example/products/primary.webp',
          altText: 'Primary',
          isPrimary: true,
          sortOrder: 0,
        }],
      },
    };
    const db = { homepageHeroPlacement: { findMany: vi.fn() } } as any;
    db.homepageHeroPlacement.findMany.mockResolvedValue([placement]);
    await expect(getActiveHomepageHeroPlacements(new Date(), db)).resolves.toEqual([
      expect.objectContaining({
        imageUrl: 'https://media.example/products/gallery.webp',
        imageAlt: 'Gallery artwork',
      }),
    ]);

    db.homepageHeroPlacement.findMany.mockResolvedValue([{
      ...placement,
      selectedProductImage: null,
      imageDeletionState: 'PENDING_DELETE',
    }]);
    await expect(getActiveHomepageHeroPlacements(new Date(), db)).resolves.toEqual([
      expect.objectContaining({
        imageUrl: 'https://media.example/products/primary.webp',
        imageAlt: 'Primary',
      }),
    ]);

    db.homepageHeroPlacement.findMany.mockResolvedValue([{
      ...placement,
      selectedProductImage: null,
      imageDeletionState: 'PENDING_DELETE',
      product: { ...placement.product, images: [] },
    }]);
    await expect(getActiveHomepageHeroPlacements(new Date(), db)).resolves.toEqual([
      expect.objectContaining({ imageUrl: null, imageAlt: 'Product product image' }),
    ]);
  });

  it('rejects unsafe storefront CTA and media destinations', async () => {
    expect(isSafeStorefrontHref('/shop?search=cards')).toBe(true);
    expect(isSafeStorefrontHref('https://example.com')).toBe(false);
    expect(isSafeStorefrontHref('//example.com')).toBe(false);
    expect(isSafeStorefrontMediaUrl('/products/hero.webp')).toBe(true);
    expect(isSafeStorefrontMediaUrl('https://media.example.com/hero.webp')).toBe(true);
    expect(isSafeStorefrontMediaUrl('http://media.example.com/hero.webp')).toBe(false);

    await expect(saveHomepageHeroPlacement(null, {
      productId: 'product-1',
      headline: 'Headline',
      supportingText: 'Supporting text',
      ctaLabel: 'Shop now',
      ctaHref: 'https://example.com',
      active: true,
    }, {} as any)).rejects.toThrow('internal storefront path');
  });

  it('rejects hero copy beyond the supported layout limits', async () => {
    const input = {
      productId: 'product-1',
      headline: 'H'.repeat(91),
      supportingText: 'Supporting text',
      ctaLabel: 'Shop now',
      ctaHref: '/catalogue/product-1',
      active: true,
    };

    await expect(saveHomepageHeroPlacement(null, input, {} as any))
      .rejects.toThrow('90 characters');
    await expect(saveHomepageHeroPlacement(null, {
      ...input,
      headline: 'Supported headline',
      supportingText: 'S'.repeat(181),
    }, {} as any)).rejects.toThrow('180 characters');
  });

  it('defaults new hero placements to a balanced full-bleed composition', async () => {
    const db = {
      product: {
        findUnique: vi.fn().mockResolvedValue({ id: 'product-1' }),
      },
      homepageHeroPlacement: {
        create: vi.fn().mockResolvedValue({ id: 'hero-1' }),
      },
    } as any;

    await saveHomepageHeroPlacement(null, {
      productId: 'product-1',
      headline: 'Mega Greninja',
      supportingText: 'Premium collection',
      ctaLabel: 'Shop now',
      ctaHref: '/catalogue/mega-greninja',
      active: true,
    }, db);

    expect(db.homepageHeroPlacement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageSource: 'PRODUCT',
        displayMode: 'FULL_BLEED',
        focalPoint: 'CENTER',
        overlayStrength: 'BALANCED',
      }),
    });
  });

  it('switches to product-image mode without deleting or validating retained custom media', async () => {
    const db = {
      product: {
        findUnique: vi.fn().mockResolvedValue({ id: 'product-1' }),
      },
      productImage: {
        findFirst: vi.fn(),
      },
      homepageHeroPlacement: {
        update: vi.fn().mockResolvedValue({ id: 'hero-1' }),
      },
    } as any;

    await saveHomepageHeroPlacement('hero-1', {
      productId: 'product-1',
      headline: 'Mega Greninja',
      supportingText: 'Premium collection',
      ctaLabel: 'Shop now',
      ctaHref: '/catalogue/mega-greninja',
      imageSource: 'PRODUCT',
      selectedProductImageId: 'retained-image',
      imageUrl: 'https://media.example/heroes/retained.webp',
      imageAlt: 'Retained artwork',
      active: true,
    }, db);

    expect(db.productImage.findFirst).not.toHaveBeenCalled();
    const data = db.homepageHeroPlacement.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ imageSource: 'PRODUCT' });
    expect(data).not.toHaveProperty('selectedProductImageId');
    expect(data).not.toHaveProperty('imageUrl');
    expect(data).not.toHaveProperty('imageAlt');
  });

  it('stores managed hero metadata on the placement and detaches it without product-image writes', async () => {
    const update = vi.fn()
      .mockResolvedValueOnce({ id: 'hero-1', productId: 'product-1', imageUrl: 'https://media.example/hero.webp' })
      .mockResolvedValueOnce({ id: 'hero-1' });
    const tx = {
      homepageHeroPlacement: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'hero-1', imageStorageKey: null })
          .mockResolvedValueOnce({ id: 'hero-1', productId: 'product-1', imageStorageKey: 'heroes/hero-1/a/main.webp' }),
        update,
      },
      productImage: { update: vi.fn() },
    };
    const db = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } as any;

    await setManagedHomepageHeroImage({
      placementId: 'hero-1',
      url: 'https://media.example/hero.webp',
      thumbnailUrl: 'https://media.example/hero-thumb.webp',
      storageKey: 'heroes/hero-1/a/main.webp',
      altText: 'Authorised promotional artwork',
      width: 2400,
      height: 1200,
      mimeType: 'image/webp',
      byteSize: 1234,
      uploadedById: 'admin-1',
    }, db);
    await detachHomepageHeroImage('hero-1', db);

    expect(update).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ imageSource: 'CUSTOM', selectedProductImageId: null }),
    }));
    expect(update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ imageSource: 'PRODUCT', imageUrl: null, imageStorageKey: null }),
    }));
    expect(tx.productImage.update).not.toHaveBeenCalled();
  });

  it('falls back to maintained department copy when an Admin landing page is inactive', async () => {
    const db = {
      shopLandingPage: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'landing-1',
          scopeKey: 'pokemon',
          heading: 'Hidden campaign heading',
          supportingText: 'Hidden campaign copy',
          active: false,
        }),
      },
    } as any;

    await expect(getPublicShopLandingPage('pokemon', db)).resolves.toMatchObject({
      id: null,
      heading: 'Explore Pokémon TCG',
      active: true,
    });
  });
});
