import type {
  CatalogueCategory,
  CatalogueFilters,
  CatalogueProduct,
  CatalogueProductDetail,
  CatalogueProductImage,
  PaginationMeta,
  PublicHomepagePlacement,
} from '@tcg-hobby/types';
import type { Prisma } from '@prisma/client';
import { getIronSprueAdminPrisma } from './client.js';
import {
  IRON_SPRUE_STORE_CODE,
  getIronSprueProductReadiness,
  ironSpruePublicProductWhere,
  isIronSprueDisplayableImageAsset,
  isIronSprueOperationalMediaRole,
  resolveIronSpruePublicMediaUrl,
  selectIronSpruePrimaryCatalogueMedia,
} from './iron-sprue-admin.js';
import { resolveIronSprueStorefrontMediaUrl } from './iron-sprue-media.js';

type DatabaseClient = ReturnType<typeof getIronSprueAdminPrisma>;

export type IronSprueCatalogueFilters = CatalogueFilters & {
  brand?: string;
};

export type IronSprueCatalogueProductsResult = {
  products: CatalogueProduct[];
  pagination: PaginationMeta;
  categories: CatalogueCategory[];
  filters: IronSprueCatalogueFilters;
};

export type IronSprueCatalogueHomeData = {
  categories: CatalogueCategory[];
  featuredProducts: CatalogueProduct[];
  homepagePlacements: PublicHomepagePlacement[];
};

const productInclude = {
  brand: true,
  category: true,
  supplier: true,
  inventory: true,
  contentReviews: true,
  mediaAssets: {
    where: { approvalState: 'APPROVED' },
    orderBy: [
      { isPrimary: 'desc' },
      { sortOrder: 'asc' },
      { id: 'asc' },
    ],
  },
} as const satisfies Prisma.IronSprueAdminProductInclude;

type IronSprueCatalogueProductRow = Prisma.IronSprueAdminProductGetPayload<{
  include: typeof productInclude;
}>;

type IronSprueMediaAssetRow = IronSprueCatalogueProductRow['mediaAssets'][number];

const publicProductWhere = ironSpruePublicProductWhere();
const insensitive = 'insensitive' as const;

function normalizeSearch(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function slugLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

function mediaUrl(asset: IronSprueMediaAssetRow | null | undefined): string | null {
  if (!isIronSprueDisplayableImageAsset(asset)) return null;
  return resolveIronSprueStorefrontMediaUrl(
    resolveIronSpruePublicMediaUrl(asset),
    process.env.PUBLIC_STOREFRONT_URL ?? process.env.IRON_SPRUE_SITE_URL ?? process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL,
  );
}

const INTERNAL_COPY_PHRASES = [
  'catalogue-confirmed details',
  'confirmed catalogue',
  'confirmed catalogue role',
  'confirmed source fields',
  'catalogue currently confirms',
  'catalogue identity',
  'catalogue role',
  'catalogue title',
  'current verified catalogue',
  'verified catalogue fields',
  'verified catalogue title',
  'verified source',
  'verified source data',
  'verified product source',
  'verified iron sprue source data',
  'intentionally omitted until',
  'omitted unless present',
  'launch range',
  'not listed unless they are present',
  'not stated in the current verified',
  'product packaging or manufacturer data is reviewed',
  'manufacturer packaging for application and safety guidance',
  'built from the launch catalogue',
  'associated supplier or manufacturer source material',
  'source material already captured',
  'source fields',
  'launch stock record',
  'has been kept tied to',
  'needs verification',
  'requires verification',
  'supplier code',
  'unsupported claim',
  'source provenance',
  'reconciliation',
  'internal review',
  'admin-only',
] as const;

function isInternalProductCopyBlock(value: string) {
  const normalized = value.trim().toLowerCase();
  return INTERNAL_COPY_PHRASES.some((phrase) => normalized.includes(phrase));
}

function sanitizePublicProductParagraph(value: string) {
  if (isInternalProductCopyBlock(value)) {
    return value
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .filter((sentence) => !isInternalProductCopyBlock(sentence))
      .join(' ')
      .trim();
  }

  return value.trim();
}

export function sanitizePublicProductCopy(value: string | null | undefined) {
  const paragraphs = String(value ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(sanitizePublicProductParagraph)
    .filter(Boolean);

  return paragraphs.join('\n\n').trim();
}

export function sanitizePublicProductList(values: string[] | null | undefined) {
  return (values ?? [])
    .map((value) => sanitizePublicProductCopy(value))
    .filter((value) => value.length > 0);
}

function publicSpecifications(product: IronSprueCatalogueProductRow): Record<string, string> {
  const internalSpecificationKeys = new Set([
    'adminSourceReference',
    'catalogueReference',
    'manufacturerReference',
    'sourceReference',
    'supplierCode',
    'supplierReference',
    'supplierSku',
  ]);
  const entries: Array<[string, unknown]> = [
    ['manufacturer', product.brand?.name],
    ['category', product.category?.name],
    ['productType', product.buildType ?? product.category?.name],
    ['scale', product.scale],
    ['buildLevel', product.difficulty],
    ['material', product.material],
    ['dimensions', product.dimensions],
    ['assemblyMethod', product.assemblyMethod],
    ['glueRequirement', product.glueRequirement],
    ['contents', product.contents],
  ];
  const structured = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications)
    ? Object.entries(product.specifications)
    : [];

  return [...structured, ...entries].reduce<Record<string, string>>((result, [key, value]) => {
    if (internalSpecificationKeys.has(key)) return result;
    const text = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value).trim()
      : '';
    if (text && !isInternalProductCopyBlock(text)) result[key] = text;
    return result;
  }, {});
}

