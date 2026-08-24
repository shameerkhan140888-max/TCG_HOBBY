import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIronSprueCatalogueFilterOptions,
  getIronSprueCatalogueHomeData,
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
    brandId: 'brand-aos',
    categoryId: 'cat-model',
    supplierId: 'supplier-1',
    shortDescription: 'A plastic model kit.',
    fullDescription: 'Toyota 2000GT Red model kit.',
    featureBullets: ['1:24 scale'],
    specifications: { scale: '1:24' },
    buildType: 'Model Kits',
    tags: [],
    searchKeywords: ['toyota', 'aoshima'],
    seoTitle: 'Toyota 2000GT Red model kit',
    metaDescription: 'Aoshima Toyota 2000GT Red plastic model kit.',
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
    contentReviews: [],
    mediaAssets: [
      {
        id: 'media-1',
        role: 'catalogue-primary',
        url: null,
        storageKey: 'published/products/is-aos-05628/catalogue-primary.webp',
        altText: 'Toyota 2000GT Red clean catalogue image',
        approvalState: 'APPROVED',
        isPrimary: true,
        mimeType: 'image/webp',
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
        grossPriceMinor: { gt: 0 },
        shortDescription: { not: null },
        fullDescription: { not: null },
        seoTitle: { not: null },
        metaDescription: { not: null },
        contentReviews: {
          none: {
            status: { in: ['CONFLICT', 'REJECTED'] },
          },
        },
        mediaAssets: {
          some: {
            role: 'catalogue-primary',
            approvalState: 'APPROVED',
            isPrimary: true,
            AND: [
              {
                OR: [
                  { mimeType: { startsWith: 'image/' } },
                  { mimeType: null },
                ],
              },
              {
                OR: [
                  { url: { not: null } },
                  { storageKey: { not: null } },
                ],
              },
              {
                NOT: [
                  { storageKey: { endsWith: '.json' } },
                  { url: { endsWith: '.json' } },
                ],
              },
            ],
          },
        },
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

  it('requires approved primary catalogue media before a published product is public', async () => {
    const client = {
      ironSprueAdminProduct: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await getIronSprueCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        publicationState: 'PUBLISHED',
        mediaAssets: expect.objectContaining({
          some: expect.objectContaining({
            role: 'catalogue-primary',
            approvalState: 'APPROVED',
            isPrimary: true,
          }),
        }),
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

  it('uses the same canonical primary image for home, catalogue and product detail', async () => {
    const product = ironSprueProduct({ featured: true });
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([product]),
        findFirst: vi.fn().mockResolvedValue(product),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const home = await getIronSprueCatalogueHomeData(client as never);
    const catalogue = await getIronSprueCatalogueProducts({ search: '', category: '', sort: 'featured', page: 1, pageSize: 20 }, client as never);
    const detail = await getIronSprueCatalogueProductBySlug(product.slug, client as never);

    expect(home.featuredProducts[0]?.imageUrl).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
    expect(catalogue.products[0]?.imageUrl).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
    expect(detail?.images[0]?.url).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
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
