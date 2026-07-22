import { ProductRecommendationType } from '@prisma/client';
import type { OrderStatus as PrismaOrderStatus, PaymentStatus as PrismaPaymentStatus, Prisma } from '@prisma/client';
import type { PaginationMeta, PaymentStatus, FulfilmentStatus, ProductCondition } from '@tcg-hobby/types';
import { slugify } from '@tcg-hobby/utils';
import { prisma } from './client';
import { calculateMarginPercentage, calculateAvailableStock } from './admin-math';
import { derivePublicStockState } from './product-import';
import { getRelatedProducts, isMerchandisingProductEligible } from './merchandising';
import { refreshProductPricing } from './pricing';
import { resolveProductMasterDataInput } from './catalogue-master-data';
import {
  seedCategories,
  seedInventory,
  seedOrderItems,
  seedOrders,
  seedProductPricing,
  seedProducts,
  seedSuppliers,
  seedUsers,
} from './seed-data';

const adminProductInclude = {
  category: true,
  gameRef: true,
  brandRef: true,
  productTypeRef: true,
  languageRef: true,
  setRef: { include: { game: true } },
  inventory: true,
  images: { where: { deletionState: 'ACTIVE' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  importAudits: { orderBy: { createdAt: 'desc' }, take: 10 },
  supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
  pricing: { include: { pricingRule: true } },
} as const satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>;

const adminMerchandisingProductSelect = {
  id: true,
  sku: true,
  slug: true,
  name: true,
  game: true,
  setName: true,
  priceMinor: true,
  currency: true,
  lifecycleState: true,
  published: true,
  archivedAt: true,
  releaseStatus: true,
  category: { select: { name: true, slug: true } },
  inventory: { select: { stockOnHand: true, reservedStock: true } },
  images: { where: { deletionState: 'ACTIVE' }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
} as const satisfies Prisma.ProductSelect;

type AdminMerchandisingProductRow = Prisma.ProductGetPayload<{ select: typeof adminMerchandisingProductSelect }>;

const adminRecommendationInclude = {
  recommendedProduct: { select: adminMerchandisingProductSelect },
} as const satisfies Prisma.ProductRecommendationInclude;

type AdminRecommendationRow = Prisma.ProductRecommendationGetPayload<{ include: typeof adminRecommendationInclude }>;

const adminInventoryProductInclude = {
  category: true,
  inventory: true,
  supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
} as const satisfies Prisma.ProductInclude;

type AdminInventoryProductRow = Prisma.ProductGetPayload<{ include: typeof adminInventoryProductInclude }>;

const adminSupplierInclude = {
  supplierProducts: { select: { id: true, productId: true, product: { select: { id: true, name: true, slug: true } } } },
} as const satisfies Prisma.SupplierInclude;

type AdminSupplierRow = Prisma.SupplierGetPayload<{ include: typeof adminSupplierInclude }>;

const adminSupplierDetailInclude = {
  supplierProducts: {
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
  },
} as const satisfies Prisma.SupplierInclude;

type AdminSupplierDetailRow = Prisma.SupplierGetPayload<{ include: typeof adminSupplierDetailInclude }>;

const adminOrderListInclude = {
  items: { select: { quantity: true } },
  user: { select: { name: true, email: true } },
} as const satisfies Prisma.OrderInclude;

type OrderListRow = Prisma.OrderGetPayload<{ include: typeof adminOrderListInclude }>;

const adminOrderDetailInclude = {
  items: { select: { id: true, productName: true, productSlug: true, quantity: true, unitPriceMinor: true, totalMinor: true } },
  shippingAddress: true,
  user: { select: { name: true, email: true } },
} as const satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof adminOrderDetailInclude }>;

const stockAdjustmentHistoryInclude = {
  product: { select: { name: true } },
} as const satisfies Prisma.StockAdjustmentInclude;

type StockAdjustmentHistoryRow = Prisma.StockAdjustmentGetPayload<{ include: typeof stockAdjustmentHistoryInclude }>;

type OrderItemRow = {
  id: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
};

type AddressRow = {
  fullName: string;
  email: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
};

type CatalogueFilters = {
  search?: string;
  category?: string;
  supplier?: string;
  game?: string;
  brand?: string;
  productType?: string;
  status?: string;
  sort?: 'newest' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
  page?: number;
  pageSize?: number;
};

type SupplierFilters = {
  search?: string;
  sort?: 'name-asc' | 'name-desc' | 'recent';
  page?: number;
  pageSize?: number;
};

type OrderFilters = {
  search?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  pageSize?: number;
};

const ORDER_STATUSES = ['DRAFT', 'PENDING_PAYMENT', 'PAID', 'FULFILLING', 'SHIPPED', 'CANCELLED', 'REFUNDED'] as const;
const PAYMENT_STATUSES = ['REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED'] as const;

function isPrismaOrderStatus(value: string): value is PrismaOrderStatus {
  return ORDER_STATUSES.includes(value as (typeof ORDER_STATUSES)[number]);
}

function isPrismaPaymentStatus(value: string): value is PrismaPaymentStatus {
  return PAYMENT_STATUSES.includes(value as (typeof PAYMENT_STATUSES)[number]);
}

export type AdminProductFilterOption = {
  id: string;
  name: string;
  slug: string;
};

export type AdminProductsResult = {
  products: AdminProductListItem[];
  pagination: PaginationMeta;
  categories: AdminProductFilterOption[];
  suppliers: AdminProductFilterOption[];
  games: AdminProductFilterOption[];
  brands: AdminProductFilterOption[];
  productTypes: AdminProductFilterOption[];
};

export type AdminSuppliersResult = {
  suppliers: AdminSupplierListItem[];
  pagination: PaginationMeta;
};

export type AdminOrdersResult = {
  orders: AdminOrderListItem[];
  pagination: PaginationMeta;
};

export type AdminMetric = {
  label: string;
  value: string;
  detail: string;
};

export type AdminDashboardData = {
  metrics: AdminMetric[];
  recentOrders: AdminOrderListItem[];
  lowStockProducts: AdminInventoryRow[];
  recentlyAddedProducts: AdminProductListItem[];
};

export type AdminOrderListItem = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: PaymentStatus;
  totalMinor: number;
  currency: string;
  createdAt: Date;
  itemCount: number;
};

export type AdminOrderDetail = AdminOrderListItem & {
  fulfilmentStatus: FulfilmentStatus;
  shippingMethodName: string;
  shippingMethodCode: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  shippingAddress: AddressRow | null;
  items: OrderItemRow[];
};

export type AdminProductListItem = {
  id: string;
  categoryId: string;
  gameId: string | null;
  brandId: string | null;
  productTypeId: string | null;
  languageId: string | null;
  setId: string | null;
  sku: string;
  barcode: string | null;
  slug: string;
  name: string;
  brand: string | null;
  game: string;
  setName: string | null;
  productType: string | null;
  language: string | null;
  categoryName: string;
  categorySlug: string;
  gameName: string | null;
  brandName: string | null;
  productTypeName: string | null;
  languageName: string | null;
  setDisplayName: string | null;
  supplierName: string;
  supplierSlug: string;
  supplierId: string;
  priceMinor: number;
  rrpMinor: number | null;
  salePriceMinor: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  vatRate: number;
  costMinor: number;
  costExVatMinor: number;
  landedCostMinor: number | null;
  buyMinor: number;
  marginMinor: number;
  marginPercent: number;
  markupPercent: number;
  profitMinor: number;
  minimumMarginPercent: number;
  maximumDiscountPercent: number;
  priceSource: string;
  priceStatus: string;
  manualOverride: boolean;
  priceUpdatedAt: Date | null;
  currency: string;
  featured: boolean;
  homepagePriority: number | null;
  heroFeatured: boolean;
  recommendationWeight: number;
  isAccessory: boolean;
  isStaffPick: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  freeUkStandardShipping: boolean;
  shippingPromotionProductOnly: boolean;
  lifecycleState: string;
  published: boolean;
  hideWhenOutOfStock: boolean;
  customerPurchaseLimit: number | null;
  availabilityMessage: string | null;
  archivedAt: Date | null;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  incomingQuantity: number;
  locationCode: string;
  imageCount: number;
  primaryImageUrl: string | null;
  importSourceType: string | null;
  importSourceReference: string | null;
  importedAt: Date | null;
  lastImportedAt: Date | null;
  importValidationWarnings: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  createdAt: Date;
};

export type AdminProductDetail = AdminProductListItem & {
  description: string;
  longDescription: string;
  condition: string;
  searchText: string;
  imageLabel: string;
  supplierSku: string;
  supplierProductUrl: string | null;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  packQuantity: number | null;
  lastSupplierPriceUpdatedAt: Date | null;
  preferredSupplierProduct: boolean;
  supplierEmail: string | null;
  supplierPhone: string | null;
  supplierWebsite: string | null;
  images: ProductRow['images'];
  importAudits: ProductRow['importAudits'];
};

export type AdminMerchandisingSettingsInput = {
  recommendationWeight?: number;
  isAccessory?: boolean;
  isStaffPick?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
};

export type AdminProductRecommendationInput = {
  sourceProductId: string;
  recommendedProductId: string;
  relationshipType: ProductRecommendationType;
  priority: number;
  active: boolean;
};

export type AdminProductRecommendationUpdateInput = {
  relationshipType: ProductRecommendationType;
  priority: number;
  active: boolean;
};

export type AdminMerchandisingProductSummary = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  game: string;
  categoryName: string;
  categorySlug: string;
  imageUrl: string | null;
  imageAlt: string | null;
  priceMinor: number;
  currency: string;
  lifecycleState: string;
  published: boolean;
  archived: boolean;
  publicStockState: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
};

