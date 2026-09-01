import { randomUUID } from 'node:crypto';
import { Prisma, type IronSprueAdminProduct, type UserRole } from '@prisma/client';
import { slugify } from '@capital-hobby/utils';
import { getIronSprueAdminDatabaseTargetInfo, getIronSprueAdminPrisma } from './client.js';
import {
  generateIronSprueOrderNumber,
  refundIronSprueOrderForMerchant,
} from './iron-sprue-commerce.js';
import { calculateVatEstimateMinor } from './commerce.js';
import {
  inferIronSprueImageMimeType,
  isIronSprueDisplayableImageAsset,
  isIronSprueOperationalMediaRole,
  resolveIronSpruePublicMediaUrl,
} from './iron-sprue-media.js';

export const IRON_SPRUE_STORE_CODE = 'IRON_SPRUE' as const;

export const IRON_SPRUE_ADMIN_ROLES = [
  'SUPER_ADMIN',
  'STORE_ADMIN',
  'CATALOGUE_MANAGER',
  'INVENTORY_MANAGER',
  'CONTENT_MEDIA_MANAGER',
  'ORDER_MANAGER',
  'READ_ONLY_AUDITOR',
] as const;

export type IronSprueAdminRole = (typeof IRON_SPRUE_ADMIN_ROLES)[number];

export const IRON_SPRUE_ADMIN_PERMISSIONS = [
  'products:view',
  'products:edit',
  'prices:edit',
  'supplier-costs:view',
  'inventory:adjust',
  'inventory:receive',
  'media:approve',
  'content:approve',
  'products:publish',
  'promotions:manage',
  'homepage:manage',
  'heroes:manage',
  'orders:view',
  'roles:manage',
  'audit:view',
] as const;

export type IronSprueAdminPermission = (typeof IRON_SPRUE_ADMIN_PERMISSIONS)[number];

export const IRON_SPRUE_ROLE_PERMISSIONS: Record<IronSprueAdminRole, readonly IronSprueAdminPermission[]> = {
  SUPER_ADMIN: IRON_SPRUE_ADMIN_PERMISSIONS,
  STORE_ADMIN: IRON_SPRUE_ADMIN_PERMISSIONS.filter((permission) => permission !== 'roles:manage'),
  CATALOGUE_MANAGER: [
    'products:view',
    'products:edit',
    'prices:edit',
    'products:publish',
    'promotions:manage',
    'homepage:manage',
    'heroes:manage',
    'audit:view',
  ],
  INVENTORY_MANAGER: ['products:view', 'inventory:adjust', 'inventory:receive', 'supplier-costs:view', 'audit:view'],
  CONTENT_MEDIA_MANAGER: ['products:view', 'products:edit', 'media:approve', 'content:approve', 'homepage:manage', 'heroes:manage', 'audit:view'],
  ORDER_MANAGER: ['orders:view', 'products:view', 'audit:view'],
  READ_ONLY_AUDITOR: ['products:view', 'orders:view', 'audit:view'],
};

export const IRON_SPRUE_PUBLICATION_STATES = [
  'DRAFT',
  'CONTENT_PENDING',
  'MEDIA_PENDING',
  'REVIEW_REQUIRED',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type IronSpruePublicationState = (typeof IRON_SPRUE_PUBLICATION_STATES)[number];
type IronSprueStoredPublicationState = IronSpruePublicationState | 'READY';

export type IronSprueAdminUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole | string;
};

type IronSprueAdminDbClient = ReturnType<typeof getIronSprueAdminPrisma>;

export type IronSprueFulfilmentTrackingInput = {
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export const IRON_SPRUE_COURIERS = [
  {
    code: 'ROYAL_MAIL',
    label: 'Royal Mail',
    trackingUrl: (trackingNumber: string) => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`,
  },
  {
    code: 'EVRI',
    label: 'Evri',
    trackingUrl: (trackingNumber: string) => `https://www.evri.com/track/parcel/${encodeURIComponent(trackingNumber)}`,
  },
  {
    code: 'CUSTOM',
    label: 'Custom courier',
    trackingUrl: (_trackingNumber: string) => null,
  },
] as const;

export type IronSprueCourierCode = (typeof IRON_SPRUE_COURIERS)[number]['code'];

export function getIronSprueCourier(code: string | null | undefined) {
  return IRON_SPRUE_COURIERS.find((courier) => courier.code === code) ?? null;
}

export function buildIronSprueTrackingUrl(courierCode: string | null | undefined, trackingNumber: string | null | undefined, customUrl?: string | null) {
  const tracking = cleanTrackingValue(trackingNumber);
  if (!tracking) return null;
  const custom = normalizeTrackingUrl(customUrl);
  if (custom) return custom;
  const courier = getIronSprueCourier(courierCode);
  return courier?.trackingUrl(tracking) ?? null;
}

function isIronSprueAdminDbClient(value: unknown): value is IronSprueAdminDbClient {
  return Boolean(value && typeof value === 'object' && 'ironSprueOrder' in value);
}

function cleanTrackingValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeTrackingUrl(value?: string | null) {
  const trimmed = cleanTrackingValue(value);
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export type IronSprueReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type IronSprueReadinessStatus = 'READY' | 'BLOCKED' | 'PUBLISHED';

export type IronSprueReadinessBlockerCategory =
  | 'identity'
  | 'content'
  | 'media'
  | 'commercial'
  | 'inventory'
  | 'review'
  | 'publication';

export type IronSprueReadinessBlocker = {
  code: string;
  category: IronSprueReadinessBlockerCategory;
  message: string;
  source: string;
  actionable: boolean;
  actionHref?: string;
};

export type IronSprueProductReadinessResult = {
  status: IronSprueReadinessStatus;
  publicationState: IronSpruePublicationState;
  isReadyToPublish: boolean;
  isPubliclyVisible: boolean;
  primaryMediaId: string | null;
  primaryImageUrl: string | null;
  blockingReasons: IronSprueReadinessBlocker[];
};

const IRON_SPRUE_STOREFRONT_CONTENT_REVIEW_FIELDS = [
  'customerTitle',
  'title',
  'shortDescription',
  'fullDescription',
  'description',
  'featureBullets',
  'features',
  'specifications',
  'seoTitle',
  'metaDescription',
  'category',
  'brand',
  'buildType',
  'productType',
  'tags',
  'searchKeywords',
] as const;

export function isIronSprueStorefrontContentReviewField(fieldName: string) {
  const normalized = String(fieldName ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return IRON_SPRUE_STOREFRONT_CONTENT_REVIEW_FIELDS.some((field) => normalized === field.toLowerCase());
}

function isIronSprueCommercialReviewField(fieldName: string) {
  const normalized = String(fieldName ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return /(price|cost|margin|vat|tax|inventory|stock|sourcerow|import|supplierunitcost|retailpriceminor)/i.test(normalized);
}

export type IronSprueAdminCapabilityStatus = 'ready' | 'empty' | 'blocked' | 'deferred';

export type IronSprueAdminWorkspaceCard = {
  key: string;
  label: string;
  href: string;
  status: IronSprueAdminCapabilityStatus;
  description: string;
  requiredPermission: IronSprueAdminPermission;
};

export type IronSprueAdminDashboard = {
  storeCode: typeof IRON_SPRUE_STORE_CODE;
  environment: string;
  databaseTarget: {
    label: 'LOCAL' | 'STAGING' | 'RAILWAY PRODUCTION' | 'PRODUCTION' | 'UNKNOWN';
    source: string;
    host: string;
    database: string;
  };
  databaseStatus: 'connected' | 'blocked';
  r2Status: 'configured' | 'blocked';
  workerReadStatus: 'configured' | 'blocked';
  warnings: string[];
  metrics: Array<{ label: string; value: number; detail: string }>;
  workspace: IronSprueAdminWorkspaceCard[];
};

const productReadinessInclude = {
  brand: true,
  category: true,
  supplier: true,
  inventory: true,
  mediaAssets: {
    where: { approvalState: { notIn: ['REJECTED', 'FAILED'] } },
  },
  contentReviews: true,
} as const satisfies Prisma.IronSprueAdminProductInclude;

type ProductWithReadiness = Prisma.IronSprueAdminProductGetPayload<{ include: typeof productReadinessInclude }>;
const adminProductListInclude = {
  brand: true,
  category: true,
  supplier: true,
  inventory: true,
  mediaAssets: {
    where: {
      approvalState: { notIn: ['REJECTED', 'FAILED'] },
      OR: [
        { mimeType: { startsWith: 'image/' } },
        { mimeType: null },
      ],
      NOT: [
        { storageKey: { endsWith: '.json' } },
        { url: { endsWith: '.json' } },
        { storageKey: { contains: 'placeholder', mode: 'insensitive' } },
        { url: { contains: 'placeholder', mode: 'insensitive' } },
        { storageKey: { contains: 'manifest', mode: 'insensitive' } },
        { url: { contains: 'manifest', mode: 'insensitive' } },
        { storageKey: { contains: 'source-required', mode: 'insensitive' } },
        { url: { contains: 'source-required', mode: 'insensitive' } },
      ],
    },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  },
  contentReviews: {
    orderBy: { createdAt: 'desc' },
  },
} as const satisfies Prisma.IronSprueAdminProductInclude;

export type IronSprueAdminProductListItem = Prisma.IronSprueAdminProductGetPayload<{ include: typeof adminProductListInclude }>;
export type IronSprueAdminMediaReviewItem = Prisma.IronSprueAdminMediaAssetGetPayload<{
  include: { product: { select: { id: true; sku: true; customerTitle: true; publicationState: true } } };
}>;
export type IronSprueAdminContentReviewItem = Prisma.IronSprueAdminContentReviewGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        sku: true;
        customerTitle: true;
        shortDescription: true;
        fullDescription: true;
        featureBullets: true;
        specifications: true;
        seoTitle: true;
        metaDescription: true;
        buildType: true;
        publicationState: true;
        brand: { select: { name: true } };
        category: { select: { name: true } };
      };
    };
  };
}>;

export type IronSprueR2ProductMediaObject = {
  key: string;
  size?: number | null;
  updatedAt?: Date | string | null;
};

export type IronSprueR2MediaReconciliationResult = {
  scannedObjects: number;
  matchedObjects: number;
  upsertedMedia: number;
  affectedProducts: number;
  unmatched: Array<{ key: string; reason: string }>;
  ambiguous: Array<{ sku: string; role: string; keys: string[]; reason: string }>;
};
export type IronSprueAdminMediaAssetInput = {
  productId?: string | null;
  role: string;
  storageKey?: string | null;
  url?: string | null;
  altText?: string | null;
  mimeType?: string | null;
  byteSize?: number | null;
  width?: number | null;
  height?: number | null;
  approvalState?: string | null;
  isPrimary?: boolean | null;
  sortOrder?: number | null;
};

export type IronSprueInventoryReconciliationCorrection = {
  sku: string;
  product: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  reservedStock: number;
  movementQuantity: number;
  previousAvailableStock: number;
  nextAvailableStock: number;
};

function assertIronSprueStore(storeCode: string | undefined | null) {
  if (storeCode && storeCode !== IRON_SPRUE_STORE_CODE) {
    throw new Error('Iron Sprue Admin operations must be scoped server-side to IRON_SPRUE.');
  }
  return IRON_SPRUE_STORE_CODE;
}

function normalizePublicationState(value: string): IronSpruePublicationState {
  if (value === 'READY') return 'READY_TO_PUBLISH';
  if (IRON_SPRUE_PUBLICATION_STATES.includes(value as IronSpruePublicationState)) return value as IronSpruePublicationState;
  throw new Error('Unsupported Iron Sprue publication state.');
}

function normalizeStoredPublicationState(value: string): IronSprueStoredPublicationState {
  if (value === 'READY') return 'READY';
  return normalizePublicationState(value);
}

function safeSlug(value: string) {
  const slug = slugify(value);
  if (!slug) throw new Error('A valid slug is required.');
  return slug;
}

export function getIronSprueAdminPermissionMatrix() {
  return IRON_SPRUE_ADMIN_ROLES.map((role) => ({
    role,
    permissions: [...IRON_SPRUE_ROLE_PERMISSIONS[role]],
  }));
}

export function calculateIronSprueOnHandStock(input: {
  receivedQuantity: number;
  damagedQuantity?: number | null;
  missingQuantity?: number | null;
  movementQuantity?: number | null;
}) {
  const usableReceived = Math.max(
    input.receivedQuantity - (input.damagedQuantity ?? 0) - (input.missingQuantity ?? 0),
    0,
  );
  return Math.max(usableReceived + (input.movementQuantity ?? 0), 0);
}

export async function reconcileIronSprueInventoryAvailableStock(client = getIronSprueAdminPrisma()) {
  const [inventoryRows, movementTotals] = await Promise.all([
    client.ironSprueAdminInventory.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            customerTitle: true,
          },
        },
      },
    }),
    client.ironSprueAdminStockMovement.groupBy({
      by: ['productId'],
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        movementType: { not: 'GOODS_RECEIVED' },
      },
      _sum: { quantity: true },
    }),
  ]);
  const movementByProduct = new Map(
    movementTotals.map((movement) => [movement.productId, movement._sum.quantity ?? 0]),
  );
  const corrections: IronSprueInventoryReconciliationCorrection[] = [];

  for (const row of inventoryRows) {
    const movementQuantity = movementByProduct.get(row.productId) ?? 0;
    const nextAvailableStock = calculateIronSprueOnHandStock({
      receivedQuantity: row.receivedQuantity,
      damagedQuantity: row.damagedQuantity,
      missingQuantity: row.missingQuantity,
      movementQuantity,
    });
    if (row.availableStock === nextAvailableStock) continue;

    await client.ironSprueAdminInventory.update({
      where: { id: row.id },
      data: { availableStock: nextAvailableStock },
    });
    corrections.push({
      sku: row.product.sku,
      product: row.product.customerTitle,
      expectedQuantity: row.expectedQuantity,
      receivedQuantity: row.receivedQuantity,
      damagedQuantity: row.damagedQuantity,
      missingQuantity: row.missingQuantity,
      reservedStock: row.reservedStock,
      movementQuantity,
      previousAvailableStock: row.availableStock,
      nextAvailableStock,
    });
  }

  return {
    checked: inventoryRows.length,
    updated: corrections.length,
    corrections,
  };
}

