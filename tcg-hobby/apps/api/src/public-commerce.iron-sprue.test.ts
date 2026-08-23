import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const databaseMocks = vi.hoisted(() => ({
  addIronSprueProductToCart: vi.fn(),
  getCatalogueHomeData: vi.fn(),
  getCatalogueProductBySlug: vi.fn(),
  getCatalogueProducts: vi.fn(),
  getCustomerCartDetails: vi.fn(),
  getIronSprueCatalogueFilterOptions: vi.fn(),
  getIronSprueCatalogueHomeData: vi.fn(),
  getIronSprueCatalogueProductBySlug: vi.fn(),
  getIronSprueCatalogueProducts: vi.fn(),
  getIronSprueCustomerCartDetails: vi.fn(),
  createIronSprueHostedCheckoutSession: vi.fn(),
  createHostedCheckoutSession: vi.fn(),
}));

vi.mock('@tcg-hobby/database', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@tcg-hobby/database');
  return {
    ...actual,
    ...databaseMocks,
  };
});

const originalPublicStore = process.env.PUBLIC_COMMERCE_STORE_CODE;
const originalIronKeyId = process.env.IRON_SPRUE_INTERNAL_API_KEY_ID;
const originalIronAccount = process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID;
const originalIronSiteUrl = process.env.IRON_SPRUE_SITE_URL;

function catalogueProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iron-product-1',
    slug: 'aoshima-05628-toyota-2000gt-red',
    name: 'Toyota 2000GT Red',
    brand: 'Aoshima',
    game: 'Iron Sprue',
    productType: 'Model Kits',
    description: 'A plastic model kit.',
    categoryName: 'Model Kits',
    categorySlug: 'model-kits',
    price: { amountMinor: 1999, currency: 'GBP' },
    featured: false,
    inStock: true,
    stockOnHand: 2,
    reservedStock: 0,
    supplierName: 'Tasma Products',
    badge: 'New',
    imageLabel: 'Toyota 2000GT Red',
    imageUrl: '/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp',
    imageAlt: 'Toyota 2000GT Red clean catalogue image',
    releaseStatus: 'RELEASED',
    ...overrides,
  };
}

