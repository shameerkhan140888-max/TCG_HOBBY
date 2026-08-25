import type {
  PublicCatalogueResponse,
  PublicHomeResponse,
  PublicProductDetail,
  PublicProductImage,
  PublicProductSummary,
} from '@tcg-hobby/types';
import type { IronSprueProduct } from './catalogue';

export const IRON_SPRUE_PRODUCTION_API_BASE_URL = 'IRON_SPRUE_PRODUCTION_API_BASE_URL';

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
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Iron Sprue production API request failed: ${response.status} ${url.pathname}`);
  }
  return response.json() as Promise<T>;
}

function imageUrl(image: PublicProductImage | null | undefined) {
  return image?.url || undefined;
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
    imageReferences: product.image ? [product.image.url] : [],
    publicationState: 'PUBLISHED',
    published: true,
  };
  const primaryImage = imageUrl(product.image);
  if (product.availabilityMessage) mapped.description = product.availabilityMessage;
  if (primaryImage) mapped.imageUrl = primaryImage;
  return mapped;
}

export function ironSprueProductFromPublicDetail(product: PublicProductDetail): IronSprueProduct {
  const mapped: IronSprueProduct = {
    ...ironSprueProductFromPublicSummary(product),
    sku: product.sku ?? product.id,
    shortDescription: product.shortDescription ?? product.availabilityMessage ?? product.category.name,
    features: product.contents,
    imageReferences: product.images.map((image) => image.url),
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

export async function getIronSprueProductionApiHomeProducts() {
  const response = await fetchProductionApiJson<PublicHomeResponse>('/v1/home');
  const products = [...response.featuredProducts, ...response.latestProducts];
  return Array.from(new Map(products.map((product) => [product.slug, ironSprueProductFromPublicSummary(product)])).values());
}