export async function resolveIronSprueAdminPermissions(user: IronSprueAdminUser, client = getIronSprueAdminPrisma()) {
  if (user.role === 'ADMIN') {
    return {
      role: 'SUPER_ADMIN' as const,
      permissions: [...IRON_SPRUE_ROLE_PERMISSIONS.SUPER_ADMIN],
    };
  }

  const grant = await client.ironSprueAdminPermissionGrant.findUnique({
    where: { storeCode_userId: { storeCode: IRON_SPRUE_STORE_CODE, userId: user.id } },
  });

  if (!grant?.active) {
    return {
      role: 'READ_ONLY_AUDITOR' as const,
      permissions: [] as IronSprueAdminPermission[],
    };
  }

  const role = IRON_SPRUE_ADMIN_ROLES.includes(grant.role as IronSprueAdminRole)
    ? (grant.role as IronSprueAdminRole)
    : 'READ_ONLY_AUDITOR';
  const rolePermissions = new Set(IRON_SPRUE_ROLE_PERMISSIONS[role]);
  const explicitPermissions = grant.permissions.filter((permission): permission is IronSprueAdminPermission =>
    IRON_SPRUE_ADMIN_PERMISSIONS.includes(permission as IronSprueAdminPermission),
  );

  return {
    role,
    permissions: [...new Set([...rolePermissions, ...explicitPermissions])],
  };
}

export function requireIronSpruePermission(
  permissions: readonly IronSprueAdminPermission[],
  requiredPermission: IronSprueAdminPermission,
) {
  if (!permissions.includes(requiredPermission)) {
    throw new Error(`Iron Sprue Admin permission required: ${requiredPermission}`);
  }
}

export { isIronSprueDisplayableImageAsset, isIronSprueOperationalMediaRole, resolveIronSpruePublicMediaUrl } from './iron-sprue-media.js';

export function selectIronSpruePrimaryCatalogueMedia(product: Pick<ProductWithReadiness, 'mediaAssets'>) {
  return [...product.mediaAssets]
    .filter((asset) => asset.role === 'catalogue-primary' && asset.approvalState === 'APPROVED' && asset.isPrimary && isIronSprueDisplayableImageAsset(asset))
    .map((asset) => ({ asset, url: resolveIronSpruePublicMediaUrl(asset) }))
    .filter((item): item is { asset: ProductWithReadiness['mediaAssets'][number]; url: string } => Boolean(item.url))
    .sort((left, right) => left.asset.sortOrder - right.asset.sortOrder || left.asset.id.localeCompare(right.asset.id))[0] ?? null;
}

export function canUseSingleApprovedSourceImage(product: Pick<ProductWithReadiness, 'category'>) {
  const category = `${product.category?.name ?? ''} ${product.category?.slug ?? ''}`.toLowerCase();
  const singleImageCategorySlugs = new Set([
    'accessories',
    'adhesives-finishing',
    'knives-blades',
    'magnification',
    'measuring-tools',
    'paint-weathering',
    'pin-vices-drills',
    'sanding-files',
    'tool-sets',
    'tools',
    'tweezers-pliers',
  ]);
  return singleImageCategorySlugs.has(product.category?.slug ?? '')
    || /\btools?\b/.test(category)
    || /\baccessories?\b/.test(category)
    || /\badhesives?\b/.test(category)
    || /\bfinishing\b/.test(category)
    || /\bpaints?\b/.test(category)
    || /\bweathering\b/.test(category);
}

function ironSprueDisplayableMediaWhere(role?: string, isPrimary?: boolean): Prisma.IronSprueAdminMediaAssetListRelationFilter {
  return {
    some: {
      ...(role ? { role } : {}),
      ...(typeof isPrimary === 'boolean' ? { isPrimary } : {}),
      approvalState: 'APPROVED',
      AND: [
        {
          OR: [
            { mimeType: { startsWith: 'image/' } },
            { mimeType: null },
          ],
        },
        {
          OR: [
            { url: { not: null } },
            { storageKey: { not: null } },
          ],
        },
        {
          NOT: [
            { storageKey: { endsWith: '.json' } },
            { url: { endsWith: '.json' } },
          ],
        },
      ],
    },
  };
}

function selectIronSpruePublishableMedia(product: Pick<ProductWithReadiness, 'category' | 'mediaAssets'>) {
  const primaryMedia = selectIronSpruePrimaryCatalogueMedia(product);
  if (primaryMedia || !canUseSingleApprovedSourceImage(product)) return primaryMedia;

  return [...product.mediaAssets]
    .filter((asset) => asset.approvalState === 'APPROVED' && isIronSprueOperationalMediaRole(asset.role) && isIronSprueDisplayableImageAsset(asset))
    .map((asset) => ({ asset, url: resolveIronSpruePublicMediaUrl(asset) }))
    .filter((item): item is { asset: ProductWithReadiness['mediaAssets'][number]; url: string } => Boolean(item.url))
    .sort((left, right) => {
      const roleRank = (role: string) => role === 'manufacturer-original' ? 0 : role === 'catalogue-primary' ? 1 : 2;
      return roleRank(left.asset.role) - roleRank(right.asset.role)
        || left.asset.sortOrder - right.asset.sortOrder
        || left.asset.id.localeCompare(right.asset.id);
    })[0] ?? null;
}

function hasStructuredValue(value: unknown) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function blocker(input: IronSprueReadinessBlocker): IronSprueReadinessBlocker {
  return input;
}

export function getIronSprueProductReadiness(product: ProductWithReadiness): IronSprueProductReadinessResult {
  const blockingReasons: IronSprueReadinessBlocker[] = [];
  const productActionHref = `/iron-sprue-admin/products?q=${encodeURIComponent(product.sku)}`;
  const mediaActionHref = productActionHref;
  const contentActionHref = productActionHref;
  const inventoryActionHref = `/iron-sprue-admin/inventory?q=${encodeURIComponent(product.sku)}`;
  const primaryMedia = selectIronSpruePublishableMedia(product);
  const singleSourceAllowed = canUseSingleApprovedSourceImage(product);
  const approvedPrimaryUnusable = product.mediaAssets.some(
    (asset) => asset.role === 'catalogue-primary' && asset.approvalState === 'APPROVED' && asset.isPrimary && (!resolveIronSpruePublicMediaUrl(asset) || !isIronSprueDisplayableImageAsset(asset)),
  );
  const pendingPrimaryMedia = product.mediaAssets.filter(
    (asset) => asset.role === 'catalogue-primary' && ['REVIEW_REQUIRED', 'PENDING'].includes(asset.approvalState) && isIronSprueDisplayableImageAsset(asset),
  ).length;
  const availableStock = product.inventory?.availableStock ?? 0;
  const reservedStock = product.inventory?.reservedStock ?? 0;
  const sellableStock = Math.max(availableStock - reservedStock, 0);

  if (!product.customerTitle?.trim()) {
    blockingReasons.push(blocker({ code: 'identity.customer_title_missing', category: 'identity', message: 'Customer title is required.', source: 'customerTitle', actionable: true, actionHref: productActionHref }));
  }
  if (!product.sku?.trim()) {
    blockingReasons.push(blocker({ code: 'identity.sku_missing', category: 'identity', message: 'SKU is required.', source: 'sku', actionable: true, actionHref: productActionHref }));
  }
  if (!product.slug?.trim()) {
    blockingReasons.push(blocker({ code: 'identity.slug_missing', category: 'identity', message: 'Slug is required.', source: 'slug', actionable: true, actionHref: productActionHref }));
  }
  if (!product.brandId) {
    blockingReasons.push(blocker({ code: 'identity.brand_missing', category: 'identity', message: 'Brand is required.', source: 'brandId', actionable: true, actionHref: productActionHref }));
  }
  if (!product.categoryId) {
    blockingReasons.push(blocker({ code: 'identity.category_missing', category: 'identity', message: 'Category is required.', source: 'categoryId', actionable: true, actionHref: productActionHref }));
  }
  if (!product.shortDescription?.trim()) {
    blockingReasons.push(blocker({ code: 'content.short_description_missing', category: 'content', message: 'Short product description is required.', source: 'shortDescription', actionable: true, actionHref: contentActionHref }));
  }
  if (!product.fullDescription?.trim()) {
    blockingReasons.push(blocker({ code: 'content.full_description_missing', category: 'content', message: 'Full PDP description is required.', source: 'fullDescription', actionable: true, actionHref: contentActionHref }));
  }
  if (!hasStructuredValue(product.specifications)) {
    blockingReasons.push(blocker({ code: 'content.specifications_missing', category: 'content', message: 'Product specifications are required.', source: 'specifications', actionable: true, actionHref: contentActionHref }));
  }
  if (!product.seoTitle?.trim() || !product.metaDescription?.trim()) {
    blockingReasons.push(blocker({ code: 'content.seo_missing', category: 'content', message: 'SEO title and meta description are required.', source: 'seoTitle/metaDescription', actionable: true, actionHref: contentActionHref }));
  }
  if (!primaryMedia) {
    blockingReasons.push(blocker({
      code: approvedPrimaryUnusable ? 'media.primary_unresolvable' : 'media.primary_missing',
      category: 'media',
      message: approvedPrimaryUnusable
        ? 'Approved primary catalogue media must be a resolvable image file.'
        : pendingPrimaryMedia > 0
          ? `${pendingPrimaryMedia} customer-facing catalogue image candidate${pendingPrimaryMedia === 1 ? ' requires' : 's require'} approval.`
          : singleSourceAllowed
            ? 'Tools and accessories require at least one approved product image before publication.'
            : 'A customer-facing catalogue-primary Image 2 is required before publication; manufacturer/source images are admin references and do not publish to the storefront.',
      source: singleSourceAllowed ? 'mediaAssets.approved-product-image' : 'mediaAssets.catalogue-primary',
      actionable: true,
      actionHref: mediaActionHref,
    }));
  }
  if (product.grossPriceMinor == null || product.grossPriceMinor <= 0) {
    blockingReasons.push(blocker({ code: 'commercial.price_missing', category: 'commercial', message: 'Valid sell price is required.', source: 'grossPriceMinor', actionable: true, actionHref: productActionHref }));
  }
  if (sellableStock <= 0) {
    blockingReasons.push(blocker({ code: 'inventory.stock_unavailable', category: 'inventory', message: 'Sellable stock must be greater than zero.', source: 'inventory.availableStock/reservedStock', actionable: true, actionHref: inventoryActionHref }));
  }

  for (const review of product.contentReviews) {
    if (review.status === 'APPROVED') continue;
    const fieldName = String(review.fieldName ?? 'review');
    if (isIronSprueStorefrontContentReviewField(fieldName)) {
      blockingReasons.push(blocker({
        code: `content.review_${String(review.status).toLowerCase()}`,
        category: 'content',
        message: `${fieldName} content review is ${String(review.status).toLowerCase()}.`,
        source: `contentReviews.${fieldName}`,
        actionable: true,
        actionHref: contentActionHref,
      }));
    } else if (isIronSprueCommercialReviewField(fieldName)) {
      if (review.status === 'PENDING') continue;
      blockingReasons.push(blocker({
        code: `commercial.review_${String(review.status).toLowerCase()}`,
        category: 'commercial',
        message: `${fieldName} commercial/import review is ${String(review.status).toLowerCase()}.`,
        source: `contentReviews.${fieldName}`,
        actionable: true,
        actionHref: productActionHref,
      }));
    } else {
      blockingReasons.push(blocker({
        code: `review.required_${String(review.status).toLowerCase()}`,
        category: 'review',
        message: `${fieldName} review is ${String(review.status).toLowerCase()}.`,
        source: `contentReviews.${fieldName}`,
        actionable: true,
        actionHref: productActionHref,
      }));
    }
  }

  const isReadyToPublish = blockingReasons.length === 0;
  const normalizedState = normalizeStoredPublicationState(product.publicationState) === 'READY' ? 'READY_TO_PUBLISH' : normalizePublicationState(product.publicationState);
  return {
    status: normalizedState === 'PUBLISHED' && isReadyToPublish ? 'PUBLISHED' : isReadyToPublish ? 'READY' : 'BLOCKED',
    publicationState: deriveIronSpruePublicationStateFromBlockers(blockingReasons),
    isReadyToPublish,
    isPubliclyVisible: normalizedState === 'PUBLISHED' && isReadyToPublish,
    primaryMediaId: primaryMedia?.asset.id ?? null,
    primaryImageUrl: primaryMedia?.url ?? null,
    blockingReasons,
  };
}

function deriveIronSpruePublicationStateFromBlockers(blockingReasons: IronSprueReadinessBlocker[]): IronSpruePublicationState {
  if (!blockingReasons.length) return 'READY_TO_PUBLISH';
  if (blockingReasons.some((reason) => reason.category === 'media')) return 'MEDIA_PENDING';
  if (blockingReasons.some((reason) => reason.category === 'content' && (reason.code.includes('conflict') || reason.code.includes('rejected')))) return 'REVIEW_REQUIRED';
  if (blockingReasons.some((reason) => reason.category === 'content')) return 'CONTENT_PENDING';
  return 'REVIEW_REQUIRED';
}