export type AdminProductRecommendationItem = {
  id: string;
  recommendedProduct: AdminMerchandisingProductSummary;
  relationshipType: ProductRecommendationType;
  priority: number;
  active: boolean;
  eligibility: {
    eligible: boolean;
    label: string;
    reasons: string[];
  };
  createdAt: Date;
  updatedAt: Date;
};

export type AdminProductMerchandisingPanel = {
  settings: {
    recommendationWeight: number;
    isAccessory: boolean;
    isStaffPick: boolean;
    isBestSeller: boolean;
    isNewArrival: boolean;
  };
  recommendations: AdminProductRecommendationItem[];
  candidates: AdminMerchandisingProductSummary[];
  preview: Array<AdminMerchandisingProductSummary & { position: number; strategyId: string; manual: boolean }>;
};

export type AdminInventoryRow = {
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  supplierName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  costMinor: number;
  retailMinor: number;
  marginMinor: number;
  marginPercent: number;
  lowStock: boolean;
  locationCode: string;
};

export type AdminStockAdjustmentRow = {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  beforeStock: number;
  afterStock: number;
  reason: string;
  performedBy: string | null;
  createdAt: Date;
};

export type AdminSupplierListItem = {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string;
  active: boolean;
  preferred: boolean;
  productCount: number;
  createdAt: Date;
};

export type AdminSupplierDetail = AdminSupplierListItem & {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  internalNotes: string | null;
  products: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    supplierSku: string;
    costMinor: number;
    currency: string;
    leadTimeDays: number;
    active: boolean;
  }>;
};

type ProductFormInput = {
  name: string;
  slug?: string;
  sku: string;
  barcode?: string | null;
  brand?: string | null;
  game: string;
  setName?: string;
  productType?: string | null;
  language?: string | null;
  gameId?: string | null;
  brandId?: string | null;
  productTypeId?: string | null;
  languageId?: string | null;
  setId?: string | null;
  description: string;
  longDescription: string;
  condition: string;
  categoryId: string;
  supplierId: string;
  priceMinor: number;
  rrpMinor?: number | null;
  salePriceMinor?: number | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  vatRate?: number;
  costMinor: number;
  landedCostMinor?: number | null;
  supplierSku?: string;
  supplierProductUrl?: string | null;
  minimumOrderQuantity?: number;
  packQuantity?: number | null;
  supplierLeadTimeDays?: number;
  stockOnHand: number;
  reorderPoint: number;
  reorderQuantity?: number;
  incomingQuantity?: number;
  locationCode: string;
  imageLabel: string;
  featured: boolean;
  published: boolean;
  hideWhenOutOfStock: boolean;
  customerPurchaseLimit?: number | null;
  availabilityMessage?: string | null;
  primaryImageUrl?: string;
  primaryImageAlt?: string;
  galleryImages?: Array<{ url: string; altText: string; imageType?: string }>;
  seoTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  noindex?: boolean;
};

type SupplierFormInput = {
  name: string;
  slug?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  active: boolean;
  preferred: boolean;
  internalNotes?: string;
};

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

export function calculateVatExclusiveMinor(grossMinor: number, vatRate: number): number {
  if (!Number.isFinite(grossMinor) || grossMinor <= 0) return 0;
  if (!Number.isFinite(vatRate) || vatRate <= 0) return Math.round(grossMinor);
  return Math.round((grossMinor * 100) / (100 + vatRate));
}

