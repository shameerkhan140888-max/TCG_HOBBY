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
    scale: '1:24',
    difficulty: 'Beginner',
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
        OR: expect.arrayContaining([
          expect.objectContaining({
            mediaAssets: expect.objectContaining({
              some: expect.objectContaining({
                role: 'catalogue-primary',
                approvalState: 'APPROVED',
                isPrimary: true,
              }),
            }),
          }),
        ]),
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
      scale: '1:24',
      buildLevel: 'Beginner',
      specifications: expect.objectContaining({ scale: '1:24', buildLevel: 'Beginner' }),
    });
  });

  it('projects verified scale and build level from canonical specifications when direct columns are empty', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({
            scale: null,
            difficulty: null,
            specifications: { scale: '1:32', buildLevel: 'Beginner', pieces: '160' },
          }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(result.products[0]).toMatchObject({
      scale: '1:32',
      buildLevel: 'Beginner',
      specifications: expect.objectContaining({
        scale: '1:32',
        buildLevel: 'Beginner',
        pieces: '160',
      }),
    });
  });

  it('keeps supplier and manufacturer reference codes out of public specifications', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({
            scale: null,
            supplierProductCode: '05628',
            mpn: '05628',
            specifications: {
              scale: '1:32',
              supplierCode: '05628',
              manufacturerReference: '05628',
              adminSourceReference: 'launch-import',
            },
          }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(result.products[0]?.sku).toBe('IS-AOS-05628');
    expect(result.products[0]?.specifications).toMatchObject({ scale: '1:32' });
    expect(result.products[0]?.specifications).not.toHaveProperty('supplierCode');
    expect(result.products[0]?.specifications).not.toHaveProperty('manufacturerReference');
    expect(result.products[0]?.specifications).not.toHaveProperty('adminSourceReference');
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

  it('applies scale filters to canonical Iron Sprue products after specification projection', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({
            id: 'scale-match',
            scale: null,
            specifications: { scale: '1:24' },
          }),
          ironSprueProduct({
            id: 'scale-miss',
            sku: 'IS-AOS-06347',
            slug: 'aoshima-06347-lamborghini-aventador-red',
            customerTitle: 'Lamborghini Aventador Red',
            scale: null,
            specifications: { scale: '1:32' },
          }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      brand: 'aoshima',
      category: 'model-kits',
      scale: '1-24',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(result.products.map((product) => product.id)).toEqual(['scale-match']);
  });

  it('searches customer-facing canonical specification facts', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({
            id: 'piece-match',
            brand: { id: 'brand-pin', name: 'Pintoo', slug: 'pintoo' },
            category: { id: 'cat-puzzle', name: '3D Puzzles & Builds', slug: '3d-puzzles-and-builds', description: '3D Puzzles', sortOrder: 20 },
            buildType: '3D puzzle object',
            customerTitle: 'Children Vase',
            sku: 'IS-PIN-S1024',
            slug: 'pintoo-s1024-children-vase',
            specifications: { pieces: '160', structure: 'Vase' },
            searchKeywords: ['vase'],
          }),
          ironSprueProduct({
            id: 'piece-miss',
            specifications: { pieces: '44', structure: 'Landmark' },
          }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '160 pieces',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(result.products.map((product) => product.sku)).toEqual(['IS-PIN-S1024']);
  });

  it('filters offers through the canonical special-offer flag', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({ id: 'offer-match', specialOffer: true }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      category: '',
      offers: 'true',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(client.ironSprueAdminProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([expect.objectContaining({ specialOffer: true })]),
      }),
    }));
    expect(result.products[0]?.specialOffer).toBe(true);
  });

  it('filters customer-facing catalogue facts after specification projection', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({
            id: 'fact-match',
            brand: { id: 'brand-pin', name: 'Pintoo', slug: 'pintoo' },
            category: { id: 'cat-puzzle', name: '3D Puzzles & Builds', slug: '3d-puzzles-and-builds', description: '3D Puzzles', sortOrder: 20 },
            buildType: '3D puzzle object',
            customerTitle: 'Children Vase',
            sku: 'IS-PIN-S1024',
            slug: 'pintoo-s1024-children-vase',
            inventory: { availableStock: 2, reservedStock: 0 },
            specifications: { pieces: '160', structure: 'Vase' },
          }),
          ironSprueProduct({
            id: 'fact-miss',
            brand: { id: 'brand-cub', name: 'CubicFun', slug: 'cubicfun' },
            category: { id: 'cat-puzzle', name: '3D Puzzles & Builds', slug: '3d-puzzles-and-builds', description: '3D Puzzles', sortOrder: 20 },
            buildType: '3D puzzle model',
            customerTitle: 'Burj Al Arab',
            sku: 'IS-CUB-C112H',
            slug: 'cubicfun-c112h-burj-al-arab',
            inventory: { availableStock: 12, reservedStock: 0 },
            specifications: { pieces: '44', structure: 'Landmark' },
          }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      category: '',
      pieceCount: '160',
      structure: 'Vase',
      availability: 'low-stock',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(result.products.map((product) => product.sku)).toEqual(['IS-PIN-S1024']);
  });

  it('filters Aoshima vehicle manufacturer from canonical/public product facts', async () => {
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([
          ironSprueProduct({
            id: 'lambo',
            customerTitle: 'Lamborghini Aventador Red',
            sourceTitle: 'Lamborghini Aventador source',
            sku: 'IS-AOS-06347',
            slug: 'aoshima-06347-lamborghini-aventador-red',
            specifications: { scale: '1:32' },
          }),
          ironSprueProduct({
            id: 'toyota',
            customerTitle: 'Toyota 2000GT Red',
            sourceTitle: 'Toyota 2000GT source',
            sku: 'IS-AOS-05628',
            slug: 'aoshima-05628-toyota-2000gt-red',
            specifications: { scale: '1:24' },
          }),
        ]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getIronSprueCatalogueProducts({
      search: '',
      category: 'model-kits',
      vehicleManufacturer: 'Lamborghini',
      sort: 'featured',
      page: 1,
      pageSize: 20,
    }, client as never);

    expect(result.products.map((product) => product.sku)).toEqual(['IS-AOS-06347']);
  });

  it('requires customer-facing media before a published product is public', async () => {
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
        OR: expect.arrayContaining([
          expect.objectContaining({
            mediaAssets: expect.objectContaining({
              some: expect.objectContaining({
                role: 'catalogue-primary',
                approvalState: 'APPROVED',
                isPrimary: true,
              }),
            }),
          }),
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

  it('keeps admin verification and provenance notes out of public Iron Sprue product copy', async () => {
    const product = ironSprueProduct({
      shortDescription: 'Toyota 2000GT Red is a display-focused Aoshima model kit.',
      fullDescription: [
        'This Aoshima release focuses on the Toyota 2000GT in Red, making it a clean choice for an automotive modelling bench or a finished shelf display.',
        'Scale, contents and assembly requirements are not stated in the current verified catalogue fields, so those details are intentionally omitted until the product packaging or manufacturer data is reviewed.',
        'The listing is built from the launch catalogue and associated supplier or manufacturer source material already captured for Iron Sprue.',
      ].join('\n\n'),
      featureBullets: [
        'Aoshima vehicle model kit',
        'Supplier code preserved for launch stock record matching',
      ],
      contents: 'Toyota 2000GT subject\n\nOnly catalogue-confirmed details have been used here.',
      seoTitle: 'Toyota 2000GT Red model kit',
      metaDescription: 'Internal review: needs verification before launch.',
    });
    const client = {
      ironSprueAdminProduct: { findFirst: vi.fn().mockResolvedValue(product) },
    };

    const result = await getIronSprueCatalogueProductBySlug(product.slug, client as never);
    const publicPayload = JSON.stringify(result);

    expect(result?.longDescription).toBe([
      'Toyota 2000GT Red is a display-focused Aoshima model kit.',
      'This Aoshima release focuses on the Toyota 2000GT in Red, making it a clean choice for an automotive modelling bench or a finished shelf display.',
    ].join('\n\n'));
    expect(result?.contents).toEqual(['Toyota 2000GT subject']);
    expect(result?.metaDescription).toBeNull();
    expect(publicPayload).not.toMatch(/intentionally omitted until|verified catalogue fields|built from the launch catalogue|source material|launch stock record|internal review|needs verification/i);
  });

  it('uses the short description as the full PDP opening copy and removes internal catalogue-status notes', async () => {
    const product = ironSprueProduct({
      shortDescription: '3D Jigsaw Vase - Koi Carp and Lotus is a Pintoo vase puzzle selected for customers who want a decorative 3D build with a finished-object feel.',
      fullDescription: [
        'This Pintoo piece is built around the 3D Jigsaw Vase - Koi Carp and Lotus design, offering a more giftable and display-led alternative to a conventional flat puzzle.',
        'The catalogue currently confirms the brand, product title and supplier reference.',
        'Unsupported claims such as piece count, dimensions, materials and age grading have been left out until they are verified from manufacturer packaging or source data.',
      ].join(' '),
    });
    const client = {
      ironSprueAdminProduct: { findFirst: vi.fn().mockResolvedValue(product) },
    };

    const result = await getIronSprueCatalogueProductBySlug(product.slug, client as never);

    expect(result?.longDescription).toBe([
      '3D Jigsaw Vase - Koi Carp and Lotus is a Pintoo vase puzzle selected for customers who want a decorative 3D build with a finished-object feel.',
      'This Pintoo piece is built around the 3D Jigsaw Vase - Koi Carp and Lotus design, offering a more giftable and display-led alternative to a conventional flat puzzle.',
    ].join('\n\n'));
    expect(result?.longDescription).not.toMatch(/catalogue currently confirms|unsupported claims|supplier reference|source data/i);
  });

  it('uses the same canonical primary image for home, catalogue and product detail', async () => {
    const product = ironSprueProduct({ featured: true });
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([product]),
        findFirst: vi.fn().mockResolvedValue(product),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminHomepagePlacement: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminBrand: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const home = await getIronSprueCatalogueHomeData(client as never);
    const catalogue = await getIronSprueCatalogueProducts({ search: '', category: '', sort: 'featured', page: 1, pageSize: 20 }, client as never);
    const detail = await getIronSprueCatalogueProductBySlug(product.slug, client as never);

    expect(home.featuredProducts[0]?.imageUrl).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
    expect(catalogue.products[0]?.imageUrl).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
    expect(detail?.images[0]?.url).toBe('/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp');
  });

  it('projects saved homepage product placements for the public homepage', async () => {
    const first = ironSprueProduct({ slug: 'first-kit', sku: 'FIRST', customerTitle: 'First Kit' });
    const second = ironSprueProduct({ slug: 'second-kit', sku: 'SECOND', customerTitle: 'Second Kit' });
    const client = {
      ironSprueAdminProduct: {
        findMany: vi.fn().mockResolvedValue([first, second]),
      },
      ironSprueAdminCategory: { findMany: vi.fn().mockResolvedValue([]) },
      ironSprueAdminHomepagePlacement: {
        findMany: vi.fn().mockResolvedValue([
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
          {
            id: 'slot-2',
            placementKey: 'featured-product:second-kit',
            title: 'Second Kit',
            ctaLabel: null,
            ctaHref: null,
            imageUrl: null,
            active: true,
            sortOrder: 1,
          },
          {
            id: 'slot-1',
            placementKey: 'featured-product:first-kit',
            title: 'First Kit',
            ctaLabel: null,
            ctaHref: null,
            imageUrl: null,
            active: true,
            sortOrder: 2,
          },
        ]),
      },
      ironSprueAdminBrand: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const home = await getIronSprueCatalogueHomeData(client as never);

    expect(home.homepagePlacements).toEqual([
      expect.objectContaining({ placementKey: 'featured-products', title: '1:24 Scale Aoshima' }),
      expect.objectContaining({ placementKey: 'featured-product:second-kit' }),
      expect.objectContaining({ placementKey: 'featured-product:first-kit' }),
    ]);
    expect(home.featuredProducts.map((product) => product.slug)).toEqual(['second-kit', 'first-kit']);
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