export function evaluateIronSprueProductReadiness(product: ProductWithReadiness): IronSprueReadinessCheck[] {
  const readiness = getIronSprueProductReadiness(product);
  const failed = new Set(readiness.blockingReasons.map((reason) => reason.category));
  return [
    { key: 'identity', label: 'Confirmed identity', passed: !failed.has('identity'), detail: 'Title, SKU, slug, brand and category are required.' },
    { key: 'descriptions', label: 'Required descriptions', passed: !readiness.blockingReasons.some((reason) => reason.code.startsWith('content.short') || reason.code.startsWith('content.full')), detail: 'Short and full descriptions are required.' },
    { key: 'specifications', label: 'Required specifications', passed: !readiness.blockingReasons.some((reason) => reason.code === 'content.specifications_missing'), detail: 'Structured specifications must be reviewed.' },
    { key: 'media', label: 'Approved product media', passed: !failed.has('media'), detail: 'Image-led products require approved Image 2 media; tools and accessories may use one approved product image.' },
    { key: 'seo', label: 'Minimum SEO', passed: !readiness.blockingReasons.some((reason) => reason.code === 'content.seo_missing'), detail: 'SEO title and meta description are required.' },
    { key: 'commercial', label: 'Commercial/import checks', passed: !failed.has('commercial'), detail: 'Price and import/commercial conflicts must be resolved.' },
    { key: 'inventory', label: 'Sellable inventory', passed: !failed.has('inventory'), detail: 'Sellable stock is required before publication.' },
    { key: 'content-conflicts', label: 'No unresolved review blockers', passed: !failed.has('content') && !failed.has('review'), detail: 'Pending or conflicted reviews block readiness.' },
  ];
}

export function isIronSprueProductReady(product: ProductWithReadiness) {
  return getIronSprueProductReadiness(product).isReadyToPublish;
}

export function summarizeIronSprueProductReadinessBlockers(product: ProductWithReadiness) {
  return [...new Set(getIronSprueProductReadiness(product).blockingReasons.map((reason) => reason.message))];
}

export function deriveIronSprueProductReadinessState(product: ProductWithReadiness): IronSpruePublicationState {
  return getIronSprueProductReadiness(product).publicationState;
}

export function ironSpruePublicProductWhere(): Prisma.IronSprueAdminProductWhereInput {
  const singleImageCategorySlugs = [
    'accessories',
    'adhesives-finishing',
    'knives-blades',
    'magnification',
    'measuring-tools',
    'paint-weathering',
    'pin-vices-drills',
    'sanding-files',
    'tool-sets',
    'tools',
    'tweezers-pliers',
  ];

  return {
    storeCode: IRON_SPRUE_STORE_CODE,
    publicationState: 'PUBLISHED',
    archivedAt: null,
    grossPriceMinor: { gt: 0 },
    customerTitle: { not: '' },
    sku: { not: '' },
    slug: { not: '' },
    brandId: { not: null },
    categoryId: { not: null },
    shortDescription: { not: null },
    fullDescription: { not: null },
    seoTitle: { not: null },
    metaDescription: { not: null },
    inventory: { is: { availableStock: { gt: 0 } } },
    OR: [
      { mediaAssets: ironSprueDisplayableMediaWhere('catalogue-primary', true) },
      {
        AND: [
          {
            OR: [
              { category: { is: { slug: { in: singleImageCategorySlugs } } } },
              { category: { is: { name: { contains: 'tool', mode: 'insensitive' } } } },
              { category: { is: { name: { contains: 'accessor', mode: 'insensitive' } } } },
            ],
          },
          { mediaAssets: ironSprueDisplayableMediaWhere() },
        ],
      },
    ],
    contentReviews: {
      none: {
        status: { in: ['CONFLICT', 'REJECTED'] },
      },
    },
  };
}

export async function synchronizeIronSprueProductPublicationReadiness(
  productId: string,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const product = await client.ironSprueAdminProduct.findFirst({
    where: { id: productId, storeCode: IRON_SPRUE_STORE_CODE },
    include: productReadinessInclude,
  });
  if (!product) throw new Error('Iron Sprue product not found.');
  if (product.publicationState === 'ARCHIVED') return product;

  const readiness = getIronSprueProductReadiness(product);
  const derivedState = readiness.publicationState;
  const nextState = product.publicationState === 'PUBLISHED' ? 'PUBLISHED' : derivedState;
  if (product.publicationState === nextState) return product;

  const updated = await client.ironSprueAdminProduct.update({
    where: { id: product.id },
    data: {
      publicationState: nextState,
      readyApprovedAt: nextState === 'READY_TO_PUBLISH' ? new Date() : product.readyApprovedAt,
      updatedById: actor.id,
    },
    include: productReadinessInclude,
  });
  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'product.publication_readiness.sync',
      entityType: 'product',
      entityId: product.id,
      productId: product.id,
      summary: `Synchronized Iron Sprue product ${product.sku} readiness to ${nextState}.`,
      before: { publicationState: product.publicationState },
      after: { publicationState: nextState, blockers: getIronSprueProductReadiness(updated).blockingReasons },
    },
  });
  return updated;
}

export async function getIronSprueAdminDashboard(client = getIronSprueAdminPrisma()): Promise<IronSprueAdminDashboard> {
  const databaseTarget = getIronSprueAdminDatabaseTargetInfo();
  const [
    totalProducts,
    draftProducts,
    contentPending,
    mediaPending,
    reviewRequired,
    readyProducts,
    publishedProducts,
    inventory,
    activeOffers,
    activeHeroes,
    contentApprovalRequired,
    contentApproved,
    mediaApprovalRequired,
    mediaApproved,
    failedImports,
    failedMedia,
  ] = await Promise.all([
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'DRAFT' } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'CONTENT_PENDING' } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'MEDIA_PENDING' } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'REVIEW_REQUIRED' } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: { in: ['READY_TO_PUBLISH', 'READY'] } } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'PUBLISHED' } }),
    client.ironSprueAdminInventory.aggregate({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      _sum: { expectedQuantity: true, receivedQuantity: true, damagedQuantity: true, missingQuantity: true, availableStock: true, reservedStock: true },
    }),
    client.ironSprueAdminSpecialOffer.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, active: true } }),
    client.ironSprueAdminHero.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, active: true } }),
    client.ironSprueAdminContentReview.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, status: { in: ['PENDING', 'CONFLICT'] } } }),
    client.ironSprueAdminContentReview.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, status: 'APPROVED' } }),
    client.ironSprueAdminMediaAsset.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, approvalState: { in: ['REVIEW_REQUIRED', 'PENDING'] } } }),
    client.ironSprueAdminMediaAsset.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, approvalState: 'APPROVED' } }),
    client.ironSprueAdminImportBatch.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, failedRows: { gt: 0 } } }),
    client.ironSprueAdminMediaAsset.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, approvalState: 'FAILED' } }),
  ]);

  const expectedStock = inventory._sum.expectedQuantity ?? 0;
  const receivedStock = inventory._sum.receivedQuantity ?? 0;
  const damagedStock = inventory._sum.damagedQuantity ?? 0;
  const missingStock = inventory._sum.missingQuantity ?? 0;
  const availableStock = inventory._sum.availableStock ?? 0;
  const reservedStock = inventory._sum.reservedStock ?? 0;
  const sellableStock = Math.max(availableStock - reservedStock, 0);
  const workerReadConfigured = Boolean(process.env.IRON_SPRUE_WORKER_READ_DATABASE_URL?.trim());
  const r2Configured = Boolean(
    process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() === 'iron-sprue-product-media' &&
      process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() &&
      process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
  );

  return {
    storeCode: IRON_SPRUE_STORE_CODE,
    environment: databaseTarget.environment,
    databaseTarget: {
      label: databaseTarget.label,
      source: databaseTarget.source,
      host: databaseTarget.host,
      database: databaseTarget.database,
    },
    databaseStatus: 'connected',
    r2Status: r2Configured ? 'configured' : 'blocked',
    workerReadStatus: workerReadConfigured ? 'configured' : 'blocked',
    warnings: [
      ...(workerReadConfigured ? [] : ['IRON_SPRUE_WORKER_READ_DATABASE_URL is not configured locally.']),
      ...(r2Configured ? [] : ['Iron Sprue R2 write configuration is incomplete.']),
      ...(databaseTarget.label === 'RAILWAY PRODUCTION' && databaseTarget.source !== 'IRON_SPRUE_ADMIN_DATABASE_URL'
        ? ['Railway production admin should use explicit IRON_SPRUE_ADMIN_DATABASE_URL.']
        : []),
      ...(databaseTarget.label !== 'RAILWAY PRODUCTION'
        ? [`Admin is targeting ${databaseTarget.label} via ${databaseTarget.source} (${databaseTarget.host}/${databaseTarget.database}), not Railway production.`]
        : []),
    ],
    metrics: [
      { label: 'Total products', value: totalProducts, detail: 'Iron Sprue-scoped Admin products.' },
      { label: 'Draft', value: draftProducts, detail: 'Imported or manually created records not yet ready.' },
      { label: 'Content pending', value: contentPending, detail: 'Products waiting for content review.' },
      { label: 'Media pending', value: mediaPending, detail: 'Products waiting for Image 2 or gallery media.' },
      { label: 'Review required', value: reviewRequired, detail: 'Products with unresolved readiness checks.' },
      { label: 'Ready to publish', value: readyProducts, detail: 'Products eligible for explicit publication.' },
      { label: 'Published', value: publishedProducts, detail: 'Products visible after launch approval.' },
      { label: 'Content approvals required', value: contentApprovalRequired, detail: 'Pending or conflicted customer-facing copy/specification reviews.' },
      { label: 'Content approved', value: contentApproved, detail: 'Customer-facing copy/specification reviews already approved.' },
      { label: 'Media approvals required', value: mediaApprovalRequired, detail: 'Image 2, workshop or source media awaiting approval.' },
      { label: 'Media approved', value: mediaApproved, detail: 'Approved Iron Sprue media assets.' },
      { label: 'Expected stock', value: expectedStock, detail: 'Units expected from import/goods received.' },
      { label: 'Received stock', value: receivedStock, detail: 'Units received into Iron Sprue inventory.' },
      { label: 'Missing/damaged stock', value: missingStock + damagedStock, detail: 'Goods received exceptions.' },
      { label: 'Sellable stock', value: sellableStock, detail: 'Available units less active checkout reservations.' },
      { label: 'Reserved stock', value: reservedStock, detail: 'Units currently held by active checkout attempts.' },
      { label: 'Active offers', value: activeOffers, detail: 'Iron Sprue special-offer controls.' },
      { label: 'Active heroes', value: activeHeroes, detail: 'Active Iron Sprue hero placements.' },
      { label: 'Failed import rows', value: failedImports, detail: 'Rows requiring retry or skip.' },
      { label: 'Failed media stages', value: failedMedia, detail: 'Media processing stages needing attention.' },
    ],
    workspace: getIronSprueAdminWorkspaceCards(),
  };
}

export function getIronSprueAdminWorkspaceCards(): IronSprueAdminWorkspaceCard[] {
  return [
    { key: 'products', label: 'Products', href: '/iron-sprue-admin/products', status: 'ready', requiredPermission: 'products:view', description: 'Search, flag and update publication state for Iron Sprue products.' },
    { key: 'inventory', label: 'Inventory', href: '/iron-sprue-admin/inventory', status: 'ready', requiredPermission: 'inventory:adjust', description: 'Expected stock, receipts, adjustments and movement history.' },
    { key: 'goods-received', label: 'Goods Received', href: '/iron-sprue-admin/goods-received', status: 'ready', requiredPermission: 'inventory:receive', description: 'Full, partial, missing and damaged stock receipt workflows.' },
    { key: 'categories', label: 'Categories', href: '/iron-sprue-admin/categories', status: 'ready', requiredPermission: 'products:edit', description: 'Model kits, puzzles, tools and finishing navigation.' },
    { key: 'brands', label: 'Brands', href: '/iron-sprue-admin/brands', status: 'ready', requiredPermission: 'products:edit', description: 'Official stocked-brand records and carousel ordering.' },
    { key: 'suppliers', label: 'Suppliers', href: '/iron-sprue-admin/suppliers', status: 'ready', requiredPermission: 'supplier-costs:view', description: 'Supplier records and protected cost context.' },
    { key: 'media', label: 'Media', href: '/iron-sprue-admin/media', status: 'ready', requiredPermission: 'media:approve', description: 'Image 2, original, workshop and hero media review.' },
    { key: 'content-review', label: 'Content Review', href: '/iron-sprue-admin/content-review', status: 'ready', requiredPermission: 'content:approve', description: 'Customer copy/specification review and conflict blocking.' },
    { key: 'import-batches', label: 'Import Batches', href: '/iron-sprue-admin/import-batches', status: 'ready', requiredPermission: 'products:edit', description: 'Import validation, retry, skip and zero-quantity handling.' },
    { key: 'homepage', label: 'Homepage', href: '/iron-sprue-admin/homepage', status: 'ready', requiredPermission: 'homepage:manage', description: 'Homepage placements, category order and brand carousel controls.' },
    { key: 'heroes', label: 'Heroes', href: '/iron-sprue-admin/heroes', status: 'ready', requiredPermission: 'heroes:manage', description: 'Hero carousel artwork, CTA route and display ordering.' },
    { key: 'special-offers', label: 'Special Offers', href: '/iron-sprue-admin/special-offers', status: 'ready', requiredPermission: 'promotions:manage', description: 'Offer price, schedule, badge and homepage inclusion.' },
    { key: 'orders', label: 'Orders', href: '/iron-sprue-admin/orders', status: 'ready', requiredPermission: 'orders:view', description: 'Store-scoped Iron Sprue payment, fulfilment and order visibility.' },
    { key: 'settings', label: 'Settings', href: '/iron-sprue-admin/settings', status: 'ready', requiredPermission: 'roles:manage', description: 'Environment, permissions and operational readiness.' },
    { key: 'audit-log', label: 'Audit Log', href: '/iron-sprue-admin/audit-log', status: 'ready', requiredPermission: 'audit:view', description: 'Store-scoped security and catalogue action history.' },
  ];
}

export type CreateIronSprueAdminProductInput = {
  storeCode?: string;
  sourceTitle: string;
  customerTitle?: string;
  slug?: string;
  sku: string;
  supplierProductCode?: string | null;
  barcode?: string | null;
  mpn?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  supplierId?: string | null;
  grossPriceMinor?: number | null;
  vatRate?: number;
  currency?: string;
};

