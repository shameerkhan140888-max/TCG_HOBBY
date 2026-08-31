import type {
  PublicBrandPresentation,
  PublicCatalogueResponse,
  PublicHomeResponse,
  PublicHomepagePlacement,
  PublicProductDetail,
  PublicProductImage,
  PublicProductSummary,
} from '@capital-hobby/types';
import type { IronSprueBrandRecord, IronSprueProduct } from './catalogue';
import type { IronSprueHomepagePlacement } from './admin-storefront-controls';

export const IRON_SPRUE_PRODUCTION_API_BASE_URL = 'IRON_SPRUE_PRODUCTION_API_BASE_URL';
const IRON_SPRUE_MEDIA_HOST = 'media.ironsprue.co.uk';
const IRON_SPRUE_MEDIA_ROUTE_PREFIX = '/media/iron-sprue/';
const PUBLIC_API_CACHE_TTL_MS = 15_000;

type CachedPublicApiResponse = {
  expiresAt: number;
  value?: unknown;
  pending?: Promise<unknown>;
};

const publicApiCache = new Map<string, CachedPublicApiResponse>();

export function clearIronSprueProductionApiCacheForTests() {
  publicApiCache.clear();
}

function configuredProductionApiBaseUrl() {
  return process.env[IRON_SPRUE_PRODUCTION_API_BASE_URL]?.trim().replace(/\/+$/, '') ?? '';
}

export function shouldUseIronSprueProductionApi() {
  return process.env.NODE_ENV === 'production' && Boolean(configuredProductionApiBaseUrl());
}

export function requireIronSprueProductionApiBaseUrl() {
  const baseUrl = configuredProductionApiBaseUrl();
  if (!baseUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${IRON_SPRUE_PRODUCTION_API_BASE_URL} is required for the production Iron Sprue storefront.`);
    }
    return '';
  }
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error(`${IRON_SPRUE_PRODUCTION_API_BASE_URL} must use HTTPS in production.`);
  }
  return url.origin;
}

async function fetchProductionApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = requireIronSprueProductionApiBaseUrl();
  const url = new URL(path, baseUrl);
  const method = init?.method?.toUpperCase() ?? 'GET';
  const canUseRuntimeCache = method === 'GET' && !init?.body;
  const cacheKey = url.toString();
  const now = Date.now();

  if (canUseRuntimeCache) {
    const cached = publicApiCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      if (cached.value !== undefined) return cached.value as T;
      if (cached.pending) return cached.pending as Promise<T>;
    }
  }

  const pending = fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Iron Sprue production API request failed: ${response.status} ${url.pathname}`);
    }
    return response.json() as Promise<T>;
  });

  if (!canUseRuntimeCache) return pending;

  publicApiCache.set(cacheKey, { expiresAt: now + PUBLIC_API_CACHE_TTL_MS, pending });
  try {
    const value = await pending;
    publicApiCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_API_CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    publicApiCache.delete(cacheKey);
    throw error;
  }
}

export function storefrontMediaUrl(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (raw.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) return `${parsed.pathname}${parsed.search}`;
    if (parsed.hostname.toLowerCase() !== IRON_SPRUE_MEDIA_HOST) return raw;
    const key = parsed.pathname.replace(/^\/+/, '');
    return key ? `${IRON_SPRUE_MEDIA_ROUTE_PREFIX}${key}` : undefined;
  } catch {
    return raw;
  }
}

function imageUrl(image: PublicProductImage | null | undefined) {
  return storefrontMediaUrl(image?.url);
}

function stockQuantity(product: PublicProductSummary) {
  if (typeof product.availableQuantity === 'number') return Math.max(0, product.availableQuantity);
  if (product.stockState === 'OUT_OF_STOCK') return 0;
  if (product.stockState === 'LOW_STOCK') return 1;
  return 10;
}

export function ironSprueProductFromPublicSummary(product: PublicProductSummary): IronSprueProduct {
  const quantity = stockQuantity(product);
  const mapped: IronSprueProduct = {
    id: product.id,
    storeCode: 'IRON_SPRUE',
    sku: product.sku ?? product.id,
    slug: product.slug,
    name: product.name,
    customerTitle: product.name,
    brand: product.brand ?? 'Iron Sprue',
    category: product.category.name,
    productType: product.productType ?? product.category.name,
    stockQuantity: quantity,
    availableQuantity: quantity,
    priceMinor: product.price.amountMinor,
    retailPriceMinor: product.price.amountMinor,
    shortDescription: product.availabilityMessage ?? product.category.name,
    imageReferences: product.image ? [storefrontMediaUrl(product.image.url)].filter((url): url is string => Boolean(url)) : [],
    publicationState: 'PUBLISHED',
    published: true,
  };
  const primaryImage = imageUrl(product.image);
  if (product.availabilityMessage) mapped.description = product.availabilityMessage;
  if (product.scale) mapped.scale = product.scale;
  if (product.buildLevel) mapped.skillLevel = product.buildLevel;
  if (product.specifications) mapped.specifications = product.specifications;
  if (primaryImage) mapped.imageUrl = primaryImage;
  return mapped;
}