function publicShortDescription(product: IronSprueCatalogueProductRow) {
  return sanitizePublicProductCopy(product.shortDescription) || sanitizePublicProductCopy(product.fullDescription);
}

function publicLongDescription(product: IronSprueCatalogueProductRow) {
  const shortDescription = sanitizePublicProductCopy(product.shortDescription);
  const fullDescription = sanitizePublicProductCopy(product.fullDescription);
  if (!shortDescription) return fullDescription;
  if (!fullDescription) return shortDescription;
  if (fullDescription.toLowerCase().includes(shortDescription.toLowerCase())) return fullDescription;
  return `${shortDescription}\n\n${fullDescription}`;
}

function preferredMedia(product: IronSprueCatalogueProductRow): { asset: IronSprueMediaAssetRow; url: string } | null {
  const canonicalPrimary = selectIronSpruePrimaryCatalogueMedia(product);
  if (canonicalPrimary) return canonicalPrimary;
  const roleScore = (role: string) => {
    const normalized = role.toLowerCase().replace(/_/g, '-');
    if (normalized === 'catalogue-primary') return 0;
    if (normalized === 'manufacturer-original') return 1;
    if (normalized === 'workshop-photography') return 2;
    return 3;
  };

  return [...product.mediaAssets]
    .map((asset) => ({ asset, url: mediaUrl(asset) }))
    .filter((item): item is { asset: IronSprueMediaAssetRow; url: string } => (
      Boolean(item.url)
      && item.asset.approvalState === 'APPROVED'
      && isIronSprueOperationalMediaRole(item.asset.role)
    ))
    .sort((left, right) =>
      roleScore(left.asset.role) - roleScore(right.asset.role)
      || Number(right.asset.isPrimary) - Number(left.asset.isPrimary)
      || left.asset.sortOrder - right.asset.sortOrder
      || left.asset.id.localeCompare(right.asset.id),
    )[0] ?? null;
}

function mapImage(asset: IronSprueMediaAssetRow, product: IronSprueCatalogueProductRow): CatalogueProductImage | null {
  if (asset.approvalState !== 'APPROVED' || !isIronSprueOperationalMediaRole(asset.role)) return null;
  const url = mediaUrl(asset);
  if (!url) return null;
  return {
    id: asset.id,
    url,
    altText: asset.altText?.trim() || product.customerTitle,
    imageType: asset.role,
    sortOrder: asset.sortOrder,
    isPrimary: asset.isPrimary,
  };
}