export async function createIronSprueAdminProduct(input: CreateIronSprueAdminProductInput, actor: IronSprueAdminUser, client = getIronSprueAdminPrisma()) {
  assertIronSprueStore(input.storeCode);
  if (!input.sourceTitle.trim()) throw new Error('Source title is required.');
  if (!input.sku.trim()) throw new Error('SKU is required.');
  if (input.grossPriceMinor != null && input.grossPriceMinor <= 0) throw new Error('Gross price must be positive when supplied.');

  const customerTitle = input.customerTitle?.trim() || input.sourceTitle.trim();
  const slug = safeSlug(input.slug ?? customerTitle);

  return client.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.ironSprueAdminProduct.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        sourceTitle: input.sourceTitle.trim(),
        customerTitle,
        slug,
        sku: input.sku.trim(),
        supplierProductCode: input.supplierProductCode?.trim() || null,
        barcode: input.barcode?.trim() || null,
        mpn: input.mpn?.trim() || null,
        brandId: input.brandId ?? null,
        categoryId: input.categoryId ?? null,
        supplierId: input.supplierId ?? null,
        grossPriceMinor: input.grossPriceMinor ?? null,
        vatRate: input.vatRate ?? 20,
        currency: input.currency ?? 'GBP',
        publicationState: 'DRAFT',
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    await tx.ironSprueAdminInventory.create({
      data: { storeCode: IRON_SPRUE_STORE_CODE, productId: product.id },
    });

    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'product.create',
        entityType: 'product',
        entityId: product.id,
        productId: product.id,
        summary: `Created Iron Sprue product ${product.sku}.`,
        after: { sku: product.sku, customerTitle: product.customerTitle },
      },
    });

    return product;
  });
}

export async function setIronSprueProductPublicationState(
  productId: string,
  nextState: IronSpruePublicationState | 'READY',
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const state = normalizePublicationState(nextState);
  const storedState = normalizeStoredPublicationState(state);
  const product = await client.ironSprueAdminProduct.findFirst({
    where: { id: productId, storeCode: IRON_SPRUE_STORE_CODE },
    include: productReadinessInclude,
  });
  if (!product) throw new Error('Iron Sprue product not found.');

  const readiness = getIronSprueProductReadiness(product);
  if ((state === 'READY_TO_PUBLISH' || state === 'PUBLISHED') && !readiness.isReadyToPublish) {
    throw new Error(`Iron Sprue product is not ${state.toLowerCase()}: ${readiness.blockingReasons.map((reason) => reason.message).join('; ')}`);
  }

  return client.$transaction(async (tx) => {
    const updated = await tx.ironSprueAdminProduct.update({
      where: { id: product.id },
      data: {
        publicationState: storedState,
        readyApprovedAt: state === 'READY_TO_PUBLISH' ? new Date() : product.readyApprovedAt,
        publishedAt: state === 'PUBLISHED' ? new Date() : product.publishedAt,
        archivedAt: state === 'ARCHIVED' ? new Date() : null,
        updatedById: actor.id,
      },
    });
    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'product.publication_state.change',
        entityType: 'product',
        entityId: product.id,
        productId: product.id,
        summary: `Changed Iron Sprue product ${product.sku} to ${state}.`,
        before: { publicationState: product.publicationState },
        after: { publicationState: storedState, readiness },
      },
    });
    return updated;
  });
}

export async function publishIronSprueAdminProduct(
  productId: string,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  return setIronSprueProductPublicationState(productId, 'PUBLISHED', actor, client);
}

export async function publishIronSprueAdminProducts(
  productIds: string[],
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) throw new Error('Select at least one product to publish.');

  const products = await client.ironSprueAdminProduct.findMany({
    where: { id: { in: ids }, storeCode: IRON_SPRUE_STORE_CODE },
    include: productReadinessInclude,
  });
  if (products.length !== ids.length) throw new Error('One or more Iron Sprue products could not be found.');

  const blocked = products
    .map((product) => ({
      product,
      blockers: product.publicationState === 'ARCHIVED'
        ? ['archived products cannot be bulk-published']
        : getIronSprueProductReadiness(product).blockingReasons.map((reason) => reason.message),
    }))
    .filter((item) => item.blockers.length > 0);
  if (blocked.length) {
    throw new Error(
      `Cannot publish selected products: ${blocked
        .map((item) => `${item.product.sku}: ${item.blockers.join('; ')}`)
        .join(' | ')}`,
    );
  }

  return client.$transaction(async (tx) => {
    const now = new Date();
    const updated = [];
    for (const product of products) {
      updated.push(await tx.ironSprueAdminProduct.update({
        where: { id: product.id },
        data: {
          publicationState: 'PUBLISHED',
          readyApprovedAt: product.readyApprovedAt ?? now,
          publishedAt: now,
          archivedAt: null,
          updatedById: actor.id,
        },
      }));
      await tx.ironSprueAdminAuditLog.create({
        data: {
          storeCode: IRON_SPRUE_STORE_CODE,
          actorId: actor.id,
          action: 'product.bulk_publish',
          entityType: 'product',
          entityId: product.id,
          productId: product.id,
          summary: `Bulk-published Iron Sprue product ${product.sku}.`,
          before: { publicationState: product.publicationState },
          after: { publicationState: 'PUBLISHED' },
        },
      });
    }
    return updated;
  });
}

export async function receiveIronSprueStock(
  productId: string,
  input: { receivedQuantity: number; damagedQuantity?: number; missingQuantity?: number; batchReference?: string; reason?: string },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  if (input.receivedQuantity < 0 || (input.damagedQuantity ?? 0) < 0 || (input.missingQuantity ?? 0) < 0) {
    throw new Error('Stock receipt quantities cannot be negative.');
  }
  const inventory = await client.ironSprueAdminInventory.findFirst({
    where: { productId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!inventory) throw new Error('Iron Sprue inventory record not found.');

  const received = input.receivedQuantity;
  const damaged = input.damagedQuantity ?? 0;
  const missing = input.missingQuantity ?? 0;
  const usableReceived = Math.max(received - damaged - missing, 0);
  const nextAvailable = inventory.availableStock + usableReceived;

  return client.$transaction(async (tx) => {
    const updated = await tx.ironSprueAdminInventory.update({
      where: { id: inventory.id },
      data: {
        receivedQuantity: { increment: received },
        damagedQuantity: { increment: damaged },
        missingQuantity: { increment: missing },
        availableStock: nextAvailable,
        lastReceivedAt: new Date(),
      },
    });
    await tx.ironSprueAdminStockMovement.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        productId,
        movementType: 'GOODS_RECEIVED',
        quantity: usableReceived,
        beforeQuantity: inventory.availableStock,
        afterQuantity: nextAvailable,
        reason: input.reason ?? 'Goods received',
        batchReference: input.batchReference ?? null,
        actorId: actor.id,
      },
    });
    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'inventory.goods_received',
        entityType: 'inventory',
        entityId: inventory.id,
        productId,
        summary: `Received ${received} Iron Sprue units.`,
        before: { availableStock: inventory.availableStock },
        after: { availableStock: nextAvailable, usableReceived, damagedQuantity: damaged, missingQuantity: missing },
      },
    });
    return updated;
  });
}

export async function adjustIronSprueStock(
  productId: string,
  input: { quantityDelta: number; movementType?: string | null; reason?: string | null; batchReference?: string | null },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const quantityDelta = Math.trunc(input.quantityDelta);
  if (!quantityDelta) throw new Error('Stock adjustment quantity cannot be zero.');
  const movementType = cleanNullable(input.movementType) ?? (quantityDelta > 0 ? 'STOCK_CORRECTION_IN' : 'STOCK_CORRECTION_OUT');
  if (!cleanNullable(input.reason)) throw new Error('Stock adjustment reason is required.');
  const inventory = await client.ironSprueAdminInventory.findFirst({
    where: { productId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!inventory) throw new Error('Iron Sprue inventory record not found.');
  const nextAvailable = inventory.availableStock + quantityDelta;
  if (nextAvailable < 0) throw new Error('Stock adjustment cannot reduce available stock below zero.');

  return client.$transaction(async (tx) => {
    const updated = await tx.ironSprueAdminInventory.update({
      where: { id: inventory.id },
      data: { availableStock: nextAvailable },
    });
    await tx.ironSprueAdminStockMovement.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        productId,
        movementType,
        quantity: quantityDelta,
        beforeQuantity: inventory.availableStock,
        afterQuantity: nextAvailable,
        reason: cleanNullable(input.reason)!,
        batchReference: cleanNullable(input.batchReference),
        actorId: actor.id,
      },
    });
    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'inventory.stock_adjustment',
        entityType: 'inventory',
        entityId: inventory.id,
        productId,
        summary: `Adjusted Iron Sprue stock by ${quantityDelta}.`,
        before: { availableStock: inventory.availableStock },
        after: { availableStock: nextAvailable, movementType, reason: cleanNullable(input.reason) },
      },
    });
    return updated;
  });
}

export function assertIronSpruePrimaryMediaRole(role: string) {
  if (role !== 'catalogue-primary') {
    throw new Error('Only approved Image 2 catalogue-primary media can become the storefront primary image.');
  }
}

export function assertIronSprueR2Bucket(bucketName: string) {
  if (bucketName !== 'iron-sprue-product-media') {
    throw new Error('Iron Sprue Admin media operations must use iron-sprue-product-media.');
  }
}

export function assertNoClientStoreOverride(input: { storeCode?: string | null }) {
  assertIronSprueStore(input.storeCode);
}

export async function listIronSprueAdminProducts(
  filters: {
    search?: string;
    brandId?: string;
    categoryId?: string;
    supplierId?: string;
    publicationState?: IronSpruePublicationState;
    featured?: boolean;
    newArrival?: boolean;
    specialOffer?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
  client = getIronSprueAdminPrisma(),
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const search = filters.search?.trim();
  const where: Prisma.IronSprueAdminProductWhereInput = {
    storeCode: IRON_SPRUE_STORE_CODE,
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.publicationState
      ? normalizePublicationState(filters.publicationState) === 'READY_TO_PUBLISH'
        ? { publicationState: { in: ['READY_TO_PUBLISH', 'READY'] } }
        : { publicationState: normalizePublicationState(filters.publicationState) }
      : {}),
    ...(typeof filters.featured === 'boolean' ? { featured: filters.featured } : {}),
    ...(typeof filters.newArrival === 'boolean' ? { newArrival: filters.newArrival } : {}),
    ...(typeof filters.specialOffer === 'boolean' ? { specialOffer: filters.specialOffer } : {}),
    ...(search
      ? {
          OR: [
            { customerTitle: { contains: search, mode: 'insensitive' } },
            { sourceTitle: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { supplierProductCode: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { mpn: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, products] = await Promise.all([
    client.ironSprueAdminProduct.count({ where }),
    client.ironSprueAdminProduct.findMany({
      where,
      include: adminProductListInclude,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    products: products.map((product) => {
      const readiness = getIronSprueProductReadiness(product);
      return {
        ...product,
        readiness,
        readinessState: readiness.publicationState,
        readinessBlockers: readiness.blockingReasons.map((reason) => reason.message),
      };
    }),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getIronSprueAdminReferenceData(client = getIronSprueAdminPrisma()) {
  const [categories, brands, suppliers] = await Promise.all([
    client.ironSprueAdminCategory.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    }),
    client.ironSprueAdminBrand.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    }),
    client.ironSprueAdminSupplier.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ name: 'asc' }],
      include: { _count: { select: { products: true } } },
    }),
  ]);

  return { categories, brands, suppliers };
}

export async function listIronSprueAdminInventory(client = getIronSprueAdminPrisma()) {
  await reconcileIronSprueInventoryAvailableStock(client);
  return client.ironSprueAdminInventory.findMany({
    where: { storeCode: IRON_SPRUE_STORE_CODE },
    orderBy: [{ availableStock: 'asc' }, { updatedAt: 'desc' }],
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          customerTitle: true,
          publicationState: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });
}

export async function listIronSprueAdminOrders(filters: { search?: string } = {}, client = getIronSprueAdminPrisma()) {
  const search = cleanNullable(filters.search);
  return client.ironSprueOrder.findMany({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      ...(search
        ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { shippingEmail: { contains: search, mode: 'insensitive' } },
            { shippingFullName: { contains: search, mode: 'insensitive' } },
            { items: { some: { OR: [
              { productSku: { contains: search, mode: 'insensitive' } },
              { productName: { contains: search, mode: 'insensitive' } },
            ] } } },
          ],
        }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      returns: {
        orderBy: { createdAt: 'desc' },
        include: { lines: { include: { orderItem: true } } },
      },
      customerRequests: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function updateIronSprueAdminOrderNotes(
  orderId: string,
  notes: string,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const order = await client.ironSprueOrder.findFirst({ where: { id: orderId, storeCode: IRON_SPRUE_STORE_CODE } });
  if (!order) throw new Error('Iron Sprue order not found.');
  const nextNotes = cleanNullable(notes);
  return client.$transaction(async (tx) => {
    const updated = await tx.ironSprueOrder.update({ where: { id: order.id }, data: { internalNotes: nextNotes } });
    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'order.internal_notes.update',
        entityType: 'order',
        entityId: order.id,
        summary: `Updated internal notes for Iron Sprue order ${order.orderNumber}.`,
        before: { internalNotes: order.internalNotes },
        after: { internalNotes: nextNotes },
      },
    });
    return updated;
  });
}

export type IronSprueOrderReturnLineInput = {
  orderItemId: string;
  quantity: number;
  restock?: boolean;
};

export type IronSprueManualOrderLineInput = {
  productId: string;
  quantity: number;
  unitPriceMinor?: number | null;
};

export type IronSprueManualOrderInput = {
  userId?: string | null;
  sourceChannel?: string | null;
  paymentMethodLabel?: string | null;
  externalReference?: string | null;
  placedAt?: Date | null;
  shippingMinor?: number | null;
  shippingMethodName?: string | null;
  shippingFullName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingRegion?: string | null;
  shippingPostalCode: string;
  shippingCountry?: string | null;
  lines: IronSprueManualOrderLineInput[];
};

function sanitizeManualOrderText(value: string | null | undefined, fallback?: string) {
  const cleaned = value?.trim();
  if (cleaned) return cleaned;
  if (fallback != null) return fallback;
  throw new Error('Required manual order field is missing.');
}

function resolveIronSprueOrderImage(product: Prisma.IronSprueAdminProductGetPayload<{ include: { mediaAssets: true } }>) {
  const image = [...product.mediaAssets]
    .filter((asset) => asset.approvalState === 'APPROVED')
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
      if (left.role === right.role) return left.sortOrder - right.sortOrder;
      if (left.role === 'catalogue-primary') return -1;
      if (right.role === 'catalogue-primary') return 1;
      return left.role.localeCompare(right.role);
    })[0];
  if (!image) return { imageUrl: null, imageStorageKey: null, imageAlt: product.customerTitle };
  return {
    imageUrl: cleanNullable(image.url),
    imageStorageKey: cleanNullable(image.storageKey),
    imageAlt: cleanNullable(image.altText) ?? product.customerTitle,
  };
}

