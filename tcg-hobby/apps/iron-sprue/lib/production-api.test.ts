import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIronSprueProductionApiCatalogueProducts,
  getIronSprueProductionApiHomepagePlacements,
  getIronSprueProductionApiHomeProducts,
  getIronSprueProductionApiProduct,
  IRON_SPRUE_PRODUCTION_API_BASE_URL,
  requireIronSprueProductionApiBaseUrl,
  shouldUseIronSprueProductionApi,
} from './production-api';

const originalNodeEnv = process.env.NODE_ENV;
const originalBaseUrl = process.env[IRON_SPRUE_PRODUCTION_API_BASE_URL];

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cmt5xtr0u000u0lp7i9mdxk49',
    sku: 'IS-AOS-05627',
    slug: 'aoshima-05627-toyota-2000gt-white',
    name: 'Toyota 2000GT White',
    brand: 'Aoshima',
    game: 'Iron Sprue',
    category: { name: 'Model Kits', slug: 'model-kits' },
    productType: 'Plastic model kit',
    price: { amountMinor: 1999, currency: 'GBP' },
    stockState: 'LOW_STOCK',
    availableQuantity: 2,
    purchasable: true,
    featured: false,
    releaseStatus: 'RELEASED',
    releaseDate: null,
    image: { id: 'img-1', url: 'https://media.ironsprue.co.uk/products/is-aos-05627/image-2/toyota.webp', altText: 'Toyota image', sortOrder: 1, isPrimary: true },
    purchaseLimit: null,
    freeUkStandardShipping: false,
    availabilityMessage: null,
    scale: '1:24',
    buildLevel: 'Beginner',
    specifications: { scale: '1:24', buildLevel: 'Beginner' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv(IRON_SPRUE_PRODUCTION_API_BASE_URL, 'https://considerate-unity-production-b734.up.railway.app/');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  if (originalBaseUrl === undefined) delete process.env[IRON_SPRUE_PRODUCTION_API_BASE_URL];
  else process.env[IRON_SPRUE_PRODUCTION_API_BASE_URL] = originalBaseUrl;
});

