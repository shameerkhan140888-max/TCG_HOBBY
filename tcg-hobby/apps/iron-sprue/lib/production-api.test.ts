import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIronSprueProductionApiCatalogueProducts,
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
    slug: 'aoshima-05627-toyota-2000gt-white',
    name: 'Toyota 2000GT White',
    brand: 'Aoshima',
    game: 'Iron Sprue',
    category: { name: 'Model Kits', slug: 'model-kits' },
    productType: 'Plastic model kit',
    price: { amountMinor: 1999, currency: 'GBP' },
    stockState: 'LOW_STOCK',
    purchasable: true,
    featured: false,
    releaseStatus: 'RELEASED',
    releaseDate: null,
    image: { id: 'img-1', url: 'https://media.example/toyota.webp', altText: 'Toyota image', sortOrder: 1, isPrimary: true },
    purchaseLimit: null,
    freeUkStandardShipping: false,
    availabilityMessage: null,
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
      sku: 'cmt5xtr0u000u0lp7i9mdxk49',
      slug: 'aoshima-05627-toyota-2000gt-white',
      name: 'Toyota 2000GT White',
      brand: 'Aoshima',
      retailPriceMinor: 1999,
      stockQuantity: 1,
      published: true,
    });
  });

  it('loads homepage commerce products from Railway /v1/home', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        featuredProducts: [product({ slug: 'featured-kit' })],
        latestProducts: [product({ slug: 'latest-kit', id: 'latest-1' })],
        categories: [],
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

  it('loads product detail from Railway /v1/catalogue/:slug', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...product(),
        shortDescription: 'Customer PDP summary.',
        longDescription: 'Customer PDP long description.',
        contents: ['Plastic parts', 'Decals'],
        images: [{ id: 'img-1', url: 'https://media.example/toyota.webp', altText: 'Toyota image', sortOrder: 1, isPrimary: true }],
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
      imageReferences: ['https://media.example/toyota.webp'],
    });
  });
});