export async function createIronSprueManualOrder(
  input: IronSprueManualOrderInput,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const sourceChannel = sanitizeManualOrderText(input.sourceChannel, 'MANUAL').toUpperCase().replace(/\s+/g, '_');
  const paymentMethodLabel = sanitizeManualOrderText(input.paymentMethodLabel, 'Manual payment');
  const shippingFullName = sanitizeManualOrderText(input.shippingFullName);
  const shippingEmail = sanitizeManualOrderText(input.shippingEmail).toLowerCase();
  const shippingLine1 = sanitizeManualOrderText(input.shippingLine1);
  const shippingCity = sanitizeManualOrderText(input.shippingCity);
  const shippingPostalCode = sanitizeManualOrderText(input.shippingPostalCode);
  const shippingCountry = sanitizeManualOrderText(input.shippingCountry, 'GB').toUpperCase();
  const placedAt = input.placedAt && !Number.isNaN(input.placedAt.getTime()) ? input.placedAt : new Date();
  const shippingMinor = Math.max(0, Math.trunc(input.shippingMinor ?? 0));
  const lines = input.lines
    .map((line) => ({
      productId: cleanNullable(line.productId),
      quantity: Math.trunc(line.quantity),
      unitPriceMinor: line.unitPriceMinor == null ? null : Math.max(0, Math.trunc(line.unitPriceMinor)),
    }))
    .filter((line): line is { productId: string; quantity: number; unitPriceMinor: number | null } => Boolean(line.productId) && line.quantity > 0);
  if (!lines.length) throw new Error('Choose at least one manual order product.');

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const products = await client.ironSprueAdminProduct.findMany({
    where: { storeCode: IRON_SPRUE_STORE_CODE, id: { in: productIds } },
    include: { inventory: true, mediaAssets: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  if (products.length !== productIds.length) throw new Error('One or more manual order products could not be found.');

  const normalizedLines = lines.map((line) => {
    const product = productById.get(line.productId);
    if (!product?.inventory) throw new Error('Manual order product has no inventory record.');
    const unitPriceMinor = line.unitPriceMinor ?? product.grossPriceMinor ?? 0;
    if (unitPriceMinor <= 0) throw new Error(`Manual order price is required for ${product.sku}.`);
    return {
      product,
      quantity: line.quantity,
      unitPriceMinor,
      totalMinor: unitPriceMinor * line.quantity,
      image: resolveIronSprueOrderImage(product),
    };
  });

  const subtotalMinor = normalizedLines.reduce((sum, line) => sum + line.totalMinor, 0);
  const taxMinor = calculateVatEstimateMinor(subtotalMinor);
  const totalMinor = subtotalMinor + shippingMinor;
  const orderNumber = generateIronSprueOrderNumber(placedAt);
  const checkoutAttemptId = `manual-${randomUUID()}`;

  return client.$transaction(async (tx) => {
    for (const line of normalizedLines) {
      const inventory = await tx.ironSprueAdminInventory.findUnique({ where: { productId: line.product.id } });
      if (!inventory || inventory.storeCode !== IRON_SPRUE_STORE_CODE) throw new Error('Manual order inventory record is missing.');
      if (inventory.availableStock < line.quantity) {
        throw new Error(`Insufficient sellable stock for ${line.product.sku}.`);
      }
      const afterQuantity = inventory.availableStock - line.quantity;
      await tx.ironSprueAdminInventory.update({
        where: { productId: line.product.id },
        data: { availableStock: afterQuantity },
      });
      await tx.ironSprueAdminStockMovement.create({
        data: {
          storeCode: IRON_SPRUE_STORE_CODE,
          productId: line.product.id,
          movementType: 'MANUAL_ORDER_SALE',
          quantity: -line.quantity,
          beforeQuantity: inventory.availableStock,
          afterQuantity,
          reason: `Manual order ${orderNumber}`,
          batchReference: cleanNullable(input.externalReference),
          actorId: actor.id,
        },
      });
    }

    const order = await tx.ironSprueOrder.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        orderNumber,
        userId: cleanNullable(input.userId),
        status: 'PAID',
        paymentStatus: 'SUCCEEDED',
        fulfilmentStatus: 'PENDING',
        paymentProvider: 'MANUAL',
        sourceChannel,
        paymentMethodLabel,
        externalReference: cleanNullable(input.externalReference),
        checkoutAttemptId,
        subtotalMinor,
        shippingMinor,
        taxMinor,
        totalMinor,
        currency: 'GBP',
        shippingMethodCode: 'manual',
        shippingMethodName: cleanNullable(input.shippingMethodName) ?? 'Manual delivery',
        shippingMethodAmountMinor: shippingMinor,
        shippingFullName,
        shippingEmail,
        shippingLine1,
        shippingLine2: cleanNullable(input.shippingLine2),
        shippingCity,
        shippingRegion: cleanNullable(input.shippingRegion),
        shippingPostalCode,
        shippingCountry,
        placedAt,
        paidAt: placedAt,
        createdAt: placedAt,
        items: {
          create: normalizedLines.map((line) => ({
            productId: line.product.id,
            productName: line.product.customerTitle,
            productSlug: line.product.slug,
            productSku: line.product.sku,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            totalMinor: line.totalMinor,
            imageUrl: line.image.imageUrl,
            imageAlt: line.image.imageAlt,
            imageStorageKey: line.image.imageStorageKey,
          })),
        },
      },
      include: { items: true },
    });

    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'order.manual.create',
        entityType: 'order',
        entityId: order.id,
        summary: `Created manual Iron Sprue order ${order.orderNumber}.`,
        after: { orderNumber, sourceChannel, paymentMethodLabel, totalMinor, lineCount: normalizedLines.length },
      },
    });

    return order;
  });
}

export async function createIronSprueCustomerOrderRequest(
  input: {
    userId: string;
    orderNumber: string;
    requestType: 'CANCELLATION' | 'RETURN';
    reason: string;
    customerMessage?: string | null;
  },
  client = getIronSprueAdminPrisma(),
) {
  const orderNumber = sanitizeManualOrderText(input.orderNumber);
  const reason = sanitizeManualOrderText(input.reason);
  const requestType = input.requestType;
  const order = await client.ironSprueOrder.findFirst({
    where: { storeCode: IRON_SPRUE_STORE_CODE, orderNumber, userId: input.userId },
  });
  if (!order) throw new Error('Iron Sprue order not found.');
  if (order.cancelledAt || ['CANCELLED', 'CANCELED', 'REFUNDED'].includes(order.status) || ['CANCELED', 'REFUNDED'].includes(order.paymentStatus)) {
    throw new Error('This order is already closed.');
  }
  if (requestType === 'CANCELLATION' && ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.fulfilmentStatus)) {
    throw new Error('This order has already been dispatched. Use a return request instead.');
  }
  if (requestType === 'RETURN' && !['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.fulfilmentStatus)) {
    throw new Error('Returns can be requested once the order has been dispatched.');
  }

  const existingOpen = await client.ironSprueOrderCustomerRequest.findFirst({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      orderId: order.id,
      requestType,
      status: 'OPEN',
    },
  });
  if (existingOpen) return existingOpen;

  return client.$transaction(async (tx) => {
    const request = await tx.ironSprueOrderCustomerRequest.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        orderId: order.id,
        userId: input.userId,
        requestType,
        reason,
        customerMessage: cleanNullable(input.customerMessage),
      },
    });
    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: input.userId,
        action: `order.customer_request.${requestType.toLowerCase()}`,
        entityType: 'order-request',
        entityId: request.id,
        summary: `Customer submitted ${requestType.toLowerCase()} request for Iron Sprue order ${order.orderNumber}.`,
        after: { orderNumber: order.orderNumber, requestType, reason },
      },
    });
    return request;
  });
}

export async function resolveIronSprueCustomerOrderRequest(
  input: {
    requestId: string;
    status: 'RESOLVED' | 'DECLINED';
    adminNotes?: string | null;
  },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const requestId = sanitizeManualOrderText(input.requestId);
  const status = input.status;
  if (!requestId) throw new Error('requestId is required.');
  if (!['RESOLVED', 'DECLINED'].includes(status)) throw new Error('Invalid request status.');

  return client.$transaction(async (tx) => {
    const request = await tx.ironSprueOrderCustomerRequest.findFirst({
      where: { id: requestId, storeCode: IRON_SPRUE_STORE_CODE },
      include: { order: true },
    });
    if (!request) throw new Error('Customer request not found.');
    if (request.status !== 'OPEN') return request;

    const updated = await tx.ironSprueOrderCustomerRequest.update({
      where: { id: request.id },
      data: {
        status,
        adminNotes: cleanNullable(input.adminNotes),
        resolvedAt: new Date(),
      },
      include: { order: true },
    });
    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: `order.customer_request.${status.toLowerCase()}`,
        entityType: 'order-request',
        entityId: request.id,
        summary: `Marked ${request.requestType.toLowerCase()} request for Iron Sprue order ${request.order.orderNumber} as ${status.toLowerCase()}.`,
        after: {
          orderNumber: request.order.orderNumber,
          requestType: request.requestType,
          status,
          adminNotes: cleanNullable(input.adminNotes),
        },
      },
    });
    return updated;
  });
}

export async function processIronSprueOrderReturn(
  input: {
    orderId: string;
    reference?: string | null;
    notes?: string | null;
    condition?: string | null;
    refundAmountMinor?: number | null;
    lines: IronSprueOrderReturnLineInput[];
    environment?: 'test' | 'live';
  },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const order = await client.ironSprueOrder.findFirst({
    where: { id: input.orderId, storeCode: IRON_SPRUE_STORE_CODE },
    include: { items: true, returns: { include: { lines: true } } },
  });
  if (!order) throw new Error('Iron Sprue order not found.');
  if (order.paymentStatus !== 'SUCCEEDED' && order.paymentStatus !== 'REFUNDED') {
    throw new Error('Only paid Iron Sprue orders can be returned/refunded.');
  }

  const quantitiesByItem = new Map<string, { quantity: number; restock: boolean }>();
  for (const line of input.lines) {
    const quantity = Math.trunc(line.quantity);
    if (quantity <= 0) continue;
    const existing = quantitiesByItem.get(line.orderItemId);
    quantitiesByItem.set(line.orderItemId, {
      quantity: (existing?.quantity ?? 0) + quantity,
      restock: Boolean(line.restock || existing?.restock),
    });
  }
  if (!quantitiesByItem.size) throw new Error('Choose at least one returned item quantity.');

  const previouslyReturnedByItem = new Map<string, number>();
  for (const returnRecord of order.returns) {
    for (const line of returnRecord.lines) {
      previouslyReturnedByItem.set(line.orderItemId, (previouslyReturnedByItem.get(line.orderItemId) ?? 0) + line.quantity);
    }
  }

  const selectedLines = [...quantitiesByItem.entries()].map(([orderItemId, line]) => {
    const orderItem = order.items.find((item) => item.id === orderItemId);
    if (!orderItem) throw new Error('Return line does not belong to this order.');
    const remaining = orderItem.quantity - (previouslyReturnedByItem.get(orderItemId) ?? 0);
    if (line.quantity > remaining) throw new Error(`Return quantity for ${orderItem.productSku} exceeds the remaining purchased quantity.`);
    return { orderItem, quantity: line.quantity, restock: line.restock };
  });

  const refundAmountMinor = Math.max(0, Math.trunc(input.refundAmountMinor ?? 0));
  if (refundAmountMinor <= 0) throw new Error('Refund amount is required for a return.');

  const refundResult = await refundIronSprueOrderForMerchant({
    orderId: order.id,
    amountMinor: refundAmountMinor,
    reason: input.notes ?? input.reference ?? 'Returned goods',
    actorId: actor.email ?? actor.id,
    idempotencyKey: `iron-sprue-return-${order.id}-${cleanNullable(input.reference) ?? selectedLines.map((line) => `${line.orderItem.id}:${line.quantity}:${line.restock ? 'r' : 'n'}`).join('|')}-${refundAmountMinor}`,
    ...(input.environment ? { environment: input.environment } : {}),
  });

  return client.$transaction(async (tx) => {
    const returnRecord = await tx.ironSprueOrderReturn.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        orderId: order.id,
        status: 'RECEIVED',
        reference: cleanNullable(input.reference),
        notes: cleanNullable(input.notes),
        condition: cleanNullable(input.condition),
        restock: selectedLines.some((line) => line.restock),
        refundAmountMinor,
        refundStatus: 'REFUNDED',
        stripeRefundId: refundResult.refund.id,
        receivedAt: new Date(),
        refundedAt: new Date(),
        lines: {
          create: selectedLines.map((line) => ({
            orderItemId: line.orderItem.id,
            productId: line.orderItem.productId,
            quantity: line.quantity,
            restock: line.restock,
          })),
        },
      },
      include: { lines: true },
    });

    for (const line of selectedLines.filter((item) => item.restock)) {
      const inventory = await tx.ironSprueAdminInventory.findUnique({ where: { productId: line.orderItem.productId } });
      if (!inventory) continue;
      const afterQuantity = inventory.availableStock + line.quantity;
      await tx.ironSprueAdminInventory.update({
        where: { productId: line.orderItem.productId },
        data: { availableStock: afterQuantity },
      });
      await tx.ironSprueAdminStockMovement.create({
        data: {
          storeCode: IRON_SPRUE_STORE_CODE,
          productId: line.orderItem.productId,
          movementType: 'RETURN_RESTOCK',
          quantity: line.quantity,
          beforeQuantity: inventory.availableStock,
          afterQuantity,
          reason: `Return restock for ${order.orderNumber}`,
          batchReference: returnRecord.reference,
          actorId: actor.id,
        },
      });
    }

    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'order.return.process',
        entityType: 'order-return',
        entityId: returnRecord.id,
        summary: `Processed return for Iron Sprue order ${order.orderNumber}.`,
        after: {
          orderNumber: order.orderNumber,
          refundAmountMinor,
          lineCount: selectedLines.length,
          restockedQuantity: selectedLines.filter((line) => line.restock).reduce((sum, line) => sum + line.quantity, 0),
        },
      },
    });

    return returnRecord;
  });
}