function pagination(totalItems = 1) {
  return {
    page: 1,
    pageSize: 20,
    totalItems,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

function cartSummary() {
  return {
    items: [
      {
        id: 'iron-product-1',
        productId: 'iron-product-1',
        productName: 'Toyota 2000GT Red',
        productSlug: 'aoshima-05628-toyota-2000gt-red',
        quantity: 1,
        unitPriceMinor: 1999,
        totalMinor: 1999,
        inStock: true,
        availableQuantity: 2,
        imageUrl: '/media/iron-sprue/published/products/is-aos-05628/catalogue-primary.webp',
        imageAlt: 'Toyota 2000GT Red clean catalogue image',
      },
    ],
    subtotalMinor: 1999,
    currency: 'GBP',
    totalItems: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PUBLIC_COMMERCE_STORE_CODE = 'IRON_SPRUE';
  delete process.env.IRON_SPRUE_INTERNAL_API_KEY_ID;
  delete process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID;
  delete process.env.IRON_SPRUE_SITE_URL;
});

afterEach(() => {
  if (originalPublicStore === undefined) delete process.env.PUBLIC_COMMERCE_STORE_CODE;
  else process.env.PUBLIC_COMMERCE_STORE_CODE = originalPublicStore;
  if (originalIronKeyId === undefined) delete process.env.IRON_SPRUE_INTERNAL_API_KEY_ID;
  else process.env.IRON_SPRUE_INTERNAL_API_KEY_ID = originalIronKeyId;
  if (originalIronAccount === undefined) delete process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID;
  else process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID = originalIronAccount;
  if (originalIronSiteUrl === undefined) delete process.env.IRON_SPRUE_SITE_URL;
  else process.env.IRON_SPRUE_SITE_URL = originalIronSiteUrl;
});

describe('PublicCommerceService Iron Sprue source selection', () => {
  it('serves catalogue products from Iron Sprue admin catalogue tables', async () => {
    const { PublicCommerceService } = await import('./public-commerce.service.js');
    databaseMocks.getIronSprueCatalogueProducts.mockResolvedValue({
      products: [catalogueProduct()],
      pagination: pagination(),
      categories: [],
      filters: { search: '', category: '', sort: 'featured', page: 1, pageSize: 20, brand: 'aoshima' },
    });
    const service = new PublicCommerceService({} as never);

    const result = await service.catalogue({ brand: 'aoshima' });

    expect(databaseMocks.getIronSprueCatalogueProducts).toHaveBeenCalledWith(expect.objectContaining({ brand: 'aoshima' }));
    expect(databaseMocks.getCatalogueProducts).not.toHaveBeenCalled();
    expect(result.products[0]).toMatchObject({ slug: 'aoshima-05628-toyota-2000gt-red', brand: 'Aoshima' });
  });

  it('serves home data from the same Iron Sprue catalogue source', async () => {
    const { PublicCommerceService } = await import('./public-commerce.service.js');
    databaseMocks.getIronSprueCatalogueHomeData.mockResolvedValue({
      featuredProducts: [catalogueProduct({ id: 'featured-1' })],
      categories: [{ id: 'cat-model', name: 'Model Kits', slug: 'model-kits', description: '', sortOrder: 1, productCount: 1 }],
    });
    databaseMocks.getIronSprueCatalogueProducts.mockResolvedValue({
      products: [catalogueProduct({ id: 'latest-1', slug: 'latest-kit' })],
      pagination: pagination(),
      categories: [],
      filters: { search: '', category: '', sort: 'newest', page: 1, pageSize: 8 },
    });
    const service = new PublicCommerceService({} as never);

    const result = await service.home();

    expect(databaseMocks.getIronSprueCatalogueHomeData).toHaveBeenCalled();
    expect(databaseMocks.getCatalogueHomeData).not.toHaveBeenCalled();
    expect(result.featuredProducts).toHaveLength(1);
    expect(result.latestProducts[0]?.slug).toBe('latest-kit');
  });

  it('uses Iron Sprue product detail lookup in Iron Sprue mode', async () => {
    const { PublicCommerceService } = await import('./public-commerce.service.js');
    databaseMocks.getIronSprueCatalogueProductBySlug.mockResolvedValue({
      ...catalogueProduct(),
      sku: 'IS-AOS-05628',
      setName: null,
      language: null,
      condition: 'SEALED',
      longDescription: 'Toyota 2000GT Red model kit.',
      contents: [],
      searchText: 'Toyota 2000GT Red',
      supplierSku: '05628',
      leadTimeDays: 2,
      images: [],
      relatedProducts: [],
    });
    const service = new PublicCommerceService({} as never);

    const result = await service.product('aoshima-05628-toyota-2000gt-red');

    expect(databaseMocks.getIronSprueCatalogueProductBySlug).toHaveBeenCalledWith('aoshima-05628-toyota-2000gt-red');
    expect(databaseMocks.getCatalogueProductBySlug).not.toHaveBeenCalled();
    expect(result.slug).toBe('aoshima-05628-toyota-2000gt-red');
  });

  it('keeps the shared TCG catalogue path when Iron Sprue mode is not selected', async () => {
    delete process.env.PUBLIC_COMMERCE_STORE_CODE;
    const { PublicCommerceService } = await import('./public-commerce.service.js');
    databaseMocks.getCatalogueProducts.mockResolvedValue({
      products: [catalogueProduct({ brand: 'TCG Hobby', game: 'Pokemon TCG' })],
      pagination: pagination(),
      categories: [],
      filters: { search: '', category: '', sort: 'featured', page: 1, pageSize: 20 },
    });
    const service = new PublicCommerceService({} as never);

    await service.catalogue({});

    expect(databaseMocks.getCatalogueProducts).toHaveBeenCalled();
    expect(databaseMocks.getIronSprueCatalogueProducts).not.toHaveBeenCalled();
  });

  it('routes basket mutations to Iron Sprue cart tables in Iron Sprue mode', async () => {
    const { PublicCommerceService } = await import('./public-commerce.service.js');
    databaseMocks.getIronSprueCustomerCartDetails.mockResolvedValue(cartSummary());
    const service = new PublicCommerceService({
      requireUser: vi.fn().mockResolvedValue({ id: 'customer-1' }),
      getOptionalUser: vi.fn().mockResolvedValue({ id: 'customer-1' }),
    } as never);

    const result = await service.addBasketItem('Bearer token', { productId: 'iron-product-1', quantity: 1 });

    expect(databaseMocks.addIronSprueProductToCart).toHaveBeenCalledWith('customer-1', 'iron-product-1', 1);
    expect(databaseMocks.getCustomerCartDetails).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      productId: 'iron-product-1',
      productName: 'Toyota 2000GT Red',
      stockState: 'LOW_STOCK',
    });
  });

  it('routes checkout to Iron Sprue commerce when the public API is in Iron Sprue mode', async () => {
    const { PublicCommerceService } = await import('./public-commerce.service.js');
    databaseMocks.getIronSprueCustomerCartDetails.mockResolvedValue(cartSummary());
    databaseMocks.createIronSprueHostedCheckoutSession.mockResolvedValue({
      orderNumber: 'IS-20260823-ABC123',
      checkoutUrl: 'https://checkout.stripe.test/iron-sprue',
    });
    const service = new PublicCommerceService({
      getOptionalUser: vi.fn().mockResolvedValue({ id: 'customer-1' }),
    } as never);

    const result = await service.checkout('Bearer token', {
      shippingAddress: {
        fullName: 'Iron Sprue Customer',
        email: 'customer@example.com',
        line1: '1 Workshop Lane',
        line2: null,
        city: 'Dewsbury',
        region: null,
        postalCode: 'WF13 1AA',
        country: 'GB',
      },
      shippingMethodCode: 'UK_STANDARD',
    });

    expect(databaseMocks.createIronSprueHostedCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'customer-1',
      cart: expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ productId: 'iron-product-1' })]) }),
      shippingMethodCode: 'UK_STANDARD',
    }));
    expect(databaseMocks.createHostedCheckoutSession).not.toHaveBeenCalled();
    expect(result.checkoutUrl).toBe('https://checkout.stripe.test/iron-sprue');
  });
});
