import type {
  CatalogueCategory,
  CatalogueFilters,
  CatalogueProductImage,
  CatalogueProduct,
  CatalogueProductDetail,
  PaginationMeta,
} from '@tcg-hobby/types';
import { slugify } from '@tcg-hobby/utils';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { prisma } from './client';
import { hasFreeUkStandardShipping } from './commerce';
import {
  getStorefrontListingProductWhere,
  getStorefrontPublicProductWhere,
  isProductPubliclyRouteable,
  isProductVisibleInStorefrontListings,
} from './product-visibility';
import {
  seedCategories,
  seedInventory,
  seedProductImages,
  seedProducts,
  seedSuppliers,
  toCatalogueCategory,
  toCatalogueProduct,
  toCatalogueProductDetail,
} from './seed-data';

const catalogueProductInclude = {
  category: true,
  gameRef: true,
  brandRef: true,
  productTypeRef: true,
  languageRef: true,
  setRef: true,
  inventory: true,
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  supplierProducts: { include: { supplier: true }, take: 1 },
} as const satisfies Prisma.ProductInclude;

type CatalogueProductRow = Prisma.ProductGetPayload<{ include: typeof catalogueProductInclude }>;
type CatalogueProductImageRow = CatalogueProductRow['images'][number];

const catalogueCategoryInclude = {
  products: {
    where: getStorefrontListingProductWhere(),
    select: {
      id: true,
      published: true,
      lifecycleState: true,
      archivedAt: true,
      releaseStatus: true,
      hideWhenOutOfStock: true,
      inventory: { select: { stockOnHand: true, reservedStock: true } },
    },
  },
} as const satisfies Prisma.CategoryInclude;

type CatalogueCategoryRow = Prisma.CategoryGetPayload<{ include: typeof catalogueCategoryInclude }>;

export type CatalogueProductsResult = {
  products: CatalogueProduct[];
  pagination: PaginationMeta;
  categories: CatalogueCategory[];
  filters: CatalogueFilters;
};

export type CatalogueHomeData = {
  categories: CatalogueCategory[];
  featuredProducts: CatalogueProduct[];
};

function shouldBypassDatabase() {
  return process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE === 'seed';
}

function createCatalogueDatabaseError(reason: string) {
  return new Error(`Catalogue database query failed in production: ${reason}`);
}

function localPublicImageExists(url: string): boolean {
  if (!url.startsWith('/')) {
    return true;
  }

  const relativePath = url.replace(/^\/+/, '');
  const candidates = [
    join(process.cwd(), 'public', relativePath),
    join(process.cwd(), 'apps', 'storefront', 'public', relativePath),
  ];

  return candidates.some((path) => existsSync(path));
}

function resolveRenderableImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  return localPublicImageExists(url) ? url : null;
}

function normalizeSearch(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function slugToLegacyLabel(value: string): string {
  return value.replace(/-/g, ' ');
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
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  const heroImage = product.images.find((image) => image.imageType === 'hero') ?? null;
  const stockOnHand = inventory?.stockOnHand ?? 0;
  const reservedStock = inventory?.reservedStock ?? 0;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brandRef?.name ?? product.brand,
    game: product.gameRef?.name ?? product.game,
    productType: product.productTypeRef?.name ?? product.productType,
    description: product.description,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    price: { amountMinor: product.priceMinor, currency: product.currency as CatalogueProduct['price']['currency'] },
    featured: product.featured,
    homepagePriority: product.homepagePriority,
    heroFeatured: product.heroFeatured,
    lifecycleState: product.lifecycleState,
    inStock: stockOnHand - reservedStock > 0,
    stockOnHand,
    reservedStock,
    supplierName: supplier?.name ?? 'Unassigned',
    badge: product.featured ? 'Featured' : product.releaseStatus !== 'RELEASED' ? product.releaseStatus.replace('_', ' ') : product.category.name,
    imageLabel: product.imageLabel,
    imageUrl: resolveRenderableImageUrl(primaryImage?.url),
    imageAlt: primaryImage?.altText ?? null,
    heroImageUrl: resolveRenderableImageUrl(heroImage?.url),
    vatRate: product.vatRate,
    freeUkStandardShipping: product.freeUkStandardShipping || hasFreeUkStandardShipping(product.slug),
    shippingPromotionProductOnly: product.shippingPromotionProductOnly,
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
    seoTitle: product.seoTitle,
    metaDescription: product.metaDescription,
    canonicalUrl: product.canonicalUrl,
    ogImageUrl: product.ogImageUrl,
    noindex: product.noindex,
  };
}