const ironSprueFulfilmentStates = ['PENDING', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as const;

export type IronSprueAdminFulfilmentState = (typeof ironSprueFulfilmentStates)[number];

export function isIronSprueAdminFulfilmentState(value: string): value is IronSprueAdminFulfilmentState {
  return ironSprueFulfilmentStates.includes(value as IronSprueAdminFulfilmentState);
}

export async function updateIronSprueAdminOrderFulfilmentStatus(
  orderId: string,
  nextState: IronSprueAdminFulfilmentState,
  actor: IronSprueAdminUser,
  trackingOrClient: IronSprueFulfilmentTrackingInput | IronSprueAdminDbClient = {},
  maybeClient?: IronSprueAdminDbClient,
) {
  const trackingInput = isIronSprueAdminDbClient(trackingOrClient) ? {} : trackingOrClient;
  const client = isIronSprueAdminDbClient(trackingOrClient)
    ? trackingOrClient
    : maybeClient ?? getIronSprueAdminPrisma();
  const order = await client.ironSprueOrder.findFirst({
    where: { id: orderId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!order) throw new Error('Iron Sprue order not found.');
  const canFulfil = order.paymentStatus === 'SUCCEEDED'
    && !order.cancelledAt
    && order.fulfilmentStatus !== 'CANCELLED'
    && nextState !== 'CANCELLED'
    && !['CANCELED', 'FAILED', 'REFUNDED'].includes(order.status);
  if (!canFulfil) throw new Error('Only paid Iron Sprue orders can be fulfilled.');

  const trackingCarrier = cleanTrackingValue(trackingInput.trackingCarrier);
  const trackingNumber = cleanTrackingValue(trackingInput.trackingNumber);
  const trackingUrl = buildIronSprueTrackingUrl(trackingCarrier, trackingNumber, trackingInput.trackingUrl);
  const resolvedTrackingCarrier = trackingCarrier ?? order.trackingCarrier;
  const resolvedTrackingNumber = trackingNumber ?? order.trackingNumber;
  const resolvedTrackingUrl = trackingUrl ?? order.trackingUrl;

  if (nextState === 'SHIPPED' && (!resolvedTrackingCarrier || !resolvedTrackingNumber)) {
    throw new Error('Courier and tracking number are required to mark an Iron Sprue order dispatched.');
  }
  const dispatchedAt = nextState === 'SHIPPED' ? (order.dispatchedAt ?? new Date()) : order.dispatchedAt;
  const fulfilledAt = ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(nextState) ? (order.fulfilledAt ?? dispatchedAt ?? new Date()) : order.fulfilledAt;

  return client.$transaction(async (tx) => {
    const updated = await tx.ironSprueOrder.update({
      where: { id: order.id },
      data: {
        fulfilmentStatus: nextState,
        status: nextState === 'COMPLETED' ? 'COMPLETED' : order.status,
        fulfilledAt,
        dispatchedAt,
        trackingCarrier: nextState === 'SHIPPED' ? resolvedTrackingCarrier : order.trackingCarrier,
        trackingNumber: nextState === 'SHIPPED' ? resolvedTrackingNumber : order.trackingNumber,
        trackingUrl: nextState === 'SHIPPED' ? resolvedTrackingUrl : order.trackingUrl,
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'order.fulfilment_status.change',
        entityType: 'order',
        entityId: order.id,
        summary: `Changed Iron Sprue order ${order.orderNumber} fulfilment to ${nextState}.`,
        before: {
          fulfilmentStatus: order.fulfilmentStatus,
          trackingCarrier: order.trackingCarrier,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
        },
        after: {
          fulfilmentStatus: nextState,
          trackingCarrier: updated.trackingCarrier,
          trackingNumber: updated.trackingNumber,
          trackingUrl: updated.trackingUrl,
          dispatchedAt: updated.dispatchedAt,
        },
      },
    });

    return updated;
  });
}

export async function listIronSprueAdminMediaAssets(
  filters: { approvalState?: string; role?: string; pageSize?: number } = {},
  client = getIronSprueAdminPrisma(),
): Promise<IronSprueAdminMediaReviewItem[]> {
  const pageSize = Math.min(500, Math.max(1, filters.pageSize ?? 160));
  const records = await client.ironSprueAdminMediaAsset.findMany({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      ...(filters.approvalState ? { approvalState: filters.approvalState } : {}),
      ...(filters.role ? { role: filters.role } : {}),
    },
    orderBy: [{ product: { sku: 'asc' } }, { role: 'asc' }, { approvalState: 'asc' }, { updatedAt: 'desc' }],
    take: pageSize,
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          customerTitle: true,
          shortDescription: true,
          fullDescription: true,
          featureBullets: true,
          specifications: true,
          seoTitle: true,
          metaDescription: true,
          buildType: true,
          publicationState: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });
  return records
    .filter((asset) => filters.approvalState === 'REJECTED' || !['REJECTED', 'FAILED'].includes(asset.approvalState))
    .filter((asset) => isIronSprueOperationalMediaRole(asset.role))
    .filter(isIronSprueDisplayableImageAsset)
    .slice(0, pageSize);
}

export async function createIronSprueAdminMediaAsset(
  input: IronSprueAdminMediaAssetInput,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const role = cleanNullable(input.role);
  if (!role) throw new Error('Media role is required.');
  const productId = cleanNullable(input.productId);
  if (productId) {
    const product = await client.ironSprueAdminProduct.findFirst({
      where: { id: productId, storeCode: IRON_SPRUE_STORE_CODE },
      select: { id: true, sku: true },
    });
    if (!product) throw new Error('Iron Sprue product not found for media upload.');
  }

  const storageKey = cleanNullable(input.storageKey);
  const url = cleanNullable(input.url);
  if (!storageKey && !url) throw new Error('Media upload requires either a storage key or URL.');

  const data = {
    storeCode: IRON_SPRUE_STORE_CODE,
    productId,
    role,
    storageKey,
    url,
    altText: cleanNullable(input.altText),
    mimeType: cleanNullable(input.mimeType),
    byteSize: input.byteSize ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    approvalState: cleanNullable(input.approvalState) ?? 'REVIEW_REQUIRED',
    isPrimary: Boolean(input.isPrimary),
    sortOrder: input.sortOrder ?? 0,
    uploadedById: actor.id,
  };

  const record = storageKey
    ? await client.ironSprueAdminMediaAsset.upsert({
        where: { storeCode_storageKey: { storeCode: IRON_SPRUE_STORE_CODE, storageKey } },
        create: data,
        update: data,
      })
    : await client.ironSprueAdminMediaAsset.create({ data });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'media.upload',
      entityType: 'media',
      entityId: record.id,
      productId: record.productId,
      summary: `Uploaded Iron Sprue ${record.role} media for review.`,
      after: { role: record.role, storageKey: record.storageKey, approvalState: record.approvalState },
    },
  });

  if (record.productId) {
    await synchronizeIronSprueProductPublicationReadiness(record.productId, actor, client);
  }

  return record;
}

function normalizedIronSprueSku(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizedIronSprueProductCode(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function inferIronSprueProductCodeFromPathSku(value: string | null | undefined) {
  const normalized = normalizedIronSprueSku(value);
  const matches = [...normalized.matchAll(/(?:^|-)([a-z]{0,3}\d{2,6}[a-z]?)(?=-|$)/gi)]
    .map((match) => normalizedIronSprueProductCode(match[1]))
    .filter(Boolean);
  return matches.at(-1) ?? '';
}

function inferIronSprueR2ProductMedia(key: string): { sku: string; role: string; sortOrder: number } | null {
  const cleanKey = key.trim().replace(/^\/+/, '');
  if (!/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(cleanKey)) return null;
  const parts = cleanKey.split('/');
  if (parts[0] === 'archive' && parts[1] === 'products' && parts[2] && parts[3]) {
    const roleFolder = parts[3].toLowerCase();
    if (roleFolder === 'original' || roleFolder === 'manufacturer-original') {
      return { sku: normalizedIronSprueSku(parts[2]), role: 'manufacturer-original', sortOrder: 40 };
    }
    return null;
  }
  if (parts[0] !== 'products' || !parts[1] || !parts[2]) return null;
  const roleFolder = parts[2].toLowerCase();
  if (roleFolder === 'image-2') return { sku: normalizedIronSprueSku(parts[1]), role: 'catalogue-primary', sortOrder: 0 };
  if (roleFolder === 'workshop') return { sku: normalizedIronSprueSku(parts[1]), role: 'workshop-photography', sortOrder: 20 };
  if (roleFolder === 'original' || roleFolder === 'manufacturer-original') return { sku: normalizedIronSprueSku(parts[1]), role: 'manufacturer-original', sortOrder: 40 };
  return null;
}

export async function reconcileIronSprueR2ProductMedia(
  objects: IronSprueR2ProductMediaObject[],
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
): Promise<IronSprueR2MediaReconciliationResult> {
  const objectKeys = [...new Set(objects.map((object) => object.key.trim().replace(/^\/+/, '')).filter(Boolean))];
  const products = await client.ironSprueAdminProduct.findMany({
    where: { storeCode: IRON_SPRUE_STORE_CODE },
    include: productReadinessInclude,
    orderBy: { sku: 'asc' },
  });
  const existingMediaRows = objectKeys.length
    ? await client.ironSprueAdminMediaAsset.findMany({
        where: { storeCode: IRON_SPRUE_STORE_CODE, storageKey: { in: objectKeys } },
        select: { id: true, productId: true, role: true, storageKey: true, approvalState: true, isPrimary: true },
      })
    : [];
  const existingMediaByStorageKey = new Map(existingMediaRows.map((asset) => [asset.storageKey, asset]));
  const productsBySku = new Map(products.map((product) => [normalizedIronSprueSku(product.sku), product]));
  const productsByCode = new Map<string, typeof products>();
  for (const product of products) {
    const codes = [
      inferIronSprueProductCodeFromPathSku(product.sku),
      normalizedIronSprueProductCode(product.supplierProductCode),
      normalizedIronSprueProductCode(product.mpn),
    ].filter(Boolean);
    for (const code of new Set(codes)) {
      productsByCode.set(code, [...(productsByCode.get(code) ?? []), product]);
    }
  }
  const findProductForR2Sku = (sku: string) => {
    const normalized = normalizedIronSprueSku(sku);
    const exact = productsBySku.get(normalized);
    if (exact) return exact;
    const matches = products.filter((product) => {
      const productSku = normalizedIronSprueSku(product.sku);
      return normalized.startsWith(`${productSku}-`);
    });
    if (matches.length === 1) return matches[0];
    const pathCode = inferIronSprueProductCodeFromPathSku(normalized);
    const codeMatches = pathCode ? (productsByCode.get(pathCode) ?? []) : [];
    return codeMatches.length === 1 ? codeMatches[0] : null;
  };
  const candidateGroups = new Map<string, Array<IronSprueR2ProductMediaObject & { role: string; sku: string; sortOrder: number }>>();
  const unmatched: IronSprueR2MediaReconciliationResult['unmatched'] = [];
  const ambiguous: IronSprueR2MediaReconciliationResult['ambiguous'] = [];

  for (const object of objects) {
    const key = object.key.trim().replace(/^\/+/, '');
    const existing = existingMediaByStorageKey.get(key);
    if (existing?.approvalState === 'REJECTED' || existing?.approvalState === 'FAILED') {
      unmatched.push({ key, reason: `Existing canonical media row is ${existing.approvalState}; reconciliation will not resurface it.` });
      continue;
    }
    const candidate = inferIronSprueR2ProductMedia(key);
    if (!candidate) {
      unmatched.push({ key, reason: 'Not a supported displayable product image path.' });
      continue;
    }
    const product = findProductForR2Sku(candidate.sku);
    if (!product) {
      unmatched.push({ key, reason: 'No canonical Railway product exists for the SKU in this R2 path.' });
      continue;
    }
    const mapKey = `${product.id}:${candidate.role}`;
    candidateGroups.set(mapKey, [...(candidateGroups.get(mapKey) ?? []), { ...object, key, ...candidate }]);
  }

  const affectedProductIds = new Set<string>();
  let upsertedMedia = 0;
  let matchedObjects = 0;

  for (const product of products) {
    for (const role of ['catalogue-primary', 'workshop-photography', 'manufacturer-original']) {
      const candidates = [...(candidateGroups.get(`${product.id}:${role}`) ?? [])]
        .sort((left, right) => {
          const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
          const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
          return rightTime - leftTime || left.key.localeCompare(right.key);
        });
      if (!candidates.length) continue;
      const approvedRoleAlreadyExists = product.mediaAssets.some(
        (asset) => asset.role === role && asset.approvalState === 'APPROVED' && isIronSprueDisplayableImageAsset(asset),
      );
      if (approvedRoleAlreadyExists) {
        unmatched.push(...candidates.map((candidate) => ({
          key: candidate.key,
          reason: `Product already has approved ${role} media; reconciliation will not add duplicate operational media.`,
        })));
        continue;
      }

      if (candidates.length > 1) {
        ambiguous.push({
          sku: product.sku,
          role,
          keys: candidates.map((candidate) => candidate.key),
          reason: `Multiple ${role} R2 image candidates exist; choose the correct product image manually so reconciliation does not add duplicates or cropped/mismatched derivatives.`,
        });
        continue;
      }

      for (const candidate of candidates) {
        matchedObjects += 1;
        const isPrimary = role === 'catalogue-primary';
        const approvalState = 'APPROVED';
        const record = await client.ironSprueAdminMediaAsset.upsert({
          where: { storeCode_storageKey: { storeCode: IRON_SPRUE_STORE_CODE, storageKey: candidate.key } },
          create: {
            storeCode: IRON_SPRUE_STORE_CODE,
            productId: product.id,
            role,
            url: `r2://${candidate.key}`,
            storageKey: candidate.key,
            altText: `${product.customerTitle} ${role.replace(/-/g, ' ')}`,
            mimeType: inferIronSprueImageMimeType(candidate.key),
            byteSize: candidate.size ?? null,
            approvalState,
            isPrimary,
            sortOrder: candidate.sortOrder,
            uploadedById: actor.id,
            approvedById: actor.id,
            approvedAt: new Date(),
            lastError: null,
          },
          update: {
            productId: product.id,
            role,
            url: `r2://${candidate.key}`,
            altText: `${product.customerTitle} ${role.replace(/-/g, ' ')}`,
            mimeType: inferIronSprueImageMimeType(candidate.key),
            byteSize: candidate.size ?? null,
            approvalState,
            isPrimary,
            sortOrder: candidate.sortOrder,
            uploadedById: actor.id,
            approvedById: actor.id,
            approvedAt: new Date(),
            lastError: null,
          },
        });
        upsertedMedia += 1;
        affectedProductIds.add(product.id);

        if (isPrimary) {
          await client.ironSprueAdminMediaAsset.updateMany({
            where: {
              storeCode: IRON_SPRUE_STORE_CODE,
              productId: product.id,
              role: 'catalogue-primary',
              id: { not: record.id },
            },
            data: { isPrimary: false },
          });
        }
      }
    }
  }

  for (const productId of affectedProductIds) {
    await synchronizeIronSprueProductPublicationReadiness(productId, actor, client);
  }

  if (upsertedMedia > 0) {
    await client.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'media.r2_reconciliation',
        entityType: 'media',
        summary: `Reconciled ${upsertedMedia} existing R2 Iron Sprue media object${upsertedMedia === 1 ? '' : 's'} into canonical product media.`,
        after: {
          scannedObjects: objects.length,
          matchedObjects,
          upsertedMedia,
          affectedProducts: affectedProductIds.size,
          unmatchedCount: unmatched.length,
          ambiguousCount: ambiguous.length,
        },
      },
    });
  }

  return {
    scannedObjects: objects.length,
    matchedObjects,
    upsertedMedia,
    affectedProducts: affectedProductIds.size,
    unmatched,
    ambiguous,
  };
}

