import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import {
  addProductToCart,
  clearCart,
  createHostedCheckoutSession,
  getAvailableShippingMethods,
  getAvailableStockByProductIds,
  getCatalogueHomeData,
  getCatalogueMasterDataOptions,
  getCatalogueProductBySlug,
  getCatalogueProducts,
  getCustomerCartDetails,
  getCustomerOrderByNumber,
  getCustomerOrders,
  getIronSprueCatalogueFilterOptions,
  getIronSprueCatalogueHomeData,
  getIronSprueCatalogueProductBySlug,
  getIronSprueCatalogueProducts,
  addIronSprueProductToCart,
  clearIronSprueCart,
  createIronSprueHostedCheckoutSession,
  getIronSprueAvailableShippingMethods,
  getIronSprueCustomerCartDetails,
  getIronSprueCustomerOrderByNumber,
  getIronSprueCustomerOrders,
  removeIronSprueCartItem,
  resolveIronSprueGuestCart,
  updateIronSprueCartItemQuantity,
  isStripeCheckoutConfigured,
  removeCartItem,
  resolveGuestCart,
  updateCartItemQuantity,
} from '@capital-hobby/database';
import type {
  CartSummary,
  CatalogueFilters,
  CatalogueProduct,
  CatalogueProductDetail,
  CatalogueSort,
  CheckoutAddress,
  PublicBasket,
  PublicBasketInputItem,
  PublicCatalogueFilterOptions,
  PublicCatalogueOption,
  PublicCatalogueResponse,
  PublicCheckoutRequest,
  PublicCheckoutResponse,
  PublicHomeResponse,
  PublicOrderDetail,
  PublicOrderSummary,
  PublicProductDetail,
  PublicProductImage,
  PublicProductSummary,
  PublicStockState,
  ShippingMethod,
} from '@capital-hobby/types';
import { AuthService } from './auth.service.js';

const SORTS: PublicCatalogueFilterOptions['sorts'] = [
  { value: 'featured', label: 'Featured first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];
const SORT_VALUES = new Set<CatalogueSort>(SORTS.map((sort) => sort.value));

const IRON_SPRUE_MEDIA_ROUTE_PREFIX = '/media/iron-sprue/';
const IRON_SPRUE_PUBLIC_MEDIA_ORIGIN = 'https://media.ironsprue.co.uk';

function ironSprueStorefrontMediaPath(url: string) {
  if (url.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) return `${parsed.pathname}${parsed.search}`;
    if (parsed.origin === IRON_SPRUE_PUBLIC_MEDIA_ORIGIN) {
      return `${IRON_SPRUE_MEDIA_ROUTE_PREFIX}${parsed.pathname.replace(/^\/+/, '')}${parsed.search}`;
    }
  } catch {
    return url;
  }
  return url;
}

function assetUrl(url: string): string {
  if (
    process.env.PUBLIC_COMMERCE_STORE_CODE === 'IRON_SPRUE'
    && (url.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX) || url.startsWith(`${IRON_SPRUE_PUBLIC_MEDIA_ORIGIN}/`) || url.includes(IRON_SPRUE_MEDIA_ROUTE_PREFIX))
  ) {
    return ironSprueStorefrontMediaPath(url);
  }
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.PUBLIC_STOREFRONT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcg-hobby.co.uk';
  return new URL(url, base).toString();
}