function stockOnHand(product: IronSprueCatalogueProductRow) {
  return product.inventory?.availableStock ?? 0;
}

function reservedStock(product: IronSprueCatalogueProductRow) {
  return product.inventory?.reservedStock ?? 0;
}

function mapProduct(product: IronSprueCatalogueProductRow): CatalogueProduct {
  const image = preferredMedia(product);
  const categoryName = product.category?.name ?? 'Iron Sprue Catalogue';
  const categorySlug = product.category?.slug ?? 'catalogue';
  const brandName = product.brand?.name ?? null;
  const productType = product.buildType ?? categoryName;
  const availableStock = stockOnHand(product);
  const reserved = reservedStock(product);
  const specifications = publicSpecifications(product);

  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.customerTitle,
    brand: brandName,
    game: 'Iron Sprue',
    productType,
    description: publicShortDescription(product),
    categoryName,
    categorySlug,
    price: {
      amountMinor: product.grossPriceMinor ?? 0,
      currency: product.currency as CatalogueProduct['price']['currency'],
    },
    featured: product.featured,
    homepagePriority: product.featured ? 0 : null,
    heroFeatured: product.featured,
    lifecycleState: product.publicationState,
    inStock: Math.max(availableStock - reserved, 0) > 0,
    stockOnHand: availableStock,
    reservedStock: reserved,
    supplierName: product.supplier?.name ?? 'Iron Sprue',
    badge: product.specialOffer ? 'Sale' : product.newArrival ? 'New' : categoryName,
    imageLabel: product.customerTitle,
    imageUrl: image?.url ?? null,
    imageAlt: image?.asset.altText ?? product.customerTitle,
    heroImageUrl: null,
    vatRate: product.vatRate,
    scale: specifications.scale ?? product.scale,
    buildLevel: specifications.buildLevel ?? product.difficulty,
    specifications,
    freeUkStandardShipping: false,
    shippingPromotionProductOnly: false,
    releaseStatus: product.comingSoon ? 'COMING_SOON' : 'RELEASED',
    releaseDate: null,
    expectedDispatchAt: null,
    expectedArrivalAt: null,
    allocationLimit: null,
    customerPurchaseLimit: null,
    supplierAllocation: null,
    lowAllocationThreshold: null,
    availabilityMessage: null,
    preorderBadgeLabel: null,
    comingSoonBadgeLabel: product.comingSoon ? 'Coming soon' : null,
    seoTitle: sanitizePublicProductCopy(product.seoTitle) || null,
    metaDescription: sanitizePublicProductCopy(product.metaDescription) || null,
    canonicalUrl: null,
    ogImageUrl: null,
    noindex: false,
  };
}

function mapProductDetail(product: IronSprueCatalogueProductRow): CatalogueProductDetail {
  const summary = mapProduct(product);
  const images = product.mediaAssets
    .map((asset) => mapImage(asset, product))
    .filter((image): image is CatalogueProductImage => image !== null);
  const contentsFromField = typeof product.contents === 'string' && product.contents.trim()
    ? sanitizePublicProductList([product.contents])
    : [];
  const contents = contentsFromField.length ? contentsFromField : sanitizePublicProductList(product.featureBullets);

  return {
    ...summary,
    sku: product.sku,
    barcode: product.barcode,
    setName: null,
    language: null,
    condition: 'SEALED',
    longDescription: publicLongDescription(product),
    contents,
    searchText: [
      product.customerTitle,
      product.sourceTitle,
      product.sku,
      product.mpn,
      product.brand?.name,
      product.category?.name,
      product.buildType,
      product.scale,
      product.difficulty,
      product.material,
      product.dimensions,
      product.assemblyMethod,
      product.contents,
      ...Object.values(publicSpecifications(product)),
      ...product.searchKeywords,
    ].filter(Boolean).join(' '),
    supplierSku: product.supplierProductCode ?? product.mpn ?? product.sku,
    leadTimeDays: 2,
    images,
    relatedProducts: [],
  };
}