export async function listIronSprueAdminContentReviews(
  filters: { status?: string; pageSize?: number } = {},
  client = getIronSprueAdminPrisma(),
): Promise<IronSprueAdminContentReviewItem[]> {
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 60));
  return client.ironSprueAdminContentReview.findMany({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: pageSize,
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          customerTitle: true,
          shortDescription: true,
          fullDescription: true,
          featureBullets: true,
          specifications: true,
          seoTitle: true,
          metaDescription: true,
          buildType: true,
          publicationState: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });
}

export async function updateIronSprueAdminMediaApproval(
  mediaId: string,
  nextState: 'APPROVED' | 'REJECTED' | 'REVIEW_REQUIRED',
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const media = await client.ironSprueAdminMediaAsset.findFirst({
    where: { id: mediaId, storeCode: IRON_SPRUE_STORE_CODE },
    include: { product: true },
  });
  if (!media) throw new Error('Iron Sprue media asset not found.');
  if (nextState === 'APPROVED' && media.role === 'catalogue-primary' && !isIronSprueDisplayableImageAsset(media)) {
    throw new Error('Only image files can be approved as catalogue-primary storefront media.');
  }

  const now = new Date();
  if (nextState === 'APPROVED' && media.productId && media.role === 'catalogue-primary') {
    await client.ironSprueAdminMediaAsset.updateMany({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        productId: media.productId,
        role: 'catalogue-primary',
        id: { not: media.id },
      },
      data: { isPrimary: false },
    });
  }

  const updated = await client.ironSprueAdminMediaAsset.update({
    where: { id: media.id },
    data: {
      approvalState: nextState,
      approvedById: nextState === 'APPROVED' ? actor.id : null,
      approvedAt: nextState === 'APPROVED' ? now : null,
      isPrimary: nextState === 'APPROVED' && media.role === 'catalogue-primary',
    },
  });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'media.approval_state.change',
      entityType: 'media',
      entityId: media.id,
      productId: media.productId,
      summary: `Changed Iron Sprue media ${media.role} to ${nextState}.`,
      before: { approvalState: media.approvalState, isPrimary: media.isPrimary },
      after: { approvalState: nextState, isPrimary: updated.isPrimary },
    },
  });

  if (media.productId) {
    await synchronizeIronSprueProductPublicationReadiness(media.productId, actor, client);
  }

  return updated;
}

export async function promoteIronSprueAdminMediaToCataloguePrimary(
  mediaId: string,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const media = await client.ironSprueAdminMediaAsset.findFirst({
    where: { id: mediaId, storeCode: IRON_SPRUE_STORE_CODE },
    include: { product: { select: { id: true, sku: true, customerTitle: true } } },
  });
  if (!media?.productId || !media.product) throw new Error('Iron Sprue media must be linked to a product before it can be used as the public image.');
  if (!isIronSprueDisplayableImageAsset(media)) throw new Error('Only real image files can be used as catalogue-primary storefront media.');
  if (media.approvalState === 'REJECTED' || media.approvalState === 'FAILED') throw new Error('Rejected or failed media cannot be used as the public image.');

  const product = media.product;
  const productId = media.productId;
  const storageKey = cleanNullable(media.storageKey);
  const sourceUrl = cleanNullable(media.url) ?? (storageKey ? `r2://${storageKey}` : null);
  if (!sourceUrl) throw new Error('Media must have a storage key or URL before it can be used as the public image.');
  const now = new Date();

  const promoted = await client.$transaction(async (tx) => {
    await tx.ironSprueAdminMediaAsset.updateMany({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        productId,
        role: 'catalogue-primary',
      },
      data: { isPrimary: false },
    });

    const existing = await tx.ironSprueAdminMediaAsset.findFirst({
      where: {
        storeCode: IRON_SPRUE_STORE_CODE,
        productId,
        role: 'catalogue-primary',
        OR: [
          { url: sourceUrl },
          ...(storageKey ? [{ storageKey }] : []),
        ],
      },
    });

    const promoted = existing
      ? await tx.ironSprueAdminMediaAsset.update({
          where: { id: existing.id },
          data: {
            approvalState: 'APPROVED',
            approvedById: actor.id,
            approvedAt: now,
            isPrimary: true,
            altText: cleanNullable(existing.altText) ?? cleanNullable(media.altText) ?? `${product.customerTitle} catalogue primary`,
            mimeType: cleanNullable(existing.mimeType) ?? cleanNullable(media.mimeType) ?? inferIronSprueImageMimeType(sourceUrl),
            byteSize: existing.byteSize ?? media.byteSize,
            width: existing.width ?? media.width,
            height: existing.height ?? media.height,
          },
        })
      : await tx.ironSprueAdminMediaAsset.create({
          data: {
            storeCode: IRON_SPRUE_STORE_CODE,
            productId,
            role: 'catalogue-primary',
            url: sourceUrl,
            storageKey: null,
            altText: cleanNullable(media.altText) ?? `${product.customerTitle} catalogue primary`,
            mimeType: cleanNullable(media.mimeType) ?? inferIronSprueImageMimeType(sourceUrl),
            byteSize: media.byteSize,
            width: media.width,
            height: media.height,
            approvalState: 'APPROVED',
            isPrimary: true,
            sortOrder: 0,
            uploadedById: actor.id,
            approvedById: actor.id,
            approvedAt: now,
          },
        });

    if (media.approvalState !== 'APPROVED') {
      await tx.ironSprueAdminMediaAsset.update({
        where: { id: media.id },
        data: { approvalState: 'APPROVED', approvedById: actor.id, approvedAt: now },
      });
    }

    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'media.catalogue_primary.promote',
        entityType: 'media',
        entityId: promoted.id,
        productId,
        summary: `Promoted Iron Sprue ${media.role} media to catalogue-primary for ${product.sku}.`,
        before: { sourceMediaId: media.id, sourceRole: media.role, sourceApprovalState: media.approvalState },
        after: { promotedMediaId: promoted.id, role: promoted.role, approvalState: promoted.approvalState, isPrimary: promoted.isPrimary },
      },
    });

    return promoted;
  });

  await synchronizeIronSprueProductPublicationReadiness(productId, actor, client);
  return promoted;
}

export async function updateIronSprueAdminContentReviewStatus(
  reviewId: string,
  nextStatus: 'APPROVED' | 'REJECTED' | 'CONFLICT' | 'PENDING',
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const review = await client.ironSprueAdminContentReview.findFirst({
    where: { id: reviewId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!review) throw new Error('Iron Sprue content review not found.');

  const updated = await client.$transaction(async (tx) => {
    const updated = await tx.ironSprueAdminContentReview.update({
      where: { id: review.id },
      data: {
        status: nextStatus,
        reviewedById: nextStatus === 'PENDING' ? null : actor.id,
        reviewedAt: nextStatus === 'PENDING' ? null : new Date(),
      },
    });

    await tx.ironSprueAdminAuditLog.create({
      data: {
        storeCode: IRON_SPRUE_STORE_CODE,
        actorId: actor.id,
        action: 'content_review.status.change',
        entityType: 'content-review',
        entityId: review.id,
        productId: review.productId,
        summary: `Changed Iron Sprue content review ${review.fieldName} to ${nextStatus}.`,
        before: { status: review.status },
        after: { status: nextStatus },
      },
    });

    return updated;
  });

  await synchronizeIronSprueProductPublicationReadiness(review.productId, actor, client);
  return updated;
}

export async function updateIronSprueAdminProductFlags(
  productId: string,
  flags: {
    featured?: boolean;
    newArrival?: boolean;
    comingSoon?: boolean;
    specialOffer?: boolean;
    hideWhenOutOfStock?: boolean;
  },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const product = await client.ironSprueAdminProduct.findFirst({
    where: { id: productId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!product) throw new Error('Iron Sprue product not found.');

  const updated = await client.ironSprueAdminProduct.update({
    where: { id: product.id },
    data: {
      featured: flags.featured ?? product.featured,
      newArrival: flags.newArrival ?? product.newArrival,
      comingSoon: flags.comingSoon ?? product.comingSoon,
      specialOffer: flags.specialOffer ?? product.specialOffer,
      hideWhenOutOfStock: flags.hideWhenOutOfStock ?? product.hideWhenOutOfStock,
      updatedById: actor.id,
    },
  });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'product.flags.update',
      entityType: 'product',
      entityId: product.id,
      productId: product.id,
      summary: `Updated Iron Sprue product flags for ${product.sku}.`,
      before: {
        featured: product.featured,
        newArrival: product.newArrival,
        comingSoon: product.comingSoon,
        specialOffer: product.specialOffer,
        hideWhenOutOfStock: product.hideWhenOutOfStock,
      },
      after: flags,
    },
  });

  return updated;
}

export async function updateIronSprueAdminBrandControls(
  brandId: string,
  input: { active?: boolean; featured?: boolean; sortOrder?: number; logoUrl?: string | null; logoAltText?: string | null },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const brand = await client.ironSprueAdminBrand.findFirst({
    where: { id: brandId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!brand) throw new Error('Iron Sprue brand not found.');

  const updated = await client.ironSprueAdminBrand.update({
    where: { id: brand.id },
    data: {
      active: input.active ?? brand.active,
      featured: input.featured ?? brand.featured,
      sortOrder: input.sortOrder ?? brand.sortOrder,
      logoUrl: cleanNullable(input.logoUrl) ?? brand.logoUrl,
      logoAltText: cleanNullable(input.logoAltText) ?? brand.logoAltText,
    },
  });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'brand.controls.update',
      entityType: 'brand',
      entityId: brand.id,
      summary: `Updated Iron Sprue brand controls for ${brand.name}.`,
      before: { active: brand.active, featured: brand.featured, sortOrder: brand.sortOrder, logoUrl: brand.logoUrl },
      after: { active: updated.active, featured: updated.featured, sortOrder: updated.sortOrder, logoUrl: updated.logoUrl },
    },
  });

  return updated;
}

export async function updateIronSprueAdminCategoryControls(
  categoryId: string,
  input: { active?: boolean; sortOrder?: number },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const category = await client.ironSprueAdminCategory.findFirst({
    where: { id: categoryId, storeCode: IRON_SPRUE_STORE_CODE },
  });
  if (!category) throw new Error('Iron Sprue category not found.');

  const updated = await client.ironSprueAdminCategory.update({
    where: { id: category.id },
    data: {
      active: input.active ?? category.active,
      sortOrder: input.sortOrder ?? category.sortOrder,
    },
  });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'category.controls.update',
      entityType: 'category',
      entityId: category.id,
      summary: `Updated Iron Sprue category controls for ${category.name}.`,
      before: { active: category.active, sortOrder: category.sortOrder },
      after: { active: updated.active, sortOrder: updated.sortOrder },
    },
  });

  return updated;
}

export const IRON_SPRUE_HERO_MERCHANDISING_BADGES = [
  'NONE',
  'IN_STOCK',
  'NEW',
  'SALE',
  'COMING_SOON',
  'PRE_ORDER',
  'FEATURED',
  'EXCLUSIVE',
] as const;

export type IronSprueHeroMerchandisingBadge = typeof IRON_SPRUE_HERO_MERCHANDISING_BADGES[number];

export const IRON_SPRUE_TYPOGRAPHY_OPTIONS = {
  headingFamily: ['IMPACT_CONDENSED', 'SYSTEM_SANS', 'SERIF_DISPLAY'],
  bodyFamily: ['SYSTEM_SANS', 'HUMANIST_SANS', 'SERIF'],
  headingWeight: ['BOLD', 'BLACK'],
  bodyWeight: ['REGULAR', 'MEDIUM'],
  headingScale: ['COMPACT', 'STANDARD', 'LARGE'],
  bodyScale: ['COMPACT', 'STANDARD', 'COMFORTABLE'],
} as const;