function resolvePagination(totalItems: number, page = 1, pageSize = 20): PaginationMeta {
  const normalizedPageSize = Math.max(pageSize, 1);
  const totalPages = Math.max(Math.ceil(totalItems / normalizedPageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: currentPage,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

function toProductSlugCandidate(input: string) {
  return slugify(input);
}

async function resolveUniqueProductSlug(name: string, db = prisma, providedSlug?: string, excludeId?: string) {
  const baseSlug = toProductSlugCandidate(providedSlug || name) || 'product';
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await db.product.findFirst({
      where: excludeId ? { slug: candidate, NOT: { id: excludeId } } : { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function assertUniqueProductIdentity(input: Pick<ProductFormInput, 'sku' | 'barcode' | 'slug' | 'name'>, db = prisma, excludeId?: string): Promise<void> {
  const slug = toProductSlugCandidate(input.slug || input.name) || 'product';
  const existing = await db.product.findFirst({
    where: {
      OR: [
        { sku: input.sku },
        { slug },
        ...(input.barcode ? [{ barcode: input.barcode }] : []),
      ],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { sku: true, slug: true, barcode: true },
  });

  if (!existing) {
    return;
  }
  if (existing.sku === input.sku) {
    throw new Error('A product with this SKU already exists.');
  }
  if (existing.slug === slug) {
    throw new Error('A product with this slug already exists.');
  }
  if (input.barcode && existing.barcode === input.barcode) {
    throw new Error('A product with this barcode already exists.');
  }
}

async function resolveUniqueSupplierSlug(name: string, db = prisma, providedSlug?: string, excludeId?: string) {
  const baseSlug = toProductSlugCandidate(providedSlug || name) || 'supplier';
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await db.supplier.findFirst({
      where: excludeId ? { slug: candidate, NOT: { id: excludeId } } : { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function mapProductRow(product: ProductRow): AdminProductListItem {
  const inventory = product.inventory ?? { stockOnHand: 0, reservedStock: 0, reorderPoint: 0, reorderQuantity: 0, incomingQuantity: 0, locationCode: 'MAIN' };
  const supplierProduct = product.supplierProducts[0];
  const supplier = supplierProduct?.supplier ?? {
    id: '',
    name: 'Unknown supplier',
    slug: '',
    email: null,
    phone: null,
    website: null,
    preferred: false,
    active: false,
    contactName: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    country: 'GB',
    internalNotes: null,
  };

  const availableStock = calculateAvailableStock(inventory.stockOnHand, inventory.reservedStock);
  const costMinor = supplierProduct?.costMinor ?? 0;
  const costExVatMinor = calculateVatExclusiveMinor(costMinor, product.vatRate);
  const pricing = product.pricing;
  const buyMinor = pricing?.buyMinor ?? Math.max(0, product.priceMinor - Math.round(product.priceMinor * 0.3));
  const marginMinor = product.priceMinor - costMinor;

  return {
    id: product.id,
    categoryId: product.category.id,
    gameId: product.gameId,
    brandId: product.brandId,
    productTypeId: product.productTypeId,
    languageId: product.languageId,
    setId: product.setId,
    sku: product.sku,
    barcode: product.barcode,
    slug: product.slug,
    name: product.name,
    brand: product.brandRef?.name ?? product.brand,
    game: product.gameRef?.name ?? product.game,
    setName: product.setRef?.name ?? product.setName,
    productType: product.productTypeRef?.name ?? product.productType,
    language: product.languageRef?.name ?? product.language,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    gameName: product.gameRef?.name ?? null,
    brandName: product.brandRef?.name ?? null,
    productTypeName: product.productTypeRef?.name ?? null,
    languageName: product.languageRef?.name ?? null,
    setDisplayName: product.setRef?.name ?? null,
    supplierName: supplier.name,
    supplierSlug: supplier.slug,
    supplierId: supplier.id,
    priceMinor: product.priceMinor,
    rrpMinor: product.rrpMinor,
    salePriceMinor: product.salePriceMinor,
    saleStartsAt: product.saleStartsAt,
    saleEndsAt: product.saleEndsAt,
    vatRate: product.vatRate,
    costMinor,
    costExVatMinor,
    landedCostMinor: product.pricing?.costMinor ?? supplierProduct?.costMinor ?? null,
    buyMinor,
    marginMinor,
    marginPercent: calculateMarginPercentage(costMinor, product.priceMinor),
    markupPercent: costMinor > 0 ? Math.round((marginMinor / costMinor) * 100) : 0,
    profitMinor: marginMinor,
    minimumMarginPercent: pricing?.minimumMarginPercent ?? 30,
    maximumDiscountPercent: pricing?.maximumDiscountPercent ?? 45,
    priceSource: pricing?.priceSource ?? 'Fallback',
    priceStatus: pricing?.priceStatus ?? (pricing?.manualOverride ? 'MANUAL_OVERRIDE' : 'FUTURE'),
    manualOverride: pricing?.manualOverride ?? false,
    priceUpdatedAt: pricing?.updatedAt ?? null,
    currency: product.currency,
    featured: product.featured,
    homepagePriority: product.homepagePriority,
    heroFeatured: product.heroFeatured,
    recommendationWeight: product.recommendationWeight,
    isAccessory: product.isAccessory,
    isStaffPick: product.isStaffPick,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    freeUkStandardShipping: product.freeUkStandardShipping,
    shippingPromotionProductOnly: product.shippingPromotionProductOnly,
    lifecycleState: product.lifecycleState,
    published: product.published,
    hideWhenOutOfStock: product.hideWhenOutOfStock,
    customerPurchaseLimit: product.customerPurchaseLimit,
    availabilityMessage: product.availabilityMessage,
    archivedAt: product.archivedAt,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    availableStock,
    reorderPoint: inventory.reorderPoint,
    reorderQuantity: inventory.reorderQuantity ?? 0,
    incomingQuantity: inventory.incomingQuantity ?? 0,
    locationCode: inventory.locationCode,
    imageCount: product.images.length,
    primaryImageUrl: product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url ?? null,
    importSourceType: product.importSourceType,
    importSourceReference: product.importSourceReference,
    importedAt: product.importedAt,
    lastImportedAt: product.lastImportedAt,
    importValidationWarnings: product.importValidationWarnings,
    seoTitle: product.seoTitle,
    metaDescription: product.metaDescription,
    canonicalUrl: product.canonicalUrl,
    ogImageUrl: product.ogImageUrl,
    noindex: product.noindex,
    createdAt: product.createdAt,
  };
}

function mapProductDetailRow(product: ProductRow): AdminProductDetail {
  const listItem = mapProductRow(product);
  const supplierProduct = product.supplierProducts[0];

  return {
    ...listItem,
    description: product.description,
    longDescription: product.longDescription,
    condition: product.condition,
    searchText: product.searchText,
    imageLabel: product.imageLabel,
    supplierSku: supplierProduct?.supplierSku ?? '',
    supplierProductUrl: supplierProduct?.supplierProductUrl ?? null,
    leadTimeDays: supplierProduct?.leadTimeDays ?? 0,
    minimumOrderQuantity: supplierProduct?.minimumOrderQuantity ?? 1,
    packQuantity: supplierProduct?.packQuantity ?? null,
    lastSupplierPriceUpdatedAt: supplierProduct?.lastPriceUpdatedAt ?? null,
    preferredSupplierProduct: supplierProduct?.preferred ?? false,
    supplierEmail: supplierProduct?.supplier.email ?? null,
    supplierPhone: supplierProduct?.supplier.phone ?? null,
    supplierWebsite: supplierProduct?.supplier.website ?? null,
    images: product.images,
    importAudits: product.importAudits,
  };
}

function mapSupplierRow(supplier: AdminSupplierRow | AdminSupplierDetailRow): AdminSupplierListItem {
  return {
    id: supplier.id,
    name: supplier.name,
    slug: supplier.slug,
    contactName: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    website: supplier.website,
    country: supplier.country,
    active: supplier.active,
    preferred: supplier.preferred,
    productCount: supplier.supplierProducts.length,
    createdAt: supplier.createdAt,
  };
}

function mapOrderRow(order: OrderListRow): AdminOrderListItem {
  return {
    orderNumber: order.orderNumber,
    customerName: order.user?.name ?? order.shippingFullName,
    customerEmail: order.user?.email ?? order.shippingEmail,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalMinor: order.totalMinor,
    currency: order.currency,
    createdAt: order.createdAt,
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
  };
}

export function calculateAvailableRetailMargin(costMinor: number, retailMinor: number) {
  return {
    marginMinor: retailMinor - costMinor,
    marginPercent: calculateMarginPercentage(costMinor, retailMinor),
  };
}

export function generateProductSlug(name: string, sku?: string) {
  return slugify(sku || name) || 'product';
}

const PRODUCT_RECOMMENDATION_TYPES = Object.values(ProductRecommendationType);
const MIN_RECOMMENDATION_WEIGHT = -1000;
const MAX_RECOMMENDATION_WEIGHT = 1000;
const MAX_RECOMMENDATION_PRIORITY = 10_000;

function assertRecommendationType(value: ProductRecommendationType): void {
  if (!PRODUCT_RECOMMENDATION_TYPES.includes(value)) {
    throw new Error('Choose a valid relationship type.');
  }
}

function assertRecommendationPriority(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_RECOMMENDATION_PRIORITY) {
    throw new Error('Priority must be a whole number from 0 to 10000. Lower numbers appear first.');
  }
}

function assertRecommendationWeight(value: number): void {
  if (!Number.isInteger(value) || value < MIN_RECOMMENDATION_WEIGHT || value > MAX_RECOMMENDATION_WEIGHT) {
    throw new Error('Recommendation weight must be a whole number from -1000 to 1000.');
  }
}

function toPublicStockState(product: { inventory: { stockOnHand: number; reservedStock: number } | null }) {
  return derivePublicStockState(calculateAvailableStock(product.inventory?.stockOnHand ?? 0, product.inventory?.reservedStock ?? 0));
}

function mapAdminMerchandisingProduct(product: AdminMerchandisingProductRow): AdminMerchandisingProductSummary {
  const image = product.images[0] ?? null;

  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    game: product.game,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    imageUrl: image?.url ?? null,
    imageAlt: image?.altText ?? null,
    priceMinor: product.priceMinor,
    currency: product.currency,
    lifecycleState: product.lifecycleState,
    published: product.published,
    archived: Boolean(product.archivedAt),
    publicStockState: toPublicStockState(product),
  };
}

function getRecommendationEligibility(
  row: AdminRecommendationRow,
  sourceProductId: string,
): AdminProductRecommendationItem['eligibility'] {
  const product = row.recommendedProduct;
  const reasons: string[] = [];

  if (!row.active) reasons.push('Inactive relationship');
  if (!product.slug) reasons.push('Missing storefront route');
  if (!product.published) reasons.push('Unpublished');
  if (product.lifecycleState !== 'PUBLISHED') reasons.push(product.lifecycleState === 'HIDDEN' ? 'Hidden' : product.lifecycleState);
  if (product.archivedAt) reasons.push('Archived');
  if (product.releaseStatus === 'ARCHIVED') reasons.push('Discontinued');
  if (calculateAvailableStock(product.inventory?.stockOnHand ?? 0, product.inventory?.reservedStock ?? 0) <= 0) reasons.push('Out of stock');

  const engineEligible =
    row.active &&
    isMerchandisingProductEligible(
      {
        id: product.id,
        slug: product.slug,
        published: product.published,
        lifecycleState: product.lifecycleState,
        archivedAt: product.archivedAt,
        releaseStatus: product.releaseStatus,
        inventory: product.inventory,
      },
      { sourceProductId, excludedProductIds: [], requireInStock: true },
    );

  return {
    eligible: engineEligible,
    label: engineEligible ? 'Eligible' : reasons[0] ?? 'Otherwise ineligible',
    reasons: engineEligible ? [] : reasons.length ? reasons : ['Otherwise ineligible'],
  };
}

function mapAdminRecommendation(row: AdminRecommendationRow, sourceProductId: string): AdminProductRecommendationItem {
  return {
    id: row.id,
    recommendedProduct: mapAdminMerchandisingProduct(row.recommendedProduct),
    relationshipType: row.relationshipType,
    priority: row.priority,
    active: row.active,
    eligibility: getRecommendationEligibility(row, sourceProductId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getSeedCategoryBySlug(slug: string) {
  return seedCategories.find((category) => category.slug === slug) ?? seedCategories[0]!;
}

function getSeedSupplierBySlug(slug: string) {
  return seedSuppliers.find((supplier) => supplier.slug === slug) ?? seedSuppliers[0]!;
}

function getSeedInventoryBySlug(slug: string) {
  return seedInventory.find((inventory) => inventory.productSlug === slug) ?? {
    productSlug: slug,
    stockOnHand: 0,
    reservedStock: 0,
    reorderPoint: 0,
    locationCode: 'MAIN',
  };
}

function getSeedPricingBySlug(slug: string) {
  return seedProductPricing.find((pricing) => pricing.productSlug === slug) ?? {
    id: `seed-price-${slug}`,
    productSlug: slug,
    pricingRuleId: null,
    costMinor: 0,
    retailMinor: 0,
    buyMinor: 0,
    marginMinor: 0,
    markupPercent: 0,
    profitMinor: 0,
    minimumMarginPercent: 0,
    maximumDiscountPercent: 0,
    priceSource: 'Seed data',
    priceStatus: 'ACTIVE' as const,
    manualOverride: false,
  };
}

function buildSeedProductListItem(product: (typeof seedProducts)[number], index: number): AdminProductListItem {
  const category = getSeedCategoryBySlug(product.categorySlug);
  const supplier = getSeedSupplierBySlug(product.supplierSlug);
  const inventory = getSeedInventoryBySlug(product.slug);
  const pricing = getSeedPricingBySlug(product.slug);
  const availableStock = calculateAvailableStock(inventory.stockOnHand, inventory.reservedStock);

  return {
    id: product.id,
    categoryId: category.id,
    gameId: null,
    brandId: null,
    productTypeId: null,
    languageId: null,
    setId: null,
    sku: product.sku,
    barcode: null,
    slug: product.slug,
    name: product.name,
    brand: product.game,
    game: product.game,
    setName: product.setName,
    productType: null,
    language: null,
    categoryName: category.name,
    categorySlug: category.slug,
    gameName: product.game,
    brandName: product.game,
    productTypeName: null,
    languageName: null,
    setDisplayName: product.setName,
    supplierName: supplier.name,
    supplierSlug: supplier.slug,
    supplierId: supplier.id,
    priceMinor: product.priceMinor,
    rrpMinor: null,
    salePriceMinor: null,
    saleStartsAt: null,
    saleEndsAt: null,
    vatRate: 20,
    costMinor: pricing.costMinor,
    costExVatMinor: calculateVatExclusiveMinor(pricing.costMinor, 20),
    landedCostMinor: pricing.costMinor,
    buyMinor: pricing.buyMinor,
    marginMinor: pricing.marginMinor,
    marginPercent: calculateMarginPercentage(pricing.costMinor, product.priceMinor),
    markupPercent: pricing.markupPercent,
    profitMinor: pricing.profitMinor,
    minimumMarginPercent: pricing.minimumMarginPercent,
    maximumDiscountPercent: pricing.maximumDiscountPercent,
    priceSource: pricing.priceSource,
    priceStatus: pricing.priceStatus,
    manualOverride: pricing.manualOverride,
    priceUpdatedAt: new Date(Date.UTC(2026, 6, 5 - index, 12, 0, 0)),
    currency: product.currency,
    featured: product.featured,
    homepagePriority: product.homepagePriority ?? null,
    heroFeatured: product.heroFeatured ?? false,
    recommendationWeight: 0,
    isAccessory: false,
    isStaffPick: false,
    isBestSeller: false,
    isNewArrival: false,
    freeUkStandardShipping: product.freeUkStandardShipping ?? false,
    shippingPromotionProductOnly: product.shippingPromotionProductOnly ?? true,
    lifecycleState: product.lifecycleState ?? (product.published ? 'PUBLISHED' : 'DRAFT'),
    published: product.published,
    hideWhenOutOfStock: false,
    customerPurchaseLimit: product.customerPurchaseLimit ?? null,
    availabilityMessage: product.availabilityMessage ?? null,
    archivedAt: null,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    availableStock,
    reorderPoint: inventory.reorderPoint,
    reorderQuantity: 0,
    incomingQuantity: 0,
    locationCode: inventory.locationCode,
    imageCount: 2,
    primaryImageUrl: `https://images.tcghobby.test/products/${product.slug}/primary.jpg`,
    importSourceType: product.importSourceType ?? null,
    importSourceReference: product.importSourceReference ?? null,
    importedAt: product.importSourceType ? new Date(Date.UTC(2026, 6, 5 - index, 12, 0, 0)) : null,
    lastImportedAt: product.importSourceType ? new Date(Date.UTC(2026, 6, 5 - index, 12, 0, 0)) : null,
    importValidationWarnings: product.importValidationWarnings ?? null,
    seoTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
    noindex: false,
    createdAt: new Date(Date.UTC(2026, 6, 5 - index, 12, 0, 0)),
  };
}

function buildSeedInventoryRow(product: (typeof seedProducts)[number]): AdminInventoryRow {
  const category = getSeedCategoryBySlug(product.categorySlug);
  const supplier = getSeedSupplierBySlug(product.supplierSlug);
  const inventory = getSeedInventoryBySlug(product.slug);
  const pricing = getSeedPricingBySlug(product.slug);
  const availableStock = calculateAvailableStock(inventory.stockOnHand, inventory.reservedStock);

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    categoryName: category.name,
    supplierName: supplier.name,
    currentStock: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    availableStock,
    reorderPoint: inventory.reorderPoint,
    costMinor: pricing.costMinor,
    retailMinor: pricing.retailMinor,
    marginMinor: pricing.marginMinor,
    marginPercent: calculateMarginPercentage(pricing.costMinor, pricing.retailMinor),
    lowStock: availableStock <= inventory.reorderPoint,
    locationCode: inventory.locationCode,
  };
}

function buildSeedOrderListItem(order: (typeof seedOrders)[number], index: number): AdminOrderListItem {
  const customer = seedUsers.find((user) => user.id === order.userId);
  const itemCount = seedOrderItems.filter((item) => item.orderId === order.id).reduce((count, item) => count + item.quantity, 0);

  return {
    orderNumber: order.orderNumber,
    customerName: customer?.name ?? order.shippingFullName,
    customerEmail: customer?.email ?? order.shippingEmail,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalMinor: order.totalMinor,
    currency: order.currency,
    createdAt: new Date(Date.UTC(2026, 6, 4 - index, 10, 30, 0)),
    itemCount,
  };
}

function buildSeedDashboardData(): AdminDashboardData {
  const inventoryRows = seedProducts.map(buildSeedInventoryRow);
  const recentOrders = seedOrders.map((order, index) => buildSeedOrderListItem(order, index));
  const recentlyAddedProducts = seedProducts.slice(0, 5).map((product, index) => buildSeedProductListItem(product, index));
  const lowStockProducts = inventoryRows.filter((product) => product.availableStock > 0 && product.availableStock <= product.reorderPoint).slice(0, 5);
  const outOfStockProducts = inventoryRows.filter((product) => product.availableStock <= 0).length;
  const activeProducts = seedProducts.filter((product) => product.published).length;
  const totalCustomers = seedUsers.filter((user) => user.role === 'CUSTOMER').length;

  return {
    metrics: [
      { label: 'Total Products', value: String(seedProducts.length), detail: 'All catalogue records' },
      { label: 'Active Products', value: String(activeProducts), detail: 'Published and visible' },
      { label: 'Low Stock', value: String(lowStockProducts.length), detail: 'Below reorder point' },
      { label: 'Out of Stock', value: String(outOfStockProducts), detail: 'Needs replenishment' },
      { label: 'Pending Orders', value: String(seedOrders.filter((order) => order.paymentStatus === 'REQUIRES_PAYMENT').length), detail: 'Waiting for payment or fulfilment' },
      { label: 'Total Customers', value: String(totalCustomers), detail: 'Registered customer accounts' },
      { label: 'Suppliers', value: String(seedSuppliers.length), detail: 'Active and inactive suppliers' },
      { label: 'Categories', value: String(seedCategories.length), detail: 'Catalogue taxonomy' },
    ],
    recentOrders,
    lowStockProducts,
    recentlyAddedProducts,
  };
}

export async function getAdminDashboardData(db = prisma): Promise<AdminDashboardData> {
  try {
    const [totalProducts, activeProducts, pendingOrders, totalCustomers, suppliers, categories, recentOrders, allProducts, inventoryRows] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { published: true, archivedAt: null } }),
      db.order.count({ where: { paymentStatus: 'REQUIRES_PAYMENT' } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.supplier.count(),
      db.category.count(),
      db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: adminOrderListInclude,
      }),
      db.product.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: adminProductInclude,
      }),
      db.inventoryItem.findMany({
        select: { stockOnHand: true, reservedStock: true, reorderPoint: true },
      }),
    ]);

    const mappedProducts = allProducts.map(mapProductRow);
    const inventoryPreview = await getAdminInventoryRows(db);
    const mappedRecentOrders = recentOrders.map(mapOrderRow);
    const lowStockCount = inventoryPreview.filter((product) => product.availableStock > 0 && product.availableStock <= product.reorderPoint).length;
    const lowStockProducts = inventoryPreview.filter((product) => product.availableStock > 0 && product.availableStock <= product.reorderPoint).slice(0, 5);
    const outOfStockProducts = inventoryRows.filter((item) => calculateAvailableStock(item.stockOnHand, item.reservedStock) <= 0).length;

    const metrics: AdminMetric[] = [
      { label: 'Total Products', value: String(totalProducts), detail: 'All catalogue records' },
      { label: 'Active Products', value: String(activeProducts), detail: 'Published and visible' },
      { label: 'Low Stock', value: String(lowStockCount), detail: 'Below reorder point' },
      { label: 'Out of Stock', value: String(outOfStockProducts), detail: 'Needs replenishment' },
      { label: 'Pending Orders', value: String(pendingOrders), detail: 'Waiting for payment or fulfilment' },
      { label: 'Total Customers', value: String(totalCustomers), detail: 'Registered customer accounts' },
      { label: 'Suppliers', value: String(suppliers), detail: 'Active and inactive suppliers' },
      { label: 'Categories', value: String(categories), detail: 'Catalogue taxonomy' },
    ];

    return {
      metrics,
      recentOrders: mappedRecentOrders,
      lowStockProducts,
      recentlyAddedProducts: mappedProducts.slice(0, 5),
    };
  } catch (error) {
    if (isProduction()) {
      const reason = error instanceof Error ? error.message : 'Unknown database error';
      throw new Error(`Admin dashboard data is unavailable in production: ${reason}`);
    }

    return buildSeedDashboardData();
  }
}

export async function getAdminProducts(filters: CatalogueFilters, db = prisma): Promise<AdminProductsResult> {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { searchText: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (filters.category) {
    where.category = { is: { slug: filters.category } };
  }

  if (filters.supplier) {
    where.supplierProducts = { some: { supplier: { slug: filters.supplier } } };
  }
  if (filters.game) {
    where.gameRef = { is: { slug: filters.game } };
  }
  if (filters.brand) {
    where.brandRef = { is: { slug: filters.brand } };
  }
  if (filters.productType) {
    where.productTypeRef = { is: { slug: filters.productType } };
  }
  if (filters.status === 'published') {
    where.published = true;
    where.archivedAt = null;
  } else if (filters.status === 'hidden') {
    where.published = false;
    where.archivedAt = null;
  } else if (filters.status === 'archived') {
    where.archivedAt = { not: null };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    filters.sort === 'name-desc'
      ? [{ name: 'desc' }]
      : filters.sort === 'price-asc'
        ? [{ priceMinor: 'asc' }]
        : filters.sort === 'price-desc'
          ? [{ priceMinor: 'desc' }]
          : [{ createdAt: 'desc' }];

  const totalItems = await db.product.count({ where });
  const pagination = resolvePagination(totalItems, page, pageSize);
  const [rows, categories, suppliers, games, brands, productTypes] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (pagination.page - 1) * pageSize,
      include: adminProductInclude,
    }),
    db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.supplier.findMany({
      orderBy: [{ preferred: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.game.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } }),
    db.brand.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } }),
    db.productType.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } }),
  ]);

  return {
    products: rows.map(mapProductRow),
    pagination,
    categories,
    suppliers,
    games,
    brands,
    productTypes,
  };
}

