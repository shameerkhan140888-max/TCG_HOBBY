import type { PaginationMeta, PaymentStatus, FulfilmentStatus, ProductCondition } from '@tcg-hobby/types';
import { slugify } from '@tcg-hobby/utils';
import { prisma } from './client';
import { calculateMarginPercentage, calculateAvailableStock } from './admin-math';
import { refreshProductPricing } from './pricing';

type ProductCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
};

type SupplierRow = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  preferred: boolean;
  active: boolean;
  contactName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  internalNotes: string | null;
};

type InventoryRow = {
  stockOnHand: number;
  reservedStock: number;
  reorderPoint: number;
  locationCode: string;
};

type ProductImageRow = {
  id: string;
  url: string;
  altText: string;
  imageType: string;
  sortOrder: number;
  isPrimary: boolean;
};

type SupplierProductRow = {
  id: string;
  supplierSku: string;
  costMinor: number;
  currency: string;
  leadTimeDays: number;
  supplier: SupplierRow;
};

type ProductRow = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  game: string;
  setName: string | null;
  description: string;
  longDescription: string;
  condition: ProductCondition;
  priceMinor: number;
  currency: string;
  featured: boolean;
  published: boolean;
  archivedAt: Date | null;
  searchText: string;
  imageLabel: string;
  category: ProductCategoryRow;
  inventory: InventoryRow | null;
  images: ProductImageRow[];
  supplierProducts: SupplierProductRow[];
  pricing: {
    costMinor: number;
    retailMinor: number;
    buyMinor: number;
    marginMinor: number;
    markupPercent: number;
    profitMinor: number;
    minimumMarginPercent: number;
    maximumDiscountPercent: number;
    priceSource: string;
    priceStatus: string;
    manualOverride: boolean;
    updatedAt: Date;
    pricingRule: { id: string; name: string } | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

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

type OrderRow = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  shippingMethodCode: string;
  shippingMethodName: string;
  shippingMethodAmountMinor: number;
  shippingFullName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  createdAt: Date;
  items: OrderItemRow[];
  shippingAddress: AddressRow | null;
  user: { name: string | null; email: string };
};

type CatalogueFilters = {
  search?: string;
  category?: string;
  supplier?: string;
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
  sku: string;
  slug: string;
  name: string;
  game: string;
  setName: string | null;
  categoryName: string;
  categorySlug: string;
  supplierName: string;
  supplierSlug: string;
  supplierId: string;
  priceMinor: number;
  costMinor: number;
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
  published: boolean;
  archivedAt: Date | null;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  locationCode: string;
  imageCount: number;
  primaryImageUrl: string | null;
  createdAt: Date;
};

export type AdminProductDetail = AdminProductListItem & {
  description: string;
  longDescription: string;
  condition: string;
  searchText: string;
  imageLabel: string;
  supplierSku: string;
  leadTimeDays: number;
  supplierEmail: string | null;
  supplierPhone: string | null;
  supplierWebsite: string | null;
  images: ProductImageRow[];
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
  game: string;
  setName?: string;
  description: string;
  longDescription: string;
  condition: string;
  categoryId: string;
  supplierId: string;
  priceMinor: number;
  costMinor: number;
  stockOnHand: number;
  reservedStock: number;
  reorderPoint: number;
  locationCode: string;
  imageLabel: string;
  featured: boolean;
  published: boolean;
  primaryImageUrl?: string;
  galleryImageUrl?: string;
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
  const inventory = product.inventory ?? { stockOnHand: 0, reservedStock: 0, reorderPoint: 0, locationCode: 'MAIN' };
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
  const pricing = product.pricing;
  const buyMinor = pricing?.buyMinor ?? Math.max(0, product.priceMinor - Math.round(product.priceMinor * 0.3));
  const marginMinor = product.priceMinor - costMinor;

  return {
    id: product.id,
    categoryId: product.category.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    game: product.game,
    setName: product.setName,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    supplierName: supplier.name,
    supplierSlug: supplier.slug,
    supplierId: supplier.id,
    priceMinor: product.priceMinor,
    costMinor,
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
    published: product.published,
    archivedAt: product.archivedAt,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    availableStock,
    reorderPoint: inventory.reorderPoint,
    locationCode: inventory.locationCode,
    imageCount: product.images.length,
    primaryImageUrl: product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url ?? null,
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
    leadTimeDays: supplierProduct?.leadTimeDays ?? 0,
    supplierEmail: supplierProduct?.supplier.email ?? null,
    supplierPhone: supplierProduct?.supplier.phone ?? null,
    supplierWebsite: supplierProduct?.supplier.website ?? null,
    images: product.images,
  };
}

