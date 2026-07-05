import type {
  CatalogueCategory,
  CatalogueFilters,
  CatalogueProduct,
  CatalogueProductDetail,
  PaginationMeta,
} from '@tcg-hobby/types';
import { prisma } from './client';
import {
  seedCategories,
  seedInventory,
  seedProducts,
  seedSuppliers,
  toCatalogueCategory,
  toCatalogueProduct,
  toCatalogueProductDetail,
} from './seed-data';

type ProductCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
};

type ProductInventoryRow = {
  stockOnHand: number;
  reservedStock: number;
};

type SupplierRow = {
  name: string;
};

type CatalogueProductRow = {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string;
  longDescription: string;
  sku: string;
  setName: string | null;
  condition: CatalogueProductDetail['condition'];
  priceMinor: number;
  currency: CatalogueProduct['price']['currency'];
  featured: boolean;
  imageLabel: string;
  searchText: string;
  category: ProductCategoryRow;
  inventory: ProductInventoryRow | null;
  supplierProducts: Array<{
    supplier: SupplierRow;
    supplierSku: string;
    leadTimeDays: number;
  }>;
  releaseStatus: 'RELEASED' | 'PREORDER' | 'COMING_SOON' | 'ARCHIVED';
  releaseDate: Date | null;
  expectedDispatchAt: Date | null;
  expectedArrivalAt: Date | null;
  allocationLimit: number | null;
  customerPurchaseLimit: number | null;
  supplierAllocation: number | null;
  lowAllocationThreshold: number | null;
  availabilityMessage: string | null;
  preorderBadgeLabel: string | null;
  comingSoonBadgeLabel: string | null;
};

type CatalogueCategoryRow = ProductCategoryRow & {
  products: Array<{ id: string }>;
};

function canUseSeedFallback() {
  return process.env.NODE_ENV !== 'production';
}

function shouldBypassDatabase() {
  return process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE === 'seed';
}

function createCatalogueDatabaseError(reason: string) {
  return new Error(`Catalogue database query failed in production: ${reason}`);
}