export function publicStockState(available: number): PublicStockState {
  if (available <= 0) return 'OUT_OF_STOCK';
  if (available <= 3) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function summaryImage(product: CatalogueProduct): PublicProductImage | null {
  if (!product.imageUrl) return null;
  return {
    id: `${product.id}-primary`,
    url: assetUrl(product.imageUrl),
    altText: product.imageAlt ?? product.name,
    sortOrder: 1,
    isPrimary: true,
  };
}

export function toPublicProductSummary(product: CatalogueProduct): PublicProductSummary {
  const available = Math.max(product.stockOnHand - product.reservedStock, 0);
  const stockState = publicStockState(available);
  return {
    id: product.id,
    ...(product.sku ? { sku: product.sku } : {}),
    slug: product.slug,
    name: product.name,
    brand: product.brand ?? null,
    game: product.game,
    category: { name: product.categoryName, slug: product.categorySlug },
    productType: product.productType ?? null,
    price: product.price,
    stockState,
    availableQuantity: available,
    purchasable: stockState !== 'OUT_OF_STOCK' && (product.releaseStatus ?? 'RELEASED') === 'RELEASED',
    featured: product.featured,
    releaseStatus: product.releaseStatus ?? 'RELEASED',
    releaseDate: product.releaseDate ?? null,
    image: summaryImage(product),
    purchaseLimit: product.customerPurchaseLimit ?? null,
    freeUkStandardShipping: product.freeUkStandardShipping ?? false,
    availabilityMessage: product.availabilityMessage ?? null,
    scale: product.scale ?? null,
    buildLevel: product.buildLevel ?? null,
    specifications: product.specifications ?? null,
  };
}

function toPublicImage(image: CatalogueProductDetail['images'][number]): PublicProductImage {
  return { id: image.id, url: assetUrl(image.url), altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary };
}

export function toPublicProductDetail(product: CatalogueProductDetail): PublicProductDetail {
  const images = product.images.map(toPublicImage);
  return {
    ...toPublicProductSummary(product),
    sku: product.sku,
    image: images.find((image) => image.isPrimary) ?? images[0] ?? summaryImage(product),
    setName: product.setName,
    language: product.language ?? null,
    condition: product.condition,
    shortDescription: product.description,
    longDescription: product.longDescription,
    contents: product.contents,
    images,
    relatedProducts: product.relatedProducts.map(toPublicProductSummary),
  };
}

function option(record: { id: string; name: string; slug: string; gameId: string | null }): PublicCatalogueOption {
  return { id: record.id, name: record.name, value: record.slug, gameId: record.gameId };
}

function requireAddress(input: CheckoutAddress): CheckoutAddress {
  const required: Array<keyof CheckoutAddress> = ['fullName', 'email', 'line1', 'city', 'postalCode', 'country'];
  if (required.some((key) => typeof input?.[key] !== 'string' || !input[key].trim())) {
    throw new BadRequestException('Complete the delivery address before continuing.');
  }
  return { ...input, country: input.country.trim().toUpperCase() };
}

export function isIronSpruePublicApiEnabled() {
  const explicitStore = process.env.PUBLIC_COMMERCE_STORE_CODE?.trim().toUpperCase();
  if (explicitStore) return explicitStore === 'IRON_SPRUE';
  return Boolean(
    process.env.IRON_SPRUE_INTERNAL_API_KEY_ID?.trim()
      || process.env.IRON_SPRUE_STRIPE_ACCOUNT_ID?.trim()
      || process.env.IRON_SPRUE_SITE_URL?.trim(),
  );
}

@Injectable()
export class PublicCommerceService {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async home(): Promise<PublicHomeResponse> {
    if (isIronSpruePublicApiEnabled()) {
      const [home, latest] = await Promise.all([
        getIronSprueCatalogueHomeData(),
        getIronSprueCatalogueProducts({ search: '', category: '', sort: 'newest', page: 1, pageSize: 8 }),
      ]);
      const featuredIds = new Set(home.featuredProducts.map((product) => product.id));
      return {
        featuredProducts: home.featuredProducts.map(toPublicProductSummary),
        latestProducts: latest.products.filter((product) => !featuredIds.has(product.id)).slice(0, 4).map(toPublicProductSummary),
        categories: home.categories.map((category) => ({ id: category.id, name: category.name, value: category.slug, gameId: null })),
        homepagePlacements: home.homepagePlacements,
        brandPresentation: home.brandPresentation,
      };
    }

    const [home, latest] = await Promise.all([
      getCatalogueHomeData(),
      getCatalogueProducts({ search: '', category: '', sort: 'newest', page: 1, pageSize: 8 }),
    ]);
    const featuredIds = new Set(home.featuredProducts.map((product) => product.id));
    return {
      featuredProducts: home.featuredProducts.map(toPublicProductSummary),
      latestProducts: latest.products.filter((product) => !featuredIds.has(product.id)).slice(0, 4).map(toPublicProductSummary),
      categories: home.categories.map((category) => ({ id: category.id, name: category.name, value: category.slug, gameId: null })),
      homepagePlacements: [],
    };
  }

  async catalogue(query: Record<string, string | undefined>): Promise<PublicCatalogueResponse> {
    const requestedSort = query.sort as CatalogueSort | undefined;
    const filters: CatalogueFilters = {
      search: query.search?.trim() ?? '',
      category: query.category?.trim() ?? '',
      game: query.game?.trim() ?? '',
      productType: query.productType?.trim() ?? '',
      set: query.set?.trim() ?? '',
      language: query.language?.trim() ?? '',
      scale: query.scale?.trim() ?? '',
      sort: requestedSort && SORT_VALUES.has(requestedSort) ? requestedSort : 'featured',
      page: Math.max(Number(query.page) || 1, 1),
      pageSize: Math.min(Math.max(Number(query.pageSize) || 20, 1), 100),
    };
    if (isIronSpruePublicApiEnabled()) {
      const result = await getIronSprueCatalogueProducts({
        ...filters,
        brand: query.brand?.trim() ?? '',
      });
      return { products: result.products.map(toPublicProductSummary), pagination: result.pagination, filters: result.filters };
    }

    const result = await getCatalogueProducts(filters);
    return { products: result.products.map(toPublicProductSummary), pagination: result.pagination, filters: result.filters };
  }

  async filters(): Promise<PublicCatalogueFilterOptions> {
    if (isIronSpruePublicApiEnabled()) {
      const values = await getIronSprueCatalogueFilterOptions();
      return {
        games: values.brands,
        productTypes: [],
        sets: [],
        languages: [],
        categories: values.categories,
        sorts: SORTS,
      };
    }

    if (process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE === 'seed') {
      const catalogue = await getCatalogueProducts({ search: '', category: '', sort: 'featured', page: 1, pageSize: 500 });
      const unique = (values: Array<{ name: string; value: string }>): PublicCatalogueOption[] => Array.from(new Map(values.filter((value) => value.name).map((value) => [value.value, value])).values()).map((value) => ({ id: value.value, name: value.name, value: value.value, gameId: null }));
      return {
        games: unique(catalogue.products.map((product) => ({ name: product.game, value: product.game.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))),
        productTypes: unique(catalogue.products.map((product) => ({ name: product.productType ?? '', value: (product.productType ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-') }))),
        sets: unique(catalogue.products.map((product) => ({ name: 'setName' in product ? String(product.setName ?? '') : '', value: '' }))),
        languages: [],
        categories: catalogue.categories.map((category) => ({ id: category.id, name: category.name, value: category.slug, gameId: null })),
        sorts: SORTS,
      };
    }
    const values = await getCatalogueMasterDataOptions();
    return {
      games: values.games.filter((record) => record.active).map(option),
      productTypes: values.productTypes.filter((record) => record.active).map(option),
      sets: values.sets.filter((record) => record.active).map(option),
      languages: values.languages.filter((record) => record.active).map(option),
      categories: values.categories.map(option),
      sorts: SORTS,
    };
  }

  async product(slug: string): Promise<PublicProductDetail> {
    const product = isIronSpruePublicApiEnabled()
      ? await getIronSprueCatalogueProductBySlug(slug)
      : await getCatalogueProductBySlug(slug);
    if (!product) throw new NotFoundException('Product not found.');
    return toPublicProductDetail(product);
  }

  async basket(authorization: string | undefined, guestItems: PublicBasketInputItem[] = []): Promise<PublicBasket> {
    const user = await this.auth.getOptionalUser(authorization);
    if (isIronSpruePublicApiEnabled()) {
      const cart = user ? await getIronSprueCustomerCartDetails(user.id) : await resolveIronSprueGuestCart(guestItems);
      return this.toPublicBasket(cart, true);
    }
    const cart = user ? await getCustomerCartDetails(user.id) : await resolveGuestCart(guestItems);
    return this.toPublicBasket(cart, false);
  }

  async addBasketItem(authorization: string | undefined, body: { productId?: unknown; quantity?: unknown }): Promise<PublicBasket> {
    const user = await this.auth.requireUser(authorization);
    if (isIronSpruePublicApiEnabled()) {
      await addIronSprueProductToCart(user.id, String(body.productId ?? ''), Number(body.quantity) || 1);
      return this.basket(authorization);
    }
    await addProductToCart(user.id, String(body.productId ?? ''), Number(body.quantity) || 1);
    return this.basket(authorization);
  }

  async updateBasketItem(authorization: string | undefined, productId: string, body: { quantity?: unknown }): Promise<PublicBasket> {
    const user = await this.auth.requireUser(authorization);
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('Enter a valid quantity.');
    if (isIronSpruePublicApiEnabled()) {
      await updateIronSprueCartItemQuantity(user.id, productId, quantity);
      return this.basket(authorization);
    }
    await updateCartItemQuantity(user.id, productId, quantity);
    return this.basket(authorization);
  }

  async removeBasketItem(authorization: string | undefined, productId: string): Promise<PublicBasket> {
    const user = await this.auth.requireUser(authorization);
    if (isIronSpruePublicApiEnabled()) {
      await removeIronSprueCartItem(user.id, productId);
      return this.basket(authorization);
    }
    await removeCartItem(user.id, productId);
    return this.basket(authorization);
  }

  async clearBasket(authorization: string | undefined): Promise<PublicBasket> {
    const user = await this.auth.requireUser(authorization);
    if (isIronSpruePublicApiEnabled()) {
      await clearIronSprueCart(user.id);
      return this.basket(authorization);
    }
    await clearCart(user.id);
    return this.basket(authorization);
  }

  async shipping(country: string, subtotalMinor = 0): Promise<ShippingMethod[]> {
    if (isIronSpruePublicApiEnabled()) {
      return getIronSprueAvailableShippingMethods(country.trim().toUpperCase() || 'GB', Math.max(Math.trunc(subtotalMinor), 0));
    }
    return getAvailableShippingMethods(country.trim().toUpperCase() || 'GB', Math.max(Math.trunc(subtotalMinor), 0));
  }

  async checkout(authorization: string | undefined, input: PublicCheckoutRequest): Promise<PublicCheckoutResponse> {
    const user = await this.auth.getOptionalUser(authorization);
    const cart = isIronSpruePublicApiEnabled()
      ? user ? await getIronSprueCustomerCartDetails(user.id) : await resolveIronSprueGuestCart(input.guestItems ?? [])
      : user ? await getCustomerCartDetails(user.id) : await resolveGuestCart(input.guestItems ?? []);
    if (cart.items.length === 0) throw new BadRequestException('Your basket is empty.');
    const base = process.env.PUBLIC_STOREFRONT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcg-hobby.co.uk';
    try {
      if (isIronSpruePublicApiEnabled()) {
        return await createIronSprueHostedCheckoutSession({
          userId: user?.id ?? null,
          cart,
          shippingAddress: requireAddress(input.shippingAddress),
          shippingMethodCode: input.shippingMethodCode,
          ...(input.checkoutAttemptId ? { checkoutAttemptId: input.checkoutAttemptId } : {}),
        });
      }
      return await createHostedCheckoutSession({
        userId: user?.id ?? null,
        cart,
        shippingAddress: requireAddress(input.shippingAddress),
        shippingMethodCode: input.shippingMethodCode,
        ...(input.checkoutAttemptId ? { checkoutAttemptId: input.checkoutAttemptId } : {}),
        successUrl: `${base.replace(/\/$/, '')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base.replace(/\/$/, '')}/cart`,
      });
    } catch {
      console.error('public_checkout_start_failed', {
        stripeConfigured: isStripeCheckoutConfigured(),
        reason: isStripeCheckoutConfigured() ? 'checkout_start_failed' : 'missing_secret_key',
      });
      throw new ServiceUnavailableException('Secure payment is temporarily unavailable. Please try again later.');
    }
  }

  async orders(authorization?: string): Promise<PublicOrderSummary[]> {
    const user = await this.auth.requireUser(authorization);
    const orders = isIronSpruePublicApiEnabled()
      ? await getIronSprueCustomerOrders(user.id)
      : await getCustomerOrders(user.id);
    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      currency: order.currency,
      totalMinor: order.totalMinor,
      itemCount: 'itemCount' in order ? order.itemCount : order.items.reduce((total, item) => total + item.quantity, 0),
      createdAt: order.createdAt.toISOString(),
    }));
  }

  async order(authorization: string | undefined, orderNumber: string): Promise<PublicOrderDetail> {
    const user = await this.auth.requireUser(authorization);
    const order = isIronSpruePublicApiEnabled()
      ? await getIronSprueCustomerOrderByNumber(user.id, orderNumber)
      : await getCustomerOrderByNumber(user.id, orderNumber);
    if (!order) throw new NotFoundException('Order not found.');
    return {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      currency: order.currency,
      totalMinor: order.totalMinor,
      itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
      createdAt: order.createdAt.toISOString(),
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      shippingMethodName: order.shippingMethodName,
      items: order.items,
    };
  }

  private async toPublicBasket(cart: CartSummary, useCartAvailability: boolean): Promise<PublicBasket> {
    const availability = useCartAvailability ? new Map<string, number>() : await getAvailableStockByProductIds(cart.items.map((item) => item.productId));
    return {
      items: cart.items.map((item) => ({
        ...item,
        image: item.imageUrl
          ? {
              id: `${item.productId}-basket`,
              url: assetUrl(item.imageUrl),
              altText: item.imageAlt ?? item.productName,
              sortOrder: 1,
              isPrimary: true,
            }
          : null,
        stockState: publicStockState(useCartAvailability ? item.availableQuantity ?? 0 : availability.get(item.productId) ?? 0),
      })),
      subtotalMinor: cart.subtotalMinor,
      currency: cart.currency,
      totalItems: cart.totalItems,
    };
  }
}