export async function getAdminProductById(id: string, db = prisma): Promise<AdminProductDetail | null> {
  const product = await db.product.findUnique({
    where: { id },
    include: adminProductInclude,
  });

  if (!product) {
    return null;
  }

  return mapProductDetailRow(product);
}

export async function createAdminProduct(input: ProductFormInput, db = prisma): Promise<AdminProductDetail | null> {
  await assertUniqueProductIdentity(input, db);
  const slug = await resolveUniqueProductSlug(input.name, db, input.slug);
  const costMinor = input.landedCostMinor ?? input.costMinor;
  const masterData = await resolveProductMasterDataInput(input, db);
  const resolvedGame = masterData.game?.name ?? input.game;
  const resolvedBrand = masterData.brand?.name ?? input.brand ?? null;
  const resolvedProductType = masterData.productType?.name ?? input.productType ?? null;
  const resolvedLanguage = masterData.language?.name ?? input.language ?? null;
  const resolvedSetName = masterData.set?.name ?? input.setName ?? null;

  const created = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku: input.sku,
        barcode: input.barcode || null,
        slug,
        name: input.name,
        brand: resolvedBrand,
        game: resolvedGame,
        setName: resolvedSetName,
        productType: resolvedProductType,
        language: resolvedLanguage,
        gameId: masterData.game?.id ?? null,
        brandId: masterData.brand?.id ?? null,
        productTypeId: masterData.productType?.id ?? null,
        languageId: masterData.language?.id ?? null,
        setId: masterData.set?.id ?? null,
        description: input.description,
        longDescription: input.longDescription,
        condition: input.condition as ProductCondition,
        priceMinor: input.priceMinor,
        rrpMinor: input.rrpMinor ?? null,
        salePriceMinor: input.salePriceMinor ?? null,
        saleStartsAt: input.saleStartsAt ?? null,
        saleEndsAt: input.saleEndsAt ?? null,
        vatRate: input.vatRate ?? 20,
        currency: 'GBP',
        featured: input.featured,
        published: input.published,
        lifecycleState: input.published ? 'PUBLISHED' : 'DRAFT',
        hideWhenOutOfStock: input.hideWhenOutOfStock,
        customerPurchaseLimit: input.customerPurchaseLimit ?? null,
        availabilityMessage: input.availabilityMessage || null,
        searchText: `${input.name} ${input.sku} ${input.barcode ?? ''} ${resolvedBrand ?? ''} ${resolvedGame} ${resolvedSetName ?? ''} ${resolvedProductType ?? ''} ${resolvedLanguage ?? ''} ${input.description} ${input.longDescription}`.toLowerCase(),
        imageLabel: input.imageLabel,
        categoryId: input.categoryId,
        seoTitle: input.seoTitle || null,
        metaDescription: input.metaDescription || null,
        canonicalUrl: input.canonicalUrl || null,
        ogImageUrl: input.ogImageUrl || null,
        noindex: input.noindex ?? false,
        archivedAt: null,
      },
    });

    await tx.inventoryItem.create({
      data: {
        productId: product.id,
        stockOnHand: input.stockOnHand,
        reservedStock: 0,
        reorderPoint: input.reorderPoint,
        reorderQuantity: input.reorderQuantity ?? 0,
        incomingQuantity: input.incomingQuantity ?? 0,
        locationCode: input.locationCode,
      },
    });

    await tx.supplierProduct.create({
      data: {
        productId: product.id,
        supplierId: input.supplierId,
        supplierSku: input.supplierSku || input.sku,
        supplierProductUrl: input.supplierProductUrl || null,
        costMinor,
        minimumOrderQuantity: input.minimumOrderQuantity ?? 1,
        packQuantity: input.packQuantity ?? null,
        currency: 'GBP',
        leadTimeDays: input.supplierLeadTimeDays ?? 7,
        lastPriceUpdatedAt: new Date(),
        preferred: true,
      },
    });

    const imageInputs = [
      ...(input.primaryImageUrl
        ? [{ url: input.primaryImageUrl, altText: input.primaryImageAlt || input.imageLabel || input.name, imageType: 'primary' }]
        : []),
      ...(input.galleryImages ?? []),
    ].map((image, index) => ({
        productId: product.id,
        url: image.url,
        altText: image.altText || `${input.name} image ${index + 1}`,
        imageType: index === 0 ? 'primary' : image.imageType || 'gallery',
        sortOrder: index,
        isPrimary: index === 0,
      }));

    if (imageInputs.length) {
      await tx.productImage.createMany({ data: imageInputs });
    }

    return product;
  });

  await refreshProductPricing(created.id, db);
  return getAdminProductById(created.id, db);
}