function buildProductWhere(filters: IronSprueCatalogueFilters): Prisma.IronSprueAdminProductWhereInput {
  const query = normalizeSearch(filters.search);
  const category = normalizeSearch(filters.category);
  const productType = normalizeSearch(filters.productType);
  const brand = normalizeSearch(filters.brand ?? filters.game);
  const scale = filters.scale?.trim().toLowerCase().replace(/\s+/g, '').replace(/[/:]/g, '-') ?? '';
  const clauses: Prisma.IronSprueAdminProductWhereInput[] = [];

  if (query) {
    clauses.push({
      OR: [
        { customerTitle: { contains: query, mode: insensitive } },
        { sourceTitle: { contains: query, mode: insensitive } },
        { sku: { contains: query, mode: insensitive } },
        { mpn: { contains: query, mode: insensitive } },
        { scale: { contains: query, mode: insensitive } },
        { difficulty: { contains: query, mode: insensitive } },
        { dimensions: { contains: query, mode: insensitive } },
        { contents: { contains: query, mode: insensitive } },
        { searchKeywords: { has: query } },
        { brand: { is: { name: { contains: query, mode: insensitive } } } },
        { category: { is: { name: { contains: query, mode: insensitive } } } },
      ],
    });
  }

  if (category) {
    const legacyLabel = category.replace(/-/g, ' ');
    clauses.push({
      OR: [
        { category: { is: { slug: category } } },
        { category: { is: { name: { contains: legacyLabel, mode: insensitive } } } },
        ...(category === 'model-kits' ? [{ buildType: { contains: 'model kit', mode: insensitive } }] : []),
      ],
    });
  }

  if (productType) {
    clauses.push({
      OR: [
        { buildType: { contains: productType.replace(/-/g, ' '), mode: insensitive } },
        { category: { is: { slug: productType } } },
      ],
    });
  }

  if (scale) {
    const scaleLabels = Array.from(new Set([
      scale,
      scale.replace(/-/g, ':'),
      scale.replace(/-/g, '/'),
    ])).filter(Boolean);
    clauses.push({
      OR: scaleLabels.map((label) => ({ scale: { contains: label, mode: insensitive } })),
    });
  }

  if (brand && brand !== 'iron-sprue') {
    clauses.push({
      OR: [
        { brand: { is: { slug: brand } } },
        { brand: { is: { name: { equals: brand.replace(/-/g, ' '), mode: insensitive } } } },
        { brand: { is: { name: { contains: brand.replace(/-/g, ' '), mode: insensitive } } } },
      ],
    });
  }

  return clauses.length ? { AND: [publicProductWhere, ...clauses] } : publicProductWhere;
}

function sortProducts(products: CatalogueProduct[], sort: CatalogueFilters['sort']) {
  return [...products].sort((left, right) => {
    if (sort === 'price-desc') return right.price.amountMinor - left.price.amountMinor || left.name.localeCompare(right.name);
    if (sort === 'price-asc') return left.price.amountMinor - right.price.amountMinor || left.name.localeCompare(right.name);
    if (sort === 'newest') return Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name);
    return Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name);
  });
}

export async function getIronSprueCatalogueCategories(db: DatabaseClient = getIronSprueAdminPrisma()): Promise<CatalogueCategory[]> {
  const rows = await db.ironSprueAdminCategory.findMany({
    where: { storeCode: IRON_SPRUE_STORE_CODE, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      products: {
        where: publicProductWhere,
        select: { id: true },
      },
    },
  });

  return rows
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      sortOrder: category.sortOrder,
      productCount: category.products.length,
    }))
    .filter((category) => category.productCount > 0);
}