function normalizeSearch(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function resolvePagination(totalItems: number, page: number, pageSize: number): PaginationMeta {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

function mapCatalogueProductRow(product: CatalogueProductRow): CatalogueProduct {
  const supplier = product.supplierProducts[0]?.supplier;
  const inventory = product.inventory;

  if (!inventory || !supplier) {
    throw new Error(`Database seed incomplete for product ${product.slug}`);
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    game: product.game,
    description: product.description,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    price: { amountMinor: product.priceMinor, currency: product.currency as CatalogueProduct['price']['currency'] },
    featured: product.featured,
    inStock: inventory.stockOnHand - inventory.reservedStock > 0,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    supplierName: supplier.name,
    badge: product.featured ? 'Featured' : product.releaseStatus !== 'RELEASED' ? product.releaseStatus.replace('_', ' ') : product.category.name,
    imageLabel: product.imageLabel,
    releaseStatus: product.releaseStatus,
    releaseDate: product.releaseDate?.toISOString() ?? null,
    expectedDispatchAt: product.expectedDispatchAt?.toISOString() ?? null,
    expectedArrivalAt: product.expectedArrivalAt?.toISOString() ?? null,
    allocationLimit: product.allocationLimit,
    customerPurchaseLimit: product.customerPurchaseLimit,
    supplierAllocation: product.supplierAllocation,
    lowAllocationThreshold: product.lowAllocationThreshold,
    availabilityMessage: product.availabilityMessage,
    preorderBadgeLabel: product.preorderBadgeLabel,
    comingSoonBadgeLabel: product.comingSoonBadgeLabel,
  };
}

function getSeedCategoryBySlug(slug: string) {
  return seedCategories.find((category) => category.slug === slug) ?? null;
}

function getSeedSupplierBySlug(slug: string) {
  return seedSuppliers.find((supplier) => supplier.slug === slug) ?? null;
}

function getSeedInventoryByProductSlug(productSlug: string) {
  return seedInventory.find((inventory) => inventory.productSlug === productSlug) ?? null;
}

function getSeedProductBySlug(slug: string) {
  return seedProducts.find((product) => product.slug === slug) ?? null;
}

function getSeedProductById(id: string) {
  return seedProducts.find((product) => product.id === id) ?? null;
}

function seedProductsToCatalogue(filters: CatalogueFilters): CatalogueProduct[] {
  const query = normalizeSearch(filters.search);
  const selectedCategory = normalizeSearch(filters.category);

  const results = seedProducts
    .filter((product) => product.published)
    .filter((product) => {
      if (!query) {
        return true;
      }

      return product.searchText.includes(query) || product.name.toLowerCase().includes(query) || product.description.toLowerCase().includes(query);
    })
    .filter((product) => {
      if (!selectedCategory) {
        return true;
      }

      const category = getSeedCategoryBySlug(product.categorySlug);
      return category?.slug === selectedCategory;
    })
    .sort((a, b) => {
      if (filters.sort === 'price-desc') return b.priceMinor - a.priceMinor;
      if (filters.sort === 'price-asc') return a.priceMinor - b.priceMinor;
      if (filters.sort === 'newest') return b.id.localeCompare(a.id);
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return results.map((product) => {
    const inventory = getSeedInventoryByProductSlug(product.slug);
    const category = getSeedCategoryBySlug(product.categorySlug);
    const supplier = getSeedSupplierBySlug(product.supplierSlug);

    if (!inventory || !category || !supplier) {
      throw new Error(`Incomplete seed data for product ${product.slug}`);
    }

    return toCatalogueProduct(product, inventory, category, supplier);
  });
}

function seedProductsToDetail(slug: string): CatalogueProductDetail | null {
  const product = getSeedProductBySlug(slug);
  if (!product) {
    return null;
  }

  const inventory = getSeedInventoryByProductSlug(product.slug);
  const category = getSeedCategoryBySlug(product.categorySlug);
  const supplier = getSeedSupplierBySlug(product.supplierSlug);

  if (!inventory || !category || !supplier) {
    return null;
  }

  const relatedProducts = seedProductsToCatalogue({
    search: '',
    category: product.categorySlug,
    sort: 'featured',
    page: 1,
    pageSize: 4,
  })
    .filter((item) => item.slug !== slug)
    .slice(0, 4);

  return {
    ...toCatalogueProductDetail(product, inventory, category, supplier),
    relatedProducts,
  };
}

function seedProductToDetailById(id: string): CatalogueProductDetail | null {
  const product = getSeedProductById(id);
  if (!product) {
    return null;
  }

  return seedProductsToDetail(product.slug);
}

async function getProductsFromDatabase(
  filters: CatalogueFilters,
  options: { take?: number; skip?: number } = {},
): Promise<CatalogueProduct[]> {
  const where: any = {
    published: true,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { longDescription: { contains: filters.search, mode: 'insensitive' } },
      { searchText: { contains: filters.search, mode: 'insensitive' } },
      { game: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.category) {
    where.category = { is: { slug: filters.category } };
  }

  const orderBy: any[] =
    filters.sort === 'price-desc'
      ? [{ featured: 'desc' }, { priceMinor: 'desc' }]
      : filters.sort === 'price-asc'
        ? [{ featured: 'desc' }, { priceMinor: 'asc' }]
        : filters.sort === 'newest'
          ? [{ featured: 'desc' }, { createdAt: 'desc' }]
          : [{ featured: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }];

  const query: any = {
    where,
    orderBy,
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, take: 1 },
    },
  };

  if (options.take !== undefined) {
    query.take = options.take;
  }

  if (options.skip !== undefined) {
    query.skip = options.skip;
  }

  const rows = (await prisma.product.findMany(query)) as unknown as CatalogueProductRow[];

  return rows.map(mapCatalogueProductRow);
}

async function getProductDetailFromDatabase(slug: string): Promise<CatalogueProductDetail | null> {
  const product = (await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, take: 1 },
    },
  })) as unknown as CatalogueProductRow | null;

  if (!product || !product.inventory || !product.supplierProducts[0]?.supplier) {
    return null;
  }

  const related = await getProductsFromDatabase(
    {
      search: '',
      category: product.category.slug,
      sort: 'featured',
      page: 1,
      pageSize: 4,
    },
    { take: 4 },
  );

  return {
    ...mapCatalogueProductRow(product),
    longDescription: product.longDescription,
    sku: product.sku,
    setName: product.setName,
    condition: product.condition as CatalogueProductDetail['condition'],
    searchText: product.searchText,
    supplierSku: product.supplierProducts[0].supplierSku,
    leadTimeDays: product.supplierProducts[0].leadTimeDays,
    relatedProducts: related.filter((item) => item.slug !== slug).slice(0, 4),
  };
}

async function getProductDetailFromDatabaseById(id: string): Promise<CatalogueProductDetail | null> {
  const product = (await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, take: 1 },
    },
  })) as unknown as CatalogueProductRow | null;

  if (!product || !product.inventory || !product.supplierProducts[0]?.supplier) {
    return null;
  }

  const related = await getProductsFromDatabase(
    {
      search: '',
      category: product.category.slug,
      sort: 'featured',
      page: 1,
      pageSize: 4,
    },
    { take: 4 },
  );

  return {
    ...mapCatalogueProductRow(product),
    longDescription: product.longDescription,
    sku: product.sku,
    setName: product.setName,
    condition: product.condition as CatalogueProductDetail['condition'],
    searchText: product.searchText,
    supplierSku: product.supplierProducts[0].supplierSku,
    leadTimeDays: product.supplierProducts[0].leadTimeDays,
    relatedProducts: related.filter((item) => item.slug !== product.slug).slice(0, 4),
  };
}

