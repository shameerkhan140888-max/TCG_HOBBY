import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIronSprueCatalogueFilterOptions,
  getIronSprueCatalogueProductBySlug,
  getIronSprueCatalogueProducts,
} from './iron-sprue-catalogue.js';

function ironSprueProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iron-product-1',
    storeCode: 'IRON_SPRUE',
    sourceTitle: 'Toyota 2000GT Red source',
    customerTitle: 'Toyota 2000GT Red',
    slug: 'aoshima-05628-toyota-2000gt-red',
    sku: 'IS-AOS-05628',
    supplierProductCode: '05628',
    barcode: null,
    mpn: '05628',
    shortDescription: 'A plastic model kit.',
    fullDescription: 'Toyota 2000GT Red model kit.',
    featureBullets: ['1:24 scale'],
    specifications: null,
    buildType: 'Model Kits',
    tags: [],
    searchKeywords: ['toyota', 'aoshima'],
    seoTitle: null,
    metaDescription: null,
    grossPriceMinor: 1999,
    vatRate: 20,
    currency: 'GBP',
    publicationState: 'PUBLISHED',
    featured: false,
    newArrival: true,
    comingSoon: false,
    specialOffer: false,
    brand: { id: 'brand-aos', name: 'Aoshima', slug: 'aoshima' },
    category: { id: 'cat-model', name: 'Model Kits', slug: 'model-kits', description: 'Model kits', sortOrder: 10 },
    supplier: { id: 'supplier-1', name: 'Tasma Products' },
    inventory: { availableStock: 2, reservedStock: 1 },
    mediaAssets: [
      {
        id: 'media-1',
        role: 'catalogue-primary',
        url: null,
        storageKey: 'published/products/is-aos-05628/catalogue-primary.webp',
        altText: 'Toyota 2000GT Red clean catalogue image',
        approvalState: 'APPROVED',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

describe('Iron Sprue production catalogue adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries the canonical Iron Sprue admin catalogue and hides non-published products', async () => {
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([ironSprueProduct()]) },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        publicationState: 'PUBLISHED',
        archivedAt: null,
        grossPriceMinor: { not: null },
      }),
    }));
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      slug: 'aoshima-05628-toyota-2000gt-red',
      name: 'Toyota 2000GT Red',
      brand: 'Aoshima',
      categoryName: 'Model Kits',
      stockOnHand: 2,
      reservedStock: 1,
      imageUrl: '/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp',
    });
  });

  it('applies brand and category filters to Iron Sprue relationships', async () => {
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await getIronSprueCatalogueProducts({
      search: '',
      brand: 'aoshima',
      category: 'model-kits',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({ storeCode: 'IRON_SPRUE', publicationState: 'PUBLISHED' }),
          expect.objectContaining({ OR: expect.arrayContaining([{ category: { is: { slug: 'model-kits' } } }]) }),
          expect.objectContaining({ OR: expect.arrayContaining([{ brand: { is: { slug: 'aoshima' } } }]) }),
        ]),
      }),
    }));
  });

  it('resolves product detail from Iron Sprue admin records only', async () => {
    const client = {
      ironSprueAdminProduct: { findFirst: vi.fn().mockResolvedValue(ironSprueProduct()) },
    };

    const result = await getIronSprueCatalogueProductBySlug('aoshima-05628-toyota-2000gt-red', client as never);

    expect(client.ironSprueAdminProduct.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        storeCode: 'IRON_SPRUE',
        slug: 'aoshima-05628-toyota-2000gt-red',
        publicationState: 'PUBLISHED',
      }),
    }));
    expect(result?.sku).toBe('IS-AOS-05628');
    expect(result?.images[0]?.url).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
  });

  it('builds filters from Iron Sprue brands and categories', async () => {
    const client = {
      ironSprueAdminBrand: {
        findMany: vi.fn().mockResolvedValue([{ id: 'brand-aos', name: 'Aoshima', slug: 'aoshima' }]),
      },
      ironSprueAdminCategory: {
        findMany: vi.fn().mockResolvedValue([{ id: 'cat-model', name: 'Model Kits', slug: 'model-kits', description: null, sortOrder: 1, products: [{ id: 'p1' }] }]),
      },
    };

    const result = await getIronSprueCatalogueFilterOptions(client as never);

    expect(result.brands).toEqual([{ id: 'brand-aos', name: 'Aoshima', value: 'aoshima', gameId: null }]);
    expect(result.categories).toEqual([{ id: 'cat-model', name: 'Model Kits', value: 'model-kits', gameId: null }]);
  });
});