function mapSupplierRow(supplier: SupplierRow & { supplierProducts: Array<{ id: string; productId: string; product: { id: string; name: string; slug: string } }>; createdAt: Date }): AdminSupplierListItem {
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

type OrderListRow = {
  orderNumber: string;
  status: string;
  paymentStatus: PaymentStatus;
  totalMinor: number;
  currency: string;
  createdAt: Date;
  items: Array<{ quantity: number }>;
  user: { name: string | null; email: string };
  shippingFullName: string;
  shippingEmail: string;
};

function mapOrderRow(order: OrderListRow): AdminOrderListItem {
  return {
    orderNumber: order.orderNumber,
    customerName: order.user.name ?? order.shippingFullName,
    customerEmail: order.user.email ?? order.shippingEmail,
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

export async function getAdminDashboardData(db = prisma): Promise<AdminDashboardData> {
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
      include: {
        items: { select: { quantity: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    db.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        category: true,
        inventory: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
        pricing: { include: { pricingRule: true } },
      },
    }),
    db.inventoryItem.findMany({
      select: { stockOnHand: true, reservedStock: true, reorderPoint: true },
    }),
  ]);

  const mappedProducts = allProducts.map((product) => mapProductRow(product as unknown as ProductRow));
  const inventoryPreview = await getAdminInventoryRows(db);
  const mappedRecentOrders = (recentOrders as unknown as OrderListRow[]).map(mapOrderRow);
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
}

export async function getAdminProducts(filters: CatalogueFilters, db = prisma) {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Record<string, unknown> = {};
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

  const orderBy =
    filters.sort === 'name-desc'
      ? [{ name: 'desc' }]
      : filters.sort === 'price-asc'
        ? [{ priceMinor: 'asc' }]
        : filters.sort === 'price-desc'
          ? [{ priceMinor: 'desc' }]
          : [{ createdAt: 'desc' }];

  const totalItems = await db.product.count({ where: where as any });
  const pagination = resolvePagination(totalItems, page, pageSize);
  const [rows, categories, suppliers] = await Promise.all([
    db.product.findMany({
      where: where as any,
      orderBy: orderBy as any,
      take: pageSize,
      skip: (pagination.page - 1) * pageSize,
      include: {
        category: true,
        inventory: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
        pricing: { include: { pricingRule: true } },
      },
    }),
    db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.supplier.findMany({
      orderBy: [{ preferred: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return {
    products: (rows as unknown as ProductRow[]).map(mapProductRow),
    pagination,
    categories,
    suppliers,
  };
}

export async function getAdminProductById(id: string, db = prisma) {
  const product = (await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      inventory: true,
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
      pricing: { include: { pricingRule: true } },
    },
  })) as unknown as ProductRow | null;

  if (!product) {
    return null;
  }

  return mapProductDetailRow(product);
}

export async function createAdminProduct(input: ProductFormInput, db = prisma) {
  const slug = await resolveUniqueProductSlug(input.name, db, input.slug);

  const created = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku: input.sku,
        slug,
        name: input.name,
        game: input.game,
        setName: input.setName || null,
        description: input.description,
        longDescription: input.longDescription,
        condition: input.condition as ProductCondition,
        priceMinor: input.priceMinor,
        currency: 'GBP',
        featured: input.featured,
        published: input.published,
        searchText: `${input.name} ${input.sku} ${input.game} ${input.description} ${input.longDescription}`.toLowerCase(),
        imageLabel: input.imageLabel,
        categoryId: input.categoryId,
        archivedAt: null,
      },
    });

    await tx.inventoryItem.create({
      data: {
        productId: product.id,
        stockOnHand: input.stockOnHand,
        reservedStock: input.reservedStock,
        reorderPoint: input.reorderPoint,
        locationCode: input.locationCode,
      },
    });

    await tx.supplierProduct.create({
      data: {
        productId: product.id,
        supplierId: input.supplierId,
        supplierSku: input.sku,
        costMinor: input.costMinor,
        currency: 'GBP',
        leadTimeDays: 7,
      },
    });

    const imageInputs = [input.primaryImageUrl, input.galleryImageUrl]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((url, index) => ({
        productId: product.id,
        url,
        altText: `${input.name} image ${index + 1}`,
        imageType: index === 0 ? 'primary' : 'gallery',
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

export async function updateAdminProduct(id: string, input: ProductFormInput, db = prisma) {
  const slug = await resolveUniqueProductSlug(input.name, db, input.slug, id);

  const product = await db.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        sku: input.sku,
        slug,
        name: input.name,
        game: input.game,
        setName: input.setName || null,
        description: input.description,
        longDescription: input.longDescription,
        condition: input.condition as ProductCondition,
        priceMinor: input.priceMinor,
        currency: 'GBP',
        featured: input.featured,
        published: input.published,
        searchText: `${input.name} ${input.sku} ${input.game} ${input.description} ${input.longDescription}`.toLowerCase(),
        imageLabel: input.imageLabel,
        categoryId: input.categoryId,
      },
    });

    await tx.inventoryItem.upsert({
      where: { productId: id },
      create: {
        productId: id,
        stockOnHand: input.stockOnHand,
        reservedStock: input.reservedStock,
        reorderPoint: input.reorderPoint,
        locationCode: input.locationCode,
      },
      update: {
        stockOnHand: input.stockOnHand,
        reservedStock: input.reservedStock,
        reorderPoint: input.reorderPoint,
        locationCode: input.locationCode,
      },
    });

    await tx.supplierProduct.deleteMany({ where: { productId: id } });
    await tx.supplierProduct.create({
      data: {
        productId: id,
        supplierId: input.supplierId,
        supplierSku: input.sku,
        costMinor: input.costMinor,
        currency: 'GBP',
        leadTimeDays: 7,
      },
    });

    await tx.productImage.deleteMany({ where: { productId: id } });

    const imageInputs = [input.primaryImageUrl, input.galleryImageUrl]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((url, index) => ({
        productId: id,
        url,
        altText: `${input.name} image ${index + 1}`,
        imageType: index === 0 ? 'primary' : 'gallery',
        sortOrder: index,
        isPrimary: index === 0,
      }));

    if (imageInputs.length) {
      await tx.productImage.createMany({ data: imageInputs });
    }

    return updated;
  });

  await refreshProductPricing(product.id, db);
  return getAdminProductById(product.id, db);
}