function mapCatalogueProductImageRow(image: CatalogueProductImageRow): CatalogueProductImage | null {
  const url = resolveRenderableImageUrl(image.url);

  if (!url) {
    return null;
  }

  return {
    id: image.id,
    url,
    altText: image.altText,
    imageType: image.imageType,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
  };
}

function mapSeedProductImages(productSlug: string): CatalogueProductImage[] {
  return seedProductImages
    .filter((image) => image.productSlug === productSlug)
    .map((image) => {
      const url = resolveRenderableImageUrl(image.url);

      if (!url) {
        return null;
      }

      return {
        id: image.id,
        url,
        altText: image.altText,
        imageType: image.imageType,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      };
    })
    .filter((image): image is CatalogueProductImage => image !== null);
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
  const selectedGame = normalizeSearch(filters.game);
  const selectedProductType = normalizeSearch(filters.productType);
  const selectedSet = normalizeSearch(filters.set);
  const selectedLanguage = normalizeSearch(filters.language);

  const results = seedProducts
    .filter((product) => product.published && (product.lifecycleState ?? 'PUBLISHED') === 'PUBLISHED' && product.releaseStatus !== 'ARCHIVED')
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
    .filter((product) => {
      if (!selectedGame) return true;
      return normalizeSearch(product.game) === selectedGame || slugify(product.game) === selectedGame;
    })
    .filter((product) => {
      if (!selectedProductType) return true;
      return false;
    })
    .filter((product) => {
      if (!selectedSet) return true;
      return normalizeSearch(product.setName) === selectedSet || slugify(product.setName ?? '') === selectedSet;
    })
    .filter((product) => {
      if (!selectedLanguage) return true;
      return false;
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
    const primaryImage = seedProductImages.find((image) => image.productSlug === product.slug && image.isPrimary) ?? seedProductImages.find((image) => image.productSlug === product.slug) ?? null;
    const heroImage = seedProductImages.find((image) => image.productSlug === product.slug && image.imageType === 'hero') ?? null;

    if (!inventory || !category || !supplier) {
      throw new Error(`Incomplete seed data for product ${product.slug}`);
    }

    return {
      ...toCatalogueProduct(product, inventory, category, supplier),
      imageUrl: resolveRenderableImageUrl(primaryImage?.url),
      imageAlt: primaryImage?.altText ?? null,
      heroImageUrl: resolveRenderableImageUrl(heroImage?.url),
    };
  });
}

function buildCatalogueProductWhere(filters: CatalogueFilters): Prisma.ProductWhereInput {
  const clauses: Prisma.ProductWhereInput[] = [getStorefrontListingProductWhere()];

  if (filters.search) {
    clauses.push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { longDescription: { contains: filters.search, mode: 'insensitive' } },
        { searchText: { contains: filters.search, mode: 'insensitive' } },
        { game: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.category) {
    clauses.push({ category: { is: { slug: filters.category } } });
  }

  if (filters.game) {
    clauses.push({
      OR: [
        { gameRef: { is: { slug: filters.game } } },
        { game: { equals: filters.game, mode: 'insensitive' } },
        { game: { contains: slugToLegacyLabel(filters.game), mode: 'insensitive' } },
      ],
    });
  }

  if (filters.productType) {
    clauses.push({
      OR: [
        { productTypeRef: { is: { slug: filters.productType } } },
        { productType: { equals: filters.productType, mode: 'insensitive' } },
        { productType: { contains: slugToLegacyLabel(filters.productType), mode: 'insensitive' } },
      ],
    });
  }

  if (filters.set) {
    clauses.push({
      OR: [
        { setRef: { is: { slug: filters.set } } },
        { setName: { equals: filters.set, mode: 'insensitive' } },
        { setName: { contains: slugToLegacyLabel(filters.set), mode: 'insensitive' } },
      ],
    });
  }

  if (filters.language) {
    clauses.push({ OR: [{ languageRef: { is: { code: filters.language } } }, { language: { equals: filters.language, mode: 'insensitive' } }] });
  }

  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}

function filterVisibleCatalogueRows(rows: CatalogueProductRow[]): CatalogueProductRow[] {
  return rows.filter(isProductVisibleInStorefrontListings);
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
    imageUrl: resolveRenderableImageUrl(seedProductImages.find((image) => image.productSlug === product.slug && image.isPrimary)?.url),
    heroImageUrl: resolveRenderableImageUrl(seedProductImages.find((image) => image.productSlug === product.slug && image.imageType === 'hero')?.url),
    images: mapSeedProductImages(product.slug),
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
  const where = buildCatalogueProductWhere(filters);

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    filters.sort === 'price-desc'
      ? [{ featured: 'desc' }, { priceMinor: 'desc' }]
      : filters.sort === 'price-asc'
        ? [{ featured: 'desc' }, { priceMinor: 'asc' }]
        : filters.sort === 'newest'
          ? [{ featured: 'desc' }, { createdAt: 'desc' }]
          : filters.sort === 'featured'
            ? [{ featured: 'desc' }, { homepagePriority: 'asc' }, { name: 'asc' }, { createdAt: 'desc' }]
            : [{ featured: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }];

  const rows = await prisma.product.findMany({
    where,
    orderBy,
    include: catalogueProductInclude,
  });

  const visibleRows = filterVisibleCatalogueRows(rows);
  const start = options.skip ?? 0;
  const end = options.take !== undefined ? start + options.take : undefined;

  return visibleRows.slice(start, end).map(mapCatalogueProductRow);
}

async function getProductDetailFromDatabase(slug: string): Promise<CatalogueProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: catalogueProductInclude,
  });

  if (!product || !isProductPubliclyRouteable(product)) {
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
  ).catch(() => []);

  return {
    ...mapCatalogueProductRow(product),
    longDescription: product.longDescription,
    sku: product.sku,
    barcode: product.barcode,
    setName: product.setRef?.name ?? product.setName,
    language: product.languageRef?.name ?? product.language,
    condition: product.condition as CatalogueProductDetail['condition'],
    searchText: product.searchText,
    supplierSku: product.supplierProducts[0]?.supplierSku ?? '',
    leadTimeDays: product.supplierProducts[0]?.leadTimeDays ?? 0,
    images: product.images.map(mapCatalogueProductImageRow).filter((image): image is CatalogueProductImage => image !== null),
    relatedProducts: related.filter((item) => item.slug !== slug).slice(0, 4),
  };
}