describe('Iron Sprue production API client', () => {
  it('requires the explicit Cloudflare production API base URL in production', () => {
    expect(shouldUseIronSprueProductionApi()).toBe(true);
    expect(requireIronSprueProductionApiBaseUrl()).toBe('https://considerate-unity-production-b734.up.railway.app');

    vi.stubEnv(IRON_SPRUE_PRODUCTION_API_BASE_URL, '');
    expect(() => requireIronSprueProductionApiBaseUrl()).toThrow(IRON_SPRUE_PRODUCTION_API_BASE_URL);
  });

  it('maps Railway catalogue products into the storefront product shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        products: [product()],
        pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        filters: { search: '', category: '', sort: 'featured', page: 1, pageSize: 1 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIronSprueProductionApiCatalogueProducts(new URLSearchParams({ pageSize: '1' }));

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://considerate-unity-production-b734.up.railway.app/v1/catalogue?pageSize=1'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(result[0]).toMatchObject({
      id: 'cmt5xtr0u000u0lp7i9mdxk49',
      sku: 'IS-AOS-05627',
      slug: 'aoshima-05627-toyota-2000gt-white',
      name: 'Toyota 2000GT White',
      brand: 'Aoshima',
      retailPriceMinor: 1999,
      stockQuantity: 2,
      availableQuantity: 2,
      published: true,
      scale: '1:24',
      skillLevel: 'Beginner',
      specifications: { scale: '1:24', buildLevel: 'Beginner' },
      imageUrl: '/media/iron-sprue/products/is-aos-05627/image-2/toyota.webp',
    });
  });

  it('loads homepage commerce products from Railway /v1/home', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        featuredProducts: [product({ slug: 'featured-kit' })],
        latestProducts: [product({ slug: 'latest-kit', id: 'latest-1' })],
        categories: [],
        homepagePlacements: [
          {
            id: 'heading',
            placementKey: 'featured-products',
            title: '1:24 Scale Aoshima',
            ctaLabel: 'See all 1:24 kits',
            ctaHref: '/shop/model-kits?scale=1-24',
            imageUrl: null,
            active: true,
            sortOrder: 0,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIronSprueProductionApiHomeProducts();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://considerate-unity-production-b734.up.railway.app/v1/home'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(result.map((item) => item.slug)).toEqual(['featured-kit', 'latest-kit']);
  });

  it('includes products referenced by homepage placement rows even when they are not latest or featured', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          featuredProducts: [],
          latestProducts: [],
          categories: [],
          homepagePlacements: [
            {
              id: 'section-slot',
              placementKey: 'product-section:one-24-kits:pagani-zonda-f',
              title: '1:24 kits',
              ctaLabel: 'See all 1:24 kits',
              ctaHref: '/shop/model-kits?scale=1-24',
              imageUrl: null,
              active: true,
              sortOrder: 0,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          products: [
            product({ slug: 'pagani-zonda-f', id: 'pagani-1', sku: 'IS-AOS-05603' }),
            product({ slug: 'unplaced-kit', id: 'other-1', sku: 'OTHER' }),
          ],
          pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          filters: { search: '', category: '', sort: 'featured', page: 1, pageSize: 100 },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIronSprueProductionApiHomeProducts();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL('https://considerate-unity-production-b734.up.railway.app/v1/catalogue?pageSize=100'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(result.map((item) => item.slug)).toEqual(['pagani-zonda-f']);
  });


  it('loads homepage placement controls from Railway /v1/home', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        featuredProducts: [],
        latestProducts: [],
        categories: [],
        homepagePlacements: [
          {
            id: 'slot-1',
            placementKey: 'featured-product:pagani-zonda-f',
            title: 'Pagani Zonda F',
            ctaLabel: null,
            ctaHref: null,
            imageUrl: 'https://media.ironsprue.co.uk/products/is-aos-05603/image-2/pagani.webp',
            active: true,
            sortOrder: 1,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIronSprueProductionApiHomepagePlacements();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://considerate-unity-production-b734.up.railway.app/v1/home'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(result).toEqual([
      {
        id: 'slot-1',
        placementKey: 'featured-product:pagani-zonda-f',
        title: 'Pagani Zonda F',
        ctaLabel: null,
        ctaHref: null,
        imageUrl: '/media/iron-sprue/products/is-aos-05603/image-2/pagani.webp',
        active: true,
        sortOrder: 1,
      },
    ]);
  });

  it('loads product detail from Railway /v1/catalogue/:slug', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...product(),
        shortDescription: 'Customer PDP summary.',
        longDescription: 'Customer PDP long description.',
        contents: ['Plastic parts', 'Decals'],
        images: [{ id: 'img-1', url: 'https://media.ironsprue.co.uk/products/is-aos-05627/image-2/toyota.webp', altText: 'Toyota image', sortOrder: 1, isPrimary: true }],
        relatedProducts: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIronSprueProductionApiProduct('aoshima-05627-toyota-2000gt-white');

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://considerate-unity-production-b734.up.railway.app/v1/catalogue/aoshima-05627-toyota-2000gt-white'),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(result).toMatchObject({
      description: 'Customer PDP long description.',
      features: ['Plastic parts', 'Decals'],
      imageReferences: ['/media/iron-sprue/products/is-aos-05627/image-2/toyota.webp'],
    });
  });

  it('keeps already-routed production API media URLs on the current storefront origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        products: [product({
          image: {
            id: 'img-1',
            url: 'https://staging.ironsprue.co.uk/media/iron-sprue/products/is-aos-05627/image-2/toyota.webp',
            altText: 'Toyota image',
            sortOrder: 1,
            isPrimary: true,
          },
        })],
        pagination: { page: 1, pageSize: 1, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        filters: { search: '', category: '', sort: 'featured', page: 1, pageSize: 1 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIronSprueProductionApiCatalogueProducts(new URLSearchParams({ pageSize: '1' }));

    expect(result[0]?.imageUrl).toBe('/media/iron-sprue/products/is-aos-05627/image-2/toyota.webp');
  });
});