export async function archiveAdminProduct(id: string, db = prisma) {
  await db.product.update({
    where: { id },
    data: {
      published: false,
      archivedAt: new Date(),
    },
  });
}

export async function setProductPublication(id: string, published: boolean, db = prisma) {
  const data: { published: boolean; archivedAt?: Date | null } = { published };

  if (published) {
    data.archivedAt = null;
  }

  await db.product.update({
    where: { id },
    data,
  });
}

export async function getAdminInventoryRows(db = prisma): Promise<AdminInventoryRow[]> {
  const rows = (await db.product.findMany({
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, orderBy: { leadTimeDays: 'asc' }, take: 1 },
    },
  })) as unknown as ProductRow[];

  return rows.map((product) => {
    const inventory = product.inventory ?? { stockOnHand: 0, reservedStock: 0, reorderPoint: 0, locationCode: 'MAIN' };
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
  const query: any = {
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { product: { select: { name: true } } },
  };

  if (productId) {
    query.where = { productId };
  }

  const rows = (await db.stockAdjustment.findMany(query)) as Array<{
    id: string;
    productId: string;
    delta: number;
    beforeStock: number;
    afterStock: number;
    reason: string;
    performedBy: string | null;
    createdAt: Date;
    product: { name: string };
  }>;

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

export async function adjustProductStock(productId: string, delta: number, reason: string, performedBy = 'Operations Desk', db = prisma) {
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

export async function getAdminSuppliers(filters: SupplierFilters = {}, db = prisma) {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy =
    filters.sort === 'name-desc'
      ? [{ name: 'desc' }]
      : filters.sort === 'recent'
        ? [{ createdAt: 'desc' }]
        : [{ name: 'asc' }];

  const totalItems = await db.supplier.count({ where: where as any });
  const pagination = resolvePagination(totalItems, page, pageSize);
  const rows = await db.supplier.findMany({
    where: where as any,
    orderBy: orderBy as any,
    take: pageSize,
    skip: (pagination.page - 1) * pageSize,
    include: {
      supplierProducts: { select: { id: true, productId: true, product: { select: { id: true, name: true, slug: true } } } },
    },
  });

  return {
    suppliers: rows.map((supplier) => mapSupplierRow(supplier as any)),
    pagination,
  };
}

export async function getAdminSupplierById(id: string, db = prisma): Promise<AdminSupplierDetail | null> {
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      supplierProducts: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!supplier) {
    return null;
  }

  return {
    ...mapSupplierRow(supplier as any),
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

export async function createAdminSupplier(input: SupplierFormInput, db = prisma) {
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

export async function updateAdminSupplier(id: string, input: SupplierFormInput, db = prisma) {
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

export async function getAdminOrders(filters: OrderFilters = {}, db = prisma) {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { shippingEmail: { contains: search, mode: 'insensitive' } },
      { shippingFullName: { contains: search, mode: 'insensitive' } },
      { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  const totalItems = await db.order.count({ where: where as any });
  const pagination = resolvePagination(totalItems, page, pageSize);

  const rows = (await db.order.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (pagination.page - 1) * pageSize,
    include: {
      items: { select: { quantity: true } },
      user: { select: { name: true, email: true } },
    },
  })) as unknown as OrderRow[];

  return {
    orders: rows.map(mapOrderRow),
    pagination,
  };
}

export async function getAdminOrderByNumber(orderNumber: string, db = prisma): Promise<AdminOrderDetail | null> {
  const order = (await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: { select: { id: true, productName: true, productSlug: true, quantity: true, unitPriceMinor: true, totalMinor: true } },
      shippingAddress: true,
      user: { select: { name: true, email: true } },
    },
  })) as unknown as OrderRow | null;

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