export async function updateAdminProduct(id: string, input: ProductFormInput, db = prisma): Promise<AdminProductDetail | null> {
  await assertUniqueProductIdentity(input, db, id);
  const slug = await resolveUniqueProductSlug(input.name, db, input.slug, id);
  const costMinor = input.landedCostMinor ?? input.costMinor;
  const masterData = await resolveProductMasterDataInput(input, db);
  const resolvedGame = masterData.game?.name ?? input.game;
  const resolvedBrand = masterData.brand?.name ?? input.brand ?? null;
  const resolvedProductType = masterData.productType?.name ?? input.productType ?? null;
  const resolvedLanguage = masterData.language?.name ?? input.language ?? null;
  const resolvedSetName = masterData.set?.name ?? input.setName ?? null;

  const product = await db.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        sku: input.sku,
        barcode: input.barcode || null,
        slug,
        name: input.name,
        brand: resolvedBrand,
        game: resolvedGame,
        setName: resolvedSetName,
        productType: resolvedProductType,
        language: resolvedLanguage,
        gameId: masterData.game?.id ?? null,
        brandId: masterData.brand?.id ?? null,
        productTypeId: masterData.productType?.id ?? null,
        languageId: masterData.language?.id ?? null,
        setId: masterData.set?.id ?? null,
        description: input.description,
        longDescription: input.longDescription,
        condition: input.condition as ProductCondition,
        priceMinor: input.priceMinor,
        rrpMinor: input.rrpMinor ?? null,
        salePriceMinor: input.salePriceMinor ?? null,
        saleStartsAt: input.saleStartsAt ?? null,
        saleEndsAt: input.saleEndsAt ?? null,
        vatRate: input.vatRate ?? 20,
        currency: 'GBP',
        featured: input.featured,
        published: input.published,
        lifecycleState: input.published ? 'PUBLISHED' : 'DRAFT',
        hideWhenOutOfStock: input.hideWhenOutOfStock,
        customerPurchaseLimit: input.customerPurchaseLimit ?? null,
        availabilityMessage: input.availabilityMessage || null,
        searchText: `${input.name} ${input.sku} ${input.barcode ?? ''} ${resolvedBrand ?? ''} ${resolvedGame} ${resolvedSetName ?? ''} ${resolvedProductType ?? ''} ${resolvedLanguage ?? ''} ${input.description} ${input.longDescription}`.toLowerCase(),
        imageLabel: input.imageLabel,
        categoryId: input.categoryId,
        seoTitle: input.seoTitle || null,
        metaDescription: input.metaDescription || null,
        canonicalUrl: input.canonicalUrl || null,
        ogImageUrl: input.ogImageUrl || null,
        noindex: input.noindex ?? false,
      },
    });

    await tx.inventoryItem.upsert({
      where: { productId: id },
      create: {
        productId: id,
        stockOnHand: input.stockOnHand,
        reservedStock: 0,
        reorderPoint: input.reorderPoint,
        reorderQuantity: input.reorderQuantity ?? 0,
        incomingQuantity: input.incomingQuantity ?? 0,
        locationCode: input.locationCode,
      },
      update: {
        stockOnHand: input.stockOnHand,
        reorderPoint: input.reorderPoint,
        reorderQuantity: input.reorderQuantity ?? 0,
        incomingQuantity: input.incomingQuantity ?? 0,
        locationCode: input.locationCode,
      },
    });

    await tx.supplierProduct.deleteMany({ where: { productId: id } });
    await tx.supplierProduct.create({
      data: {
        productId: id,
        supplierId: input.supplierId,
        supplierSku: input.supplierSku || input.sku,
        supplierProductUrl: input.supplierProductUrl || null,
        costMinor,
        minimumOrderQuantity: input.minimumOrderQuantity ?? 1,
        packQuantity: input.packQuantity ?? null,
        currency: 'GBP',
        leadTimeDays: input.supplierLeadTimeDays ?? 7,
        lastPriceUpdatedAt: new Date(),
        preferred: true,
      },
    });

    // Legacy URL records are replaced here; managed R2 records have their own lifecycle.
    await tx.productImage.deleteMany({ where: { productId: id, storageKey: null } });

    const managedImageCount = await tx.productImage.count({
      where: { productId: id, storageKey: { not: null }, deletionState: 'ACTIVE' },
    });

    const imageInputs = [
      ...(input.primaryImageUrl
        ? [{ url: input.primaryImageUrl, altText: input.primaryImageAlt || input.imageLabel || input.name, imageType: 'primary' }]
        : []),
      ...(input.galleryImages ?? []),
    ].map((image, index) => ({
        productId: id,
        url: image.url,
        altText: image.altText || `${input.name} image ${index + 1}`,
        imageType: index === 0 ? 'primary' : image.imageType || 'gallery',
        sortOrder: managedImageCount + index,
        isPrimary: managedImageCount === 0 && index === 0,
      }));

    if (imageInputs.length) {
      await tx.productImage.createMany({ data: imageInputs });
    }

    return updated;
  });

  await refreshProductPricing(product.id, db);
  return getAdminProductById(product.id, db);
}

