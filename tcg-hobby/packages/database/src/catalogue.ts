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
};

type CatalogueCategoryRow = ProductCategoryRow & {
  products: Array<{ id: string }>;
};

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

  return toCatalogueProductDetail(product, inventory, category, supplier);
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

  const rows = (await prisma.product.findMany({
    where,
    orderBy,
    take: options.take,
    skip: options.skip,
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, take: 1 },
    },
  })) as CatalogueProductRow[];

  return rows.map((product: CatalogueProductRow) => {
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
      badge: product.featured ? 'Featured' : product.category.name,
      imageLabel: product.imageLabel,
    };
  });
}

async function getProductDetailFromDatabase(slug: string): Promise<CatalogueProductDetail | null> {
  const product = (await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, take: 1 },
    },
  })) as CatalogueProductRow | null;

  if (!product || !product.inventory || !product.supplierProducts[0]?.supplier) {
    return null;
  }

  const supplier = product.supplierProducts[0].supplier;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    game: product.game,
    description: product.description,
    longDescription: product.longDescription,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    price: { amountMinor: product.priceMinor, currency: product.currency as CatalogueProductDetail['price']['currency'] },
    featured: product.featured,
    inStock: product.inventory.stockOnHand - product.inventory.reservedStock > 0,
    stockOnHand: product.inventory.stockOnHand,
    reservedStock: product.inventory.reservedStock,
    supplierName: supplier.name,
    badge: product.featured ? 'Featured' : product.category.name,
    imageLabel: product.imageLabel,
    sku: product.sku,
    setName: product.setName,
    condition: product.condition as CatalogueProductDetail['condition'],
    searchText: product.searchText,
    supplierSku: product.supplierProducts[0].supplierSku,
    leadTimeDays: product.supplierProducts[0].leadTimeDays,
    relatedProductIds: [],
  };
}

export async function getCatalogueCategories(): Promise<CatalogueCategory[]> {
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
    return seedCategories
      .map((category) => ({
        ...toCatalogueCategory(category),
        productCount: seedProducts.filter((product) => product.categorySlug === category.slug && product.published).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export async function getFeaturedCatalogueProducts(limit = 4): Promise<CatalogueProduct[]> {
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
    return seedProductsToCatalogue(filters).slice(0, limit);
  }
}

export async function getCatalogueProducts(filters: CatalogueFilters) {
  const page = Math.max(filters.page, 1);
  const pageSize = Math.max(filters.pageSize, 1);

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
      products: rows.map((product: CatalogueProductRow) => {
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
          badge: product.featured ? 'Featured' : product.category.name,
          imageLabel: product.imageLabel,
        };
      }),
      pagination,
      categories: await getCatalogueCategories(),
      filters: { ...filters, page: pagination.page, pageSize },
    };
  } catch {
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
  try {
    const product = await getProductDetailFromDatabase(slug);
    if (product) {
      const related = (await prisma.product.findMany({
        where: {
          published: true,
          category: { is: { slug: product.categorySlug } },
          NOT: { slug },
        },
        take: 3,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: true,
          inventory: true,
          supplierProducts: { include: { supplier: true }, take: 1 },
        },
      })) as CatalogueProductRow[];

      return {
        ...product,
        relatedProductIds: related.map((row: CatalogueProductRow) => row.id),
      };
    }
  } catch {
    // Fall through to seeded data.
  }

  return seedProductsToDetail(slug);
}

export async function getCatalogueHomeData() {
  const [categories, featuredProducts] = await Promise.all([getCatalogueCategories(), getFeaturedCatalogueProducts(4)]);

  return {
    categories,
    featuredProducts,
  };
}