async function getProductDetailFromDatabaseById(id: string): Promise<CatalogueProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: catalogueProductInclude,
  });

  if (!product || !isProductPubliclyRouteable(product)) {
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
  ).catch(() => []);

  return {
    ...mapCatalogueProductRow(product),
    longDescription: product.longDescription,
    sku: product.sku,
    barcode: product.barcode,
    setName: product.setRef?.name ?? product.setName,
    language: product.languageRef?.name ?? product.language,
    condition: product.condition as CatalogueProductDetail['condition'],
    searchText: product.searchText,
    supplierSku: product.supplierProducts[0]?.supplierSku ?? '',
    leadTimeDays: product.supplierProducts[0]?.leadTimeDays ?? 0,
    images: product.images.map(mapCatalogueProductImageRow).filter((image): image is CatalogueProductImage => image !== null),
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
    const rows = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: catalogueCategoryInclude,
    });

    return rows.map((category: CatalogueCategoryRow) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      productCount: category.products.filter(isProductVisibleInStorefrontListings).length,
    }));
  } catch (error) {
    throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'categories are unavailable');
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
  } catch (error) {
    throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'featured products are unavailable');
  }
}

export async function getCatalogueProducts(filters: CatalogueFilters): Promise<CatalogueProductsResult> {
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
    const where = buildCatalogueProductWhere(filters);

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      filters.sort === 'price-desc'
        ? [{ featured: 'desc' }, { priceMinor: 'desc' }]
        : filters.sort === 'price-asc'
          ? [{ featured: 'desc' }, { priceMinor: 'asc' }]
          : filters.sort === 'newest'
            ? [{ featured: 'desc' }, { createdAt: 'desc' }]
            : [{ featured: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }];

    const rows = await prisma.product.findMany({
      where,
      orderBy,
      include: catalogueProductInclude,
    });
    const visibleRows = filterVisibleCatalogueRows(rows);
    const totalItems = visibleRows.length;
    const pagination = resolvePagination(totalItems, page, pageSize);
    const offset = (pagination.page - 1) * pageSize;

    return {
      products: visibleRows.slice(offset, offset + pageSize).map(mapCatalogueProductRow),
      pagination,
      categories: await getCatalogueCategories(),
      filters: { ...filters, page: pagination.page, pageSize },
    };
  } catch (error) {
    throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'unknown error');
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
    throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'product lookup failed');
  }

  return null;
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
    throw createCatalogueDatabaseError(error instanceof Error ? error.message : 'product lookup failed');
  }

  return null;
}

export async function getCatalogueHomeData(): Promise<CatalogueHomeData> {
  const [categories, featuredProducts] = await Promise.all([getCatalogueCategories(), getFeaturedCatalogueProducts(4)]);

  return {
    categories,
    featuredProducts,
  };
}