export async function updateProductMerchandisingSettings(
  productId: string,
  input: AdminMerchandisingSettingsInput,
  db = prisma,
): Promise<void> {
  if (input.recommendationWeight !== undefined) {
    assertRecommendationWeight(input.recommendationWeight);
  }

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw new Error('Product not found.');
  }

  await db.product.update({
    where: { id: productId },
    data: {
      ...(input.recommendationWeight !== undefined ? { recommendationWeight: input.recommendationWeight } : {}),
      ...(input.isAccessory !== undefined ? { isAccessory: input.isAccessory } : {}),
      ...(input.isStaffPick !== undefined ? { isStaffPick: input.isStaffPick } : {}),
      ...(input.isBestSeller !== undefined ? { isBestSeller: input.isBestSeller } : {}),
      ...(input.isNewArrival !== undefined ? { isNewArrival: input.isNewArrival } : {}),
    },
  });
}

export async function createAdminProductRecommendation(
  input: AdminProductRecommendationInput,
  db = prisma,
): Promise<{ id: string }> {
  if (input.sourceProductId === input.recommendedProductId) {
    throw new Error('A product cannot recommend itself.');
  }
  assertRecommendationType(input.relationshipType);
  assertRecommendationPriority(input.priority);

  const [sourceProduct, recommendedProduct] = await Promise.all([
    db.product.findUnique({ where: { id: input.sourceProductId }, select: { id: true } }),
    db.product.findUnique({ where: { id: input.recommendedProductId }, select: { id: true } }),
  ]);

  if (!sourceProduct) throw new Error('Source product not found.');
  if (!recommendedProduct) throw new Error('Recommended product not found.');

  try {
    return await db.productRecommendation.create({
      data: {
        sourceProductId: input.sourceProductId,
        recommendedProductId: input.recommendedProductId,
        relationshipType: input.relationshipType,
        priority: input.priority,
        active: input.active,
      },
      select: { id: true },
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new Error('This recommendation already exists for the selected relationship type.');
    }
    throw error;
  }
}

export async function updateAdminProductRecommendation(
  recommendationId: string,
  input: AdminProductRecommendationUpdateInput,
  db = prisma,
): Promise<void> {
  assertRecommendationType(input.relationshipType);
  assertRecommendationPriority(input.priority);

  const current = await db.productRecommendation.findUnique({
    where: { id: recommendationId },
    select: { id: true, sourceProductId: true, recommendedProductId: true },
  });

  if (!current) {
    throw new Error('Recommendation not found.');
  }

  try {
    await db.productRecommendation.update({
      where: { id: recommendationId },
      data: {
        relationshipType: input.relationshipType,
        priority: input.priority,
        active: input.active,
      },
    });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new Error('Changing this relationship would duplicate an existing recommendation.');
    }
    throw error;
  }
}