export const DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS = {
  headingFamily: 'IMPACT_CONDENSED',
  bodyFamily: 'SYSTEM_SANS',
  headingWeight: 'BLACK',
  bodyWeight: 'REGULAR',
  headingScale: 'STANDARD',
  bodyScale: 'STANDARD',
} as const;

export type IronSprueTypographySettingInput = {
  headingFamily?: typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS.headingFamily[number] | string | null;
  bodyFamily?: typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS.bodyFamily[number] | string | null;
  headingWeight?: typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS.headingWeight[number] | string | null;
  bodyWeight?: typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS.bodyWeight[number] | string | null;
  headingScale?: typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS.headingScale[number] | string | null;
  bodyScale?: typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS.bodyScale[number] | string | null;
};

function assertOption<T extends readonly string[]>(value: string | null | undefined, allowed: T, fallback: T[number], label: string): T[number] {
  const cleaned = value?.trim().toUpperCase().replace(/[\s-]+/g, '_') || fallback;
  if (!allowed.includes(cleaned)) {
    throw new Error(`Unsupported Iron Sprue ${label}.`);
  }
  return cleaned as T[number];
}

function cleanHeroBadge(value?: string | null): IronSprueHeroMerchandisingBadge {
  return assertOption(value, IRON_SPRUE_HERO_MERCHANDISING_BADGES, 'NONE', 'hero merchandising badge');
}

function cleanTypographySettings(input: IronSprueTypographySettingInput) {
  return {
    headingFamily: assertOption(input.headingFamily, IRON_SPRUE_TYPOGRAPHY_OPTIONS.headingFamily, DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS.headingFamily, 'heading typography'),
    bodyFamily: assertOption(input.bodyFamily, IRON_SPRUE_TYPOGRAPHY_OPTIONS.bodyFamily, DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS.bodyFamily, 'body typography'),
    headingWeight: assertOption(input.headingWeight, IRON_SPRUE_TYPOGRAPHY_OPTIONS.headingWeight, DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS.headingWeight, 'heading weight'),
    bodyWeight: assertOption(input.bodyWeight, IRON_SPRUE_TYPOGRAPHY_OPTIONS.bodyWeight, DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS.bodyWeight, 'body weight'),
    headingScale: assertOption(input.headingScale, IRON_SPRUE_TYPOGRAPHY_OPTIONS.headingScale, DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS.headingScale, 'heading scale'),
    bodyScale: assertOption(input.bodyScale, IRON_SPRUE_TYPOGRAPHY_OPTIONS.bodyScale, DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS.bodyScale, 'body scale'),
  };
}

export async function getIronSprueAdminTypographySettings(client = getIronSprueAdminPrisma()) {
  const record = await client.ironSprueAdminTypographySetting.findUnique({
    where: { storeCode: IRON_SPRUE_STORE_CODE },
  });

  return record ?? {
    id: null,
    storeCode: IRON_SPRUE_STORE_CODE,
    ...DEFAULT_IRON_SPRUE_TYPOGRAPHY_SETTINGS,
    createdAt: null,
    updatedAt: null,
  };
}

export async function upsertIronSprueAdminTypographySettings(
  input: IronSprueTypographySettingInput,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const before = await client.ironSprueAdminTypographySetting.findUnique({
    where: { storeCode: IRON_SPRUE_STORE_CODE },
  });
  const data = {
    storeCode: IRON_SPRUE_STORE_CODE,
    ...cleanTypographySettings(input),
  };

  const record = await client.ironSprueAdminTypographySetting.upsert({
    where: { storeCode: IRON_SPRUE_STORE_CODE },
    create: data,
    update: data,
  });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'typography.update',
      entityType: 'typography-settings',
      entityId: record.id,
      summary: 'Updated Iron Sprue storefront typography settings.',
      before: before ? {
        headingFamily: before.headingFamily,
        bodyFamily: before.bodyFamily,
        headingWeight: before.headingWeight,
        bodyWeight: before.bodyWeight,
        headingScale: before.headingScale,
        bodyScale: before.bodyScale,
      } : Prisma.JsonNull,
      after: {
        headingFamily: record.headingFamily,
        bodyFamily: record.bodyFamily,
        headingWeight: record.headingWeight,
        bodyWeight: record.bodyWeight,
        headingScale: record.headingScale,
        bodyScale: record.bodyScale,
      },
    },
  });

  return record;
}

export async function getIronSprueAdminStorefrontControls(client = getIronSprueAdminPrisma()) {
  const [homepagePlacements, heroes, specialOffers, discountCodes, typographySettings, auditLog] = await Promise.all([
    client.ironSprueAdminHomepagePlacement.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    }),
    client.ironSprueAdminHero.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    }),
    client.ironSprueAdminSpecialOffer.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      include: { product: { select: { sku: true, customerTitle: true } } },
    }),
    client.ironSprueDiscountCode.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: [{ enabled: 'desc' }, { code: 'asc' }],
    }),
    getIronSprueAdminTypographySettings(client),
    client.ironSprueAdminAuditLog.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return { homepagePlacements, heroes, specialOffers, discountCodes, typographySettings, auditLog };
}

type StorefrontRecordInput = {
  id?: string | null | undefined;
  title?: string | null | undefined;
  headline?: string | null | undefined;
  strapline?: string | null | undefined;
  placementKey?: string | null | undefined;
  ctaLabel?: string | null | undefined;
  ctaHref?: string | null | undefined;
  imageUrl?: string | null | undefined;
  merchandisingBadge?: string | null | undefined;
  active?: boolean | undefined;
  sortOrder?: number | undefined;
};

function cleanNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanSortOrder(value?: number) {
  return Number.isFinite(value) ? Math.trunc(value ?? 0) : 0;
}

export async function upsertIronSprueAdminHomepagePlacement(input: StorefrontRecordInput, actor: IronSprueAdminUser, client = getIronSprueAdminPrisma()) {
  const placementKey = cleanNullable(input.placementKey) ?? 'homepage-main';
  const title = cleanNullable(input.title) ?? 'Iron Sprue homepage placement';
  const data = {
    storeCode: IRON_SPRUE_STORE_CODE,
    placementKey,
    title,
    ctaLabel: cleanNullable(input.ctaLabel),
    ctaHref: cleanNullable(input.ctaHref),
    imageUrl: cleanNullable(input.imageUrl),
    active: Boolean(input.active),
    sortOrder: cleanSortOrder(input.sortOrder),
  };

  const record = input.id
    ? await client.ironSprueAdminHomepagePlacement.update({ where: { id: input.id }, data })
    : await client.ironSprueAdminHomepagePlacement.upsert({
        where: { storeCode_placementKey: { storeCode: IRON_SPRUE_STORE_CODE, placementKey } },
        create: data,
        update: data,
      });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'homepage.upsert',
      entityType: 'homepage-placement',
      entityId: record.id,
      summary: `Saved Iron Sprue homepage placement ${record.placementKey}.`,
      after: { placementKey: record.placementKey, title: record.title, active: record.active, sortOrder: record.sortOrder },
    },
  });

  return record;
}

export async function upsertIronSprueAdminHero(input: StorefrontRecordInput, actor: IronSprueAdminUser, client = getIronSprueAdminPrisma()) {
  const headline = cleanNullable(input.headline) ?? 'Built for the bench.';
  const data = {
    storeCode: IRON_SPRUE_STORE_CODE,
    headline,
    strapline: cleanNullable(input.strapline),
    ctaLabel: cleanNullable(input.ctaLabel),
    ctaHref: cleanNullable(input.ctaHref),
    imageUrl: cleanNullable(input.imageUrl),
    merchandisingBadge: cleanHeroBadge(input.merchandisingBadge),
    active: Boolean(input.active),
    sortOrder: cleanSortOrder(input.sortOrder),
  };

  const record = input.id
    ? await client.ironSprueAdminHero.update({ where: { id: input.id }, data })
    : await client.ironSprueAdminHero.create({ data });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'hero.upsert',
      entityType: 'hero',
      entityId: record.id,
      summary: `Saved Iron Sprue hero ${record.headline}.`,
      after: { headline: record.headline, merchandisingBadge: record.merchandisingBadge, active: record.active, sortOrder: record.sortOrder },
    },
  });

  return record;
}

export async function upsertIronSprueAdminSpecialOffer(
  input: StorefrontRecordInput & {
    productId?: string | null | undefined;
    badge?: string | null | undefined;
    normalPriceMinor?: number | null | undefined;
    offerPriceMinor?: number | null | undefined;
  },
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const title = cleanNullable(input.title) ?? 'Iron Sprue offer';
  const productId = cleanNullable(input.productId);
  if (productId) {
    const product = await client.ironSprueAdminProduct.findFirst({ where: { id: productId, storeCode: IRON_SPRUE_STORE_CODE }, select: { id: true } });
    if (!product) throw new Error('Iron Sprue product not found for special offer.');
  }

  const data = {
    storeCode: IRON_SPRUE_STORE_CODE,
    productId,
    title,
    badge: cleanNullable(input.badge),
    normalPriceMinor: input.normalPriceMinor ?? null,
    offerPriceMinor: input.offerPriceMinor ?? null,
    ctaLabel: cleanNullable(input.ctaLabel),
    ctaHref: cleanNullable(input.ctaHref),
    active: Boolean(input.active),
    sortOrder: cleanSortOrder(input.sortOrder),
  };

  const record = input.id
    ? await client.ironSprueAdminSpecialOffer.update({ where: { id: input.id }, data })
    : await client.ironSprueAdminSpecialOffer.create({ data });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'special_offer.upsert',
      entityType: 'special-offer',
      entityId: record.id,
      productId: record.productId,
      summary: `Saved Iron Sprue special offer ${record.title}.`,
      after: { title: record.title, active: record.active, sortOrder: record.sortOrder },
    },
  });

  return record;
}

export type IronSprueDiscountCodeInput = {
  id?: string | null | undefined;
  code?: string | null | undefined;
  enabled?: boolean | null | undefined;
  discountType?: string | null | undefined;
  amount?: number | null | undefined;
  expiresAt?: Date | null | undefined;
  minimumSpendMinor?: number | null | undefined;
  oneUsePerCustomer?: boolean | null | undefined;
};

function normalizeDiscountCode(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export async function upsertIronSprueDiscountCode(input: IronSprueDiscountCodeInput, actor: IronSprueAdminUser, client = getIronSprueAdminPrisma()) {
  const code = normalizeDiscountCode(input.code);
  if (!code) throw new Error('Discount code is required.');
  const discountType = cleanNullable(input.discountType) ?? 'PERCENT';
  if (!['PERCENT', 'FIXED'].includes(discountType)) throw new Error('Discount type must be PERCENT or FIXED.');
  const amount = Math.max(0, Math.trunc(input.amount ?? 0));
  if (amount <= 0) throw new Error('Discount amount must be greater than zero.');
  if (discountType === 'PERCENT' && amount > 100) throw new Error('Percentage discount cannot exceed 100.');

  const data = {
    storeCode: IRON_SPRUE_STORE_CODE,
    code,
    enabled: Boolean(input.enabled),
    discountType,
    amount,
    expiresAt: input.expiresAt ?? null,
    minimumSpendMinor: input.minimumSpendMinor ?? null,
    oneUsePerCustomer: Boolean(input.oneUsePerCustomer),
  };

  const record = input.id
    ? await client.ironSprueDiscountCode.update({ where: { id: input.id }, data })
    : await client.ironSprueDiscountCode.upsert({
      where: { storeCode_code: { storeCode: IRON_SPRUE_STORE_CODE, code } },
      update: data,
      create: data,
    });

  await client.ironSprueAdminAuditLog.create({
    data: {
      storeCode: IRON_SPRUE_STORE_CODE,
      actorId: actor.id,
      action: 'discount_code.upsert',
      entityType: 'discount-code',
      entityId: record.id,
      summary: `Saved Iron Sprue discount code ${record.code}.`,
      after: { code: record.code, enabled: record.enabled, discountType: record.discountType, amount: record.amount },
    },
  });

  return record;
}

export type IronSprueAdminImplementationMapItem = {
  capability: string;
  classification: 'reuse directly' | 'extend with store context' | 'create Iron Sprue-specific equivalent' | 'defer until commerce sprint' | 'intentionally exclude';
  note: string;
};

export function getIronSprueAdminImplementationMap(): IronSprueAdminImplementationMapItem[] {
  return [
    { capability: 'Authentication/session shell', classification: 'reuse directly', note: 'Reuse Admin session gate and shell, then show Iron Sprue store/environment indicators.' },
    { capability: 'Products', classification: 'create Iron Sprue-specific equivalent', note: 'Use dedicated Iron Sprue product records to avoid TCG uniqueness and terminology leakage.' },
    { capability: 'Inventory', classification: 'create Iron Sprue-specific equivalent', note: 'Track expected, received, damaged, missing and available quantities before catalogue import.' },
    { capability: 'Categories/brands/suppliers', classification: 'create Iron Sprue-specific equivalent', note: 'Use modelling categories and official brand assets, not trading-card master data.' },
    { capability: 'Media management', classification: 'extend with store context', note: 'Reuse upload validation concepts while enforcing Iron Sprue bucket and Image 2 primary policy.' },
    { capability: 'Content review', classification: 'extend with store context', note: 'Reuse content workflow patterns while blocking factual conflicts from publication.' },
    { capability: 'Homepage/heroes/offers', classification: 'create Iron Sprue-specific equivalent', note: 'Keep storefront visuals approved and editable through Iron Sprue-scoped records.' },
    { capability: 'Orders', classification: 'defer until commerce sprint', note: 'Only show a scoped empty state until checkout/order processing exists.' },
    { capability: 'Buylist/releases/card metadata', classification: 'intentionally exclude', note: 'Trading-card-specific surfaces are not part of Iron Sprue.' },
  ];
}