export function ironSprueProductFromPublicDetail(product: PublicProductDetail): IronSprueProduct {
  const mapped: IronSprueProduct = {
    ...ironSprueProductFromPublicSummary(product),
    sku: product.sku ?? product.id,
    shortDescription: product.shortDescription ?? product.availabilityMessage ?? product.category.name,
    features: product.contents,
    imageReferences: product.images.map((image) => storefrontMediaUrl(image.url)).filter((url): url is string => Boolean(url)),
  };
  const primaryImage = imageUrl(product.image);
  const description = product.longDescription || product.shortDescription;
  const supplierSku = (product as { supplierSku?: string | null }).supplierSku?.trim();
  if (description) mapped.description = description;
  if (primaryImage) mapped.imageUrl = primaryImage;
  if (supplierSku) mapped.manufacturerReference = supplierSku;
  return mapped;
}

export async function getIronSprueProductionApiCatalogueProducts(query: URLSearchParams = new URLSearchParams()) {
  const response = await fetchProductionApiJson<PublicCatalogueResponse>(`/v1/catalogue?${query.toString()}`);
  return response.products.map(ironSprueProductFromPublicSummary);
}

export async function getIronSprueProductionApiProduct(slug: string) {
  try {
    const response = await fetchProductionApiJson<PublicProductDetail>(`/v1/catalogue/${encodeURIComponent(slug)}`);
    return ironSprueProductFromPublicDetail(response);
  } catch {
    return null;
  }
}

async function productsFromPublicHomeResponse(response: PublicHomeResponse) {
  const placementSlugs = (response.homepagePlacements ?? [])
    .filter((placement) => placement.active)
    .map((placement) => {
      if (placement.placementKey.startsWith('featured-product:')) {
        return placement.placementKey.replace(/^featured-product:/, '').trim();
      }
      const sectionProduct = placement.placementKey.match(/^product-section:[^:]+:(.+)$/)?.[1]?.trim();
      return sectionProduct ?? '';
    })
    .filter(Boolean);
  let placementProducts: PublicProductSummary[] = [];
  if (placementSlugs.length) {
    const catalogue = await fetchProductionApiJson<PublicCatalogueResponse>('/v1/catalogue?pageSize=100');
    const placementSlugSet = new Set(placementSlugs);
    placementProducts = catalogue.products.filter((product) => placementSlugSet.has(product.slug));
  }
  const products = [...response.featuredProducts, ...response.latestProducts, ...placementProducts];
  return Array.from(new Map(products.map((product) => [product.slug, ironSprueProductFromPublicSummary(product)])).values());
}

export async function getIronSprueProductionApiHomeSnapshot() {
  const response = await fetchProductionApiJson<PublicHomeResponse>('/v1/home');
  const products = await productsFromPublicHomeResponse(response);
  const homepagePlacements = (response.homepagePlacements ?? []).map(ironSprueHomepagePlacementFromPublic);
  const brandPresentation = (response.brandPresentation ?? [])
    .map(ironSprueBrandPresentationFromPublic)
    .filter((brand): brand is IronSprueBrandRecord => Boolean(brand));

  return { products, homepagePlacements, brandPresentation };
}

export async function getIronSprueProductionApiHomeProducts() {
  return (await getIronSprueProductionApiHomeSnapshot()).products;
}

export function ironSprueHomepagePlacementFromPublic(placement: PublicHomepagePlacement): IronSprueHomepagePlacement {
  return {
    id: placement.id,
    placementKey: placement.placementKey,
    title: placement.title,
    ctaLabel: placement.ctaLabel,
    ctaHref: placement.ctaHref,
    imageUrl: storefrontMediaUrl(placement.imageUrl) ?? placement.imageUrl,
    active: placement.active,
    sortOrder: placement.sortOrder,
  };
}

export async function getIronSprueProductionApiHomepagePlacements() {
  const response = await fetchProductionApiJson<PublicHomeResponse>('/v1/home');
  return (response.homepagePlacements ?? []).map(ironSprueHomepagePlacementFromPublic);
}

export function ironSprueBrandPresentationFromPublic(brand: PublicBrandPresentation): IronSprueBrandRecord | null {
  const logoUrl = storefrontMediaUrl(brand.logoUrl);
  if (!brand.active || !brand.featured || brand.productCount <= 0 || !logoUrl) return null;
  return {
    name: brand.name,
    slug: brand.slug,
    href: `/shop?brand=${encodeURIComponent(brand.name)}`,
    productCount: brand.productCount,
    displayOrder: brand.sortOrder,
    active: brand.active,
    approvalStatus: 'LOGO_APPROVED',
    logoUrl,
    altText: brand.logoAltText || `${brand.name} logo`,
  };
}

export async function getIronSprueProductionApiBrandPresentation() {
  const response = await fetchProductionApiJson<PublicHomeResponse>('/v1/home');
  return (response.brandPresentation ?? [])
    .map(ironSprueBrandPresentationFromPublic)
    .filter((brand): brand is IronSprueBrandRecord => Boolean(brand));
}