export async function deleteAdminProductRecommendation(recommendationId: string, db = prisma): Promise<void> {
  const current = await db.productRecommendation.findUnique({
    where: { id: recommendationId },
    select: { id: true },
  });

  if (!current) {
    throw new Error('Recommendation not found.');
  }

  await db.productRecommendation.delete({ where: { id: recommendationId } });
}

export async function searchAdminMerchandisingProducts(
  input: { sourceProductId: string; search?: string; take?: number },
  db = prisma,
): Promise<AdminMerchandisingProductSummary[]> {
  const search = normalizeSearch(input.search);
  const take = Math.min(Math.max(input.take ?? 12, 1), 24);

  if (!search) {
    return [];
  }

  const existingRelationships = await db.productRecommendation.findMany({
    where: { sourceProductId: input.sourceProductId },
    select: { recommendedProductId: true },
    take: 250,
  });
  const excludedIds = [input.sourceProductId, ...existingRelationships.map((item) => item.recommendedProductId)];

  const rows = await db.product.findMany({
    where: {
      id: { notIn: excludedIds },
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: adminMerchandisingProductSelect,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take,
  });

  return rows.map(mapAdminMerchandisingProduct);
}

export async function getAdminProductMerchandisingPanel(
  productId: string,
  options: { search?: string } = {},
  db = prisma,
): Promise<AdminProductMerchandisingPanel | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      recommendationWeight: true,
      isAccessory: true,
      isStaffPick: true,
      isBestSeller: true,
      isNewArrival: true,
    },
  });

  if (!product) {
    return null;
  }

  const [recommendationRows, candidates, previewRows] = await Promise.all([
    db.productRecommendation.findMany({
      where: { sourceProductId: productId },
      include: adminRecommendationInclude,
      orderBy: [{ active: 'desc' }, { priority: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    }),
    searchAdminMerchandisingProducts({ sourceProductId: productId, ...(options.search !== undefined ? { search: options.search } : {}) }, db),
    getRelatedProducts({ sourceProductId: productId, resultLimit: 4, excludedProductIds: [productId] }, db),
  ]);

  const manualProductIds = new Set(recommendationRows.filter((row) => row.active).map((row) => row.recommendedProductId));

  return {
    settings: {
      recommendationWeight: product.recommendationWeight,
      isAccessory: product.isAccessory,
      isStaffPick: product.isStaffPick,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
    },
    recommendations: recommendationRows.map((row) => mapAdminRecommendation(row, productId)),
    candidates,
    preview: previewRows.map((item, index) => ({
      id: item.id,
      sku: '',
      slug: item.slug,
      name: item.name,
      game: item.gameLabel,
      categoryName: item.categoryLabel,
      categorySlug: item.categorySlug,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      priceMinor: item.price.amountMinor,
      currency: item.price.currency,
      lifecycleState: 'PUBLISHED',
      published: true,
      archived: false,
      publicStockState: item.publicStockState,
      position: index + 1,
      strategyId: item.strategyId,
      manual: manualProductIds.has(item.id),
    })),
  };
}

export async function archiveAdminProduct(id: string, db = prisma): Promise<void> {
  await db.product.update({
    where: { id },
    data: {
      published: false,
      archivedAt: new Date(),
    },
  });
}

export async function setProductPublication(id: string, published: boolean, db = prisma): Promise<void> {
  const data: { published: boolean; lifecycleState: 'PUBLISHED' | 'DRAFT'; archivedAt?: Date | null } = {
    published,
    lifecycleState: published ? 'PUBLISHED' : 'DRAFT',
  };

  if (published) {
    data.archivedAt = null;
  }

  await db.product.update({
    where: { id },
    data,
  });
}

export async function getAdminInventoryRows(db = prisma): Promise<AdminInventoryRow[]> {
  const rows = await db.product.findMany({
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    include: adminInventoryProductInclude,
  });

  return rows.map((product) => {
    const inventory = product.inventory ?? { stockOnHand: 0, reservedStock: 0, reorderPoint: 0, reorderQuantity: 0, incomingQuantity: 0, locationCode: 'MAIN' };
    const supplierProduct = product.supplierProducts[0];
    const costMinor = supplierProduct?.costMinor ?? 0;

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      categoryName: product.category.name,
      supplierName: supplierProduct?.supplier.name ?? 'Unassigned',
      currentStock: inventory.stockOnHand,
      reservedStock: inventory.reservedStock,
      availableStock: calculateAvailableStock(inventory.stockOnHand, inventory.reservedStock),
      reorderPoint: inventory.reorderPoint,
      costMinor,
      retailMinor: product.priceMinor,
      marginMinor: product.priceMinor - costMinor,
      marginPercent: calculateMarginPercentage(costMinor, product.priceMinor),
      lowStock: calculateAvailableStock(inventory.stockOnHand, inventory.reservedStock) <= inventory.reorderPoint,
      locationCode: inventory.locationCode,
    };
  });
}