export async function getIronSprueCatalogueProducts(
  filters: IronSprueCatalogueFilters,
  db: DatabaseClient = getIronSprueAdminPrisma(),
): Promise<IronSprueCatalogueProductsResult> {
  const page = Math.max(filters.page, 1);
  const pageSize = Math.max(filters.pageSize, 1);
  const rows = await db.ironSprueAdminProduct.findMany({
    where: buildProductWhere(filters),
    include: productInclude,
    orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }, { customerTitle: 'asc' }],
  });
  const visibleRows = rows.filter((product) => getIronSprueProductReadiness(product).isPubliclyVisible);
  const allProducts = sortProducts(visibleRows.map(mapProduct), filters.sort);
  const totalItems = allProducts.length;
  const pagination = resolvePagination(totalItems, page, pageSize);
  const offset = (pagination.page - 1) * pageSize;

  return {
    products: allProducts.slice(offset, offset + pageSize),
    pagination,
    categories: await getIronSprueCatalogueCategories(db),
    filters: { ...filters, page: pagination.page, pageSize },
  };
}

export async function getIronSprueCatalogueProductBySlug(
  slug: string,
  db: DatabaseClient = getIronSprueAdminPrisma(),
): Promise<CatalogueProductDetail | null> {
  const product = await db.ironSprueAdminProduct.findFirst({
    where: { ...publicProductWhere, slug },
    include: productInclude,
  });
  return product && getIronSprueProductReadiness(product).isPubliclyVisible ? mapProductDetail(product) : null;
}

export async function getIronSprueCatalogueHomeData(db: DatabaseClient = getIronSprueAdminPrisma()): Promise<IronSprueCatalogueHomeData> {
  const now = new Date();
  const [categories, homepagePlacements] = await Promise.all([
    getIronSprueCatalogueCategories(db),
    db.ironSprueAdminHomepagePlacement.findMany({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    }),
  ]);
  const activeFeaturedSlugs = homepagePlacements
    .filter((placement) => placement.active && placement.placementKey.startsWith('featured-product:'))
    .map((placement) => placement.placementKey.replace(/^featured-product:/, '').trim())
    .filter(Boolean);
  const featured = await db.ironSprueAdminProduct.findMany({
    where: {
      ...publicProductWhere,
      ...(activeFeaturedSlugs.length ? { slug: { in: activeFeaturedSlugs } } : { featured: true }),
    },
    include: productInclude,
    orderBy: [{ updatedAt: 'desc' }, { customerTitle: 'asc' }],
  });
  const featuredOrder = new Map(activeFeaturedSlugs.map((slug, index) => [slug, index]));
  const visibleFeatured = featured
    .filter((product) => getIronSprueProductReadiness(product).isPubliclyVisible)
    .sort((left, right) => (featuredOrder.get(left.slug) ?? 999) - (featuredOrder.get(right.slug) ?? 999))
    .slice(0, 4);

  return {
    categories,
    featuredProducts: visibleFeatured.map(mapProduct),
    homepagePlacements: homepagePlacements.map((placement) => ({
      id: placement.id,
      placementKey: placement.placementKey,
      title: placement.title,
      ctaLabel: placement.ctaLabel,
      ctaHref: placement.ctaHref,
      imageUrl: placement.imageUrl,
      active: placement.active,
      sortOrder: placement.sortOrder,
    })),
  };
}

export async function getIronSprueCatalogueFilterOptions(db: DatabaseClient = getIronSprueAdminPrisma()) {
  const [brands, categories] = await Promise.all([
    db.ironSprueAdminBrand.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE, active: true, products: { some: publicProductWhere } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    getIronSprueCatalogueCategories(db),
  ]);

  const toOption = (record: { id: string; name: string; slug: string }) => ({
    id: record.id,
    name: record.name,
    value: record.slug || slugLabel(record.name),
    gameId: null,
  });

  return {
    brands: brands.map(toOption),
    categories: categories.map(toOption),
  };
}