export async function getCatalogueCategories(): Promise<CatalogueCategory[]> {
  if (shouldBypassDatabase()) {
    return seedCategories
      .map((category) => ({
        ...toCatalogueCategory(category),
        productCount: seedProducts.filter((product) => product.categorySlug === category.slug && product.published).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  try {
    const rows = (await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { products: { where: { published: true }, select: { id: true } } },
    })) as CatalogueCategoryRow[];

    return rows.map((category: CatalogueCategoryRow) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      productCount: category.products.length,
    }));
  } catch {
    if (!canUseSeedFallback()) {
      throw createCatalogueDatabaseError('categories are unavailable');
    }

    return seedCategories
      .map((category) => ({
        ...toCatalogueCategory(category),
        productCount: seedProducts.filter((product) => product.categorySlug === category.slug && product.published).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export async function getFeaturedCatalogueProducts(limit = 4): Promise<CatalogueProduct[]> {
  if (shouldBypassDatabase()) {
    return seedProductsToCatalogue({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: limit,
    }).slice(0, limit);
  }

  const filters: CatalogueFilters = {
    search: '',
    category: '',
    sort: 'featured',
    page: 1,
    pageSize: limit,
  };

  try {
    return await getProductsFromDatabase(filters, { take: limit });
  } catch {
    if (!canUseSeedFallback()) {
      throw createCatalogueDatabaseError('featured products are unavailable');
    }

    return seedProductsToCatalogue(filters).slice(0, limit);
  }
}

export async function getCatalogueProducts(filters: CatalogueFilters) {
  const page = Math.max(filters.page, 1);
  const pageSize = Math.max(filters.pageSize, 1);

  if (shouldBypassDatabase()) {
    const rows = seedProductsToCatalogue(filters);
    const totalItems = rows.length;
    const pagination = resolvePagination(totalItems, page, pageSize);
    const offset = (pagination.page - 1) * pageSize;
    return {
      products: rows.slice(offset, offset + pageSize),
      pagination,
      categories: seedCategories
        .map((category) => ({
          ...toCatalogueCategory(category),
          productCount: seedProducts.filter((product) => product.categorySlug === category.slug && product.published).length,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      filters: { ...filters, page: pagination.page, pageSize },
    };
  }

  try {
    const where: any = {
      published: true,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { longDescription: { contains: filters.search, mode: 'insensitive' } },
        { searchText: { contains: filters.search, mode: 'insensitive' } },
        { game: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = { is: { slug: filters.category } };
    }

    const orderBy: any[] =
      filters.sort === 'price-desc'
        ? [{ featured: 'desc' }, { priceMinor: 'desc' }]
        : filters.sort === 'price-asc'
          ? [{ featured: 'desc' }, { priceMinor: 'asc' }]
          : filters.sort === 'newest'
            ? [{ featured: 'desc' }, { createdAt: 'desc' }]
            : [{ featured: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }];

    const totalItems = await prisma.product.count({ where });
    const pagination = resolvePagination(totalItems, page, pageSize);
    const rows = (await prisma.product.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (pagination.page - 1) * pageSize,
      include: {
        category: true,
        inventory: true,
        supplierProducts: { include: { supplier: true }, take: 1 },
      },
    })) as CatalogueProductRow[];

    return {
      products: rows.map(mapCatalogueProductRow),
      pagination,
      categories: await getCatalogueCategories(),
      filters: { ...filters, page: pagination.page, pageSize },
    };
  } catch (error) {
    if (!canUseSeedFallback()) {
      throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'unknown error');
    }

    const rows = seedProductsToCatalogue(filters);
    const totalItems = rows.length;
    const pagination = resolvePagination(totalItems, page, pageSize);
    const offset = (pagination.page - 1) * pageSize;
    return {
      products: rows.slice(offset, offset + pageSize),
      pagination,
      categories: seedCategories
        .map((category) => ({
          ...toCatalogueCategory(category),
          productCount: seedProducts.filter((product) => product.categorySlug === category.slug && product.published).length,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      filters: { ...filters, page: pagination.page, pageSize },
    };
  }
}

export async function getCatalogueProductBySlug(slug: string): Promise<CatalogueProductDetail | null> {
  if (shouldBypassDatabase()) {
    return seedProductsToDetail(slug);
  }

  try {
    const product = await getProductDetailFromDatabase(slug);
    if (product) {
      return product;
    }

    return null;
  } catch (error) {
    if (!canUseSeedFallback()) {
      throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'product lookup failed');
    }

    // Fall through to seeded data.
  }

  return seedProductsToDetail(slug);
}

export async function getCatalogueProductById(id: string): Promise<CatalogueProductDetail | null> {
  if (shouldBypassDatabase()) {
    return seedProductToDetailById(id);
  }

  try {
    const product = await getProductDetailFromDatabaseById(id);
    if (product) {
      return product;
    }

    return null;
  } catch (error) {
    if (!canUseSeedFallback()) {
      throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'product lookup failed');
    }
  }

  return seedProductToDetailById(id);
}

export async function getCatalogueHomeData() {
  const [categories, featuredProducts] = await Promise.all([getCatalogueCategories(), getFeaturedCatalogueProducts(4)]);

  return {
    categories,
    featuredProducts,
  };
}