export async function getStockAdjustmentHistory(productId?: string, db = prisma): Promise<AdminStockAdjustmentRow[]> {
  const where: Prisma.StockAdjustmentWhereInput | undefined = productId ? { productId } : undefined;

  const rows: StockAdjustmentHistoryRow[] = await db.stockAdjustment.findMany({
    ...(where ? { where } : {}),
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: stockAdjustmentHistoryInclude,
  });

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    delta: row.delta,
    beforeStock: row.beforeStock,
    afterStock: row.afterStock,
    reason: row.reason,
    performedBy: row.performedBy,
    createdAt: row.createdAt,
  }));
}

export async function adjustProductStock(productId: string, delta: number, reason: string, performedBy = 'Operations Desk', db = prisma): Promise<AdminInventoryRow[]> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('Enter a non-zero stock adjustment.');
  }

  const inventory = await db.inventoryItem.findUnique({
    where: { productId },
    select: { id: true, stockOnHand: true },
  });

  if (!inventory) {
    throw new Error('Inventory is missing for this product.');
  }

  const beforeStock = inventory.stockOnHand;
  const afterStock = beforeStock + delta;

  if (afterStock < 0) {
    throw new Error('Stock adjustment cannot reduce inventory below zero.');
  }

  await db.$transaction([
    db.inventoryItem.update({
      where: { id: inventory.id },
      data: { stockOnHand: afterStock },
    }),
    db.stockAdjustment.create({
      data: {
        productId,
        delta,
        beforeStock,
        afterStock,
        reason,
        performedBy,
      },
    }),
  ]);

  return getAdminInventoryRows(db);
}

export async function getAdminSuppliers(filters: SupplierFilters = {}, db = prisma): Promise<AdminSuppliersResult> {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Prisma.SupplierWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.SupplierOrderByWithRelationInput[] =
    filters.sort === 'name-desc'
      ? [{ name: 'desc' }]
      : filters.sort === 'recent'
        ? [{ createdAt: 'desc' }]
        : [{ name: 'asc' }];

  const totalItems = await db.supplier.count({ where });
  const pagination = resolvePagination(totalItems, page, pageSize);
  const rows = await db.supplier.findMany({
    where,
    orderBy,
    take: pageSize,
    skip: (pagination.page - 1) * pageSize,
    include: adminSupplierInclude,
  });

  return {
    suppliers: rows.map(mapSupplierRow),
    pagination,
  };
}

export async function getAdminSupplierById(id: string, db = prisma): Promise<AdminSupplierDetail | null> {
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      ...adminSupplierDetailInclude,
    },
  });

  if (!supplier) {
    return null;
  }

  return {
    ...mapSupplierRow(supplier),
    addressLine1: supplier.addressLine1,
    addressLine2: supplier.addressLine2,
    city: supplier.city,
    region: supplier.region,
    postalCode: supplier.postalCode,
    internalNotes: supplier.internalNotes,
    products: supplier.supplierProducts.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      supplierSku: item.supplierSku,
      costMinor: item.costMinor,
      currency: item.currency,
      leadTimeDays: item.leadTimeDays,
      active: item.active,
    })),
  };
}

export async function createAdminSupplier(input: SupplierFormInput, db = prisma): Promise<AdminSupplierDetail | null> {
  const slug = await resolveUniqueSupplierSlug(input.name, db, input.slug);

  const supplier = await db.supplier.create({
    data: {
      name: input.name,
      slug,
      contactName: input.contactName || null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      region: input.region || null,
      postalCode: input.postalCode || null,
      country: input.country || 'GB',
      active: input.active,
      preferred: input.preferred,
      internalNotes: input.internalNotes || null,
    },
  });

  return getAdminSupplierById(supplier.id, db);
}

export async function updateAdminSupplier(id: string, input: SupplierFormInput, db = prisma): Promise<AdminSupplierDetail | null> {
  const slug = await resolveUniqueSupplierSlug(input.name, db, input.slug, id);

  await db.supplier.update({
    where: { id },
    data: {
      name: input.name,
      slug,
      contactName: input.contactName || null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      region: input.region || null,
      postalCode: input.postalCode || null,
      country: input.country || 'GB',
      active: input.active,
      preferred: input.preferred,
      internalNotes: input.internalNotes || null,
    },
  });

  return getAdminSupplierById(id, db);
}

export async function getAdminOrders(filters: OrderFilters = {}, db = prisma): Promise<AdminOrdersResult> {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Prisma.OrderWhereInput = {};
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { shippingEmail: { contains: search, mode: 'insensitive' } },
      { shippingFullName: { contains: search, mode: 'insensitive' } },
      { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  if (filters.status && isPrismaOrderStatus(filters.status)) {
    where.status = filters.status;
  }

  if (filters.paymentStatus && isPrismaPaymentStatus(filters.paymentStatus)) {
    where.paymentStatus = filters.paymentStatus;
  }

  const totalItems = await db.order.count({ where });
  const pagination = resolvePagination(totalItems, page, pageSize);

  const rows = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (pagination.page - 1) * pageSize,
    include: adminOrderListInclude,
  });

  return {
    orders: rows.map(mapOrderRow),
    pagination,
  };
}

export async function getAdminOrderByNumber(orderNumber: string, db = prisma): Promise<AdminOrderDetail | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: adminOrderDetailInclude,
  });

  if (!order) {
    return null;
  }

  const mapped = mapOrderRow(order);

  return {
    ...mapped,
    fulfilmentStatus: order.fulfilmentStatus,
    shippingMethodName: order.shippingMethodName,
    shippingMethodCode: order.shippingMethodCode,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    shippingAddress: order.shippingAddress,
    items: order.items,
  };
}
