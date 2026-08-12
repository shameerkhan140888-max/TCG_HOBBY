import type { IronSprueAdminProduct, Prisma, UserRole } from '@prisma/client';
import { slugify } from '@tcg-hobby/utils';
import { getIronSprueAdminPrisma } from './client';

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
  'READY',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type IronSpruePublicationState = (typeof IRON_SPRUE_PUBLICATION_STATES)[number];

export type IronSprueAdminUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole | string;
};

export type IronSprueReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

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
  mediaAssets: true,
  contentReviews: true,
} as const satisfies Prisma.IronSprueAdminProductInclude;

type ProductWithReadiness = Prisma.IronSprueAdminProductGetPayload<{ include: typeof productReadinessInclude }>;
const adminProductListInclude = {
  brand: true,
  category: true,
  supplier: true,
  inventory: true,
  mediaAssets: {
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
  include: { product: { select: { id: true; sku: true; customerTitle: true; publicationState: true } } };
}>;
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

function assertIronSprueStore(storeCode: string | undefined | null) {
  if (storeCode && storeCode !== IRON_SPRUE_STORE_CODE) {
    throw new Error('Iron Sprue Admin operations must be scoped server-side to IRON_SPRUE.');
  }
  return IRON_SPRUE_STORE_CODE;
}

function normalizePublicationState(value: string): IronSpruePublicationState {
  if (IRON_SPRUE_PUBLICATION_STATES.includes(value as IronSpruePublicationState)) return value as IronSpruePublicationState;
  throw new Error('Unsupported Iron Sprue publication state.');
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

export function evaluateIronSprueProductReadiness(product: ProductWithReadiness): IronSprueReadinessCheck[] {
  const cataloguePrimary = product.mediaAssets.find(
    (asset) => asset.role === 'catalogue-primary' && asset.approvalState === 'APPROVED' && asset.isPrimary,
  );
  const unresolvedContent = product.contentReviews.some((review) => review.status === 'CONFLICT' || review.status === 'PENDING');

  return [
    { key: 'identity', label: 'Confirmed identity', passed: Boolean(product.customerTitle && product.sku && product.slug), detail: 'Title, SKU and slug are required.' },
    { key: 'brand', label: 'Brand assigned', passed: Boolean(product.brandId), detail: 'A product cannot publish without a brand.' },
    { key: 'category', label: 'Category assigned', passed: Boolean(product.categoryId), detail: 'A product cannot publish without a category.' },
    { key: 'price', label: 'VAT-inclusive price', passed: typeof product.grossPriceMinor === 'number' && product.grossPriceMinor > 0 && product.vatRate >= 0, detail: 'Gross selling price and VAT rate are required.' },
    { key: 'descriptions', label: 'Required descriptions', passed: Boolean(product.shortDescription && product.fullDescription), detail: 'Short and full descriptions are required.' },
    { key: 'specifications', label: 'Required specifications', passed: Boolean(product.specifications), detail: 'Structured specifications must be reviewed.' },
    { key: 'media', label: 'Image 2 primary media', passed: Boolean(cataloguePrimary), detail: 'An approved catalogue-primary Image 2 must be primary.' },
    { key: 'seo', label: 'Minimum SEO', passed: Boolean(product.seoTitle && product.metaDescription), detail: 'SEO title and meta description are required.' },
    { key: 'content-conflicts', label: 'No unresolved factual conflicts', passed: !unresolvedContent, detail: 'Pending or conflicted content review blocks readiness.' },
  ];
}

export function isIronSprueProductReady(product: ProductWithReadiness) {
  return evaluateIronSprueProductReadiness(product).every((check) => check.passed);
}

export async function getIronSprueAdminDashboard(client = getIronSprueAdminPrisma()): Promise<IronSprueAdminDashboard> {
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
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'READY' } }),
    client.ironSprueAdminProduct.count({ where: { storeCode: IRON_SPRUE_STORE_CODE, publicationState: 'PUBLISHED' } }),
    client.ironSprueAdminInventory.aggregate({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      _sum: { expectedQuantity: true, receivedQuantity: true, damagedQuantity: true, missingQuantity: true, availableStock: true },
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
  const workerReadConfigured = Boolean(process.env.IRON_SPRUE_WORKER_READ_DATABASE_URL?.trim());
  const r2Configured = Boolean(
    process.env.IRON_SPRUE_R2_BUCKET_NAME?.trim() === 'iron-sprue-product-media' &&
      process.env.IRON_SPRUE_R2_ACCESS_KEY_ID?.trim() &&
      process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY?.trim(),
  );

  return {
    storeCode: IRON_SPRUE_STORE_CODE,
    environment: process.env.IRON_SPRUE_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
    databaseStatus: 'connected',
    r2Status: r2Configured ? 'configured' : 'blocked',
    workerReadStatus: workerReadConfigured ? 'configured' : 'blocked',
    warnings: [
      ...(workerReadConfigured ? [] : ['IRON_SPRUE_WORKER_READ_DATABASE_URL is not configured locally.']),
      ...(r2Configured ? [] : ['Iron Sprue R2 write configuration is incomplete.']),
    ],
    metrics: [
      { label: 'Total products', value: totalProducts, detail: 'Iron Sprue-scoped Admin products.' },
      { label: 'Draft', value: draftProducts, detail: 'Imported or manually created records not yet ready.' },
      { label: 'Content pending', value: contentPending, detail: 'Products waiting for content review.' },
      { label: 'Media pending', value: mediaPending, detail: 'Products waiting for Image 2 or gallery media.' },
      { label: 'Review required', value: reviewRequired, detail: 'Products with unresolved readiness checks.' },
      { label: 'Ready', value: readyProducts, detail: 'Products eligible for explicit publication.' },
      { label: 'Published', value: publishedProducts, detail: 'Products visible after launch approval.' },
      { label: 'Content approvals required', value: contentApprovalRequired, detail: 'Pending or conflicted customer-facing copy/specification reviews.' },
      { label: 'Content approved', value: contentApproved, detail: 'Customer-facing copy/specification reviews already approved.' },
      { label: 'Media approvals required', value: mediaApprovalRequired, detail: 'Image 2, workshop or source media awaiting approval.' },
      { label: 'Media approved', value: mediaApproved, detail: 'Approved Iron Sprue media assets.' },
      { label: 'Expected stock', value: expectedStock, detail: 'Units expected from import/goods received.' },
      { label: 'Received stock', value: receivedStock, detail: 'Units received into Iron Sprue inventory.' },
      { label: 'Missing/damaged stock', value: missingStock + damagedStock, detail: 'Goods received exceptions.' },
      { label: 'Available stock', value: availableStock, detail: 'Sellable stock after receipts and reservations.' },
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
    { key: 'orders', label: 'Orders', href: '/iron-sprue-admin/orders', status: 'deferred', requiredPermission: 'orders:view', description: 'Read-only scoped order empty state until commerce activation.' },
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

  return client.$transaction(async (tx) => {
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
  nextState: IronSpruePublicationState,
  actor: IronSprueAdminUser,
  client = getIronSprueAdminPrisma(),
) {
  const state = normalizePublicationState(nextState);
  const product = await client.ironSprueAdminProduct.findFirst({
    where: { id: productId, storeCode: IRON_SPRUE_STORE_CODE },
    include: productReadinessInclude,
  });
  if (!product) throw new Error('Iron Sprue product not found.');

  const checks = evaluateIronSprueProductReadiness(product);
  if ((state === 'READY' || state === 'PUBLISHED') && checks.some((check) => !check.passed)) {
    throw new Error(`Iron Sprue product is not ${state.toLowerCase()}: ${checks.filter((check) => !check.passed).map((check) => check.key).join(', ')}`);
  }

  return client.$transaction(async (tx) => {
    const updated = await tx.ironSprueAdminProduct.update({
      where: { id: product.id },
      data: {
        publicationState: state,
        readyApprovedAt: state === 'READY' ? new Date() : product.readyApprovedAt,
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
        after: { publicationState: state },
      },
    });
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
  const nextAvailable = inventory.availableStock + received;

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
        quantity: received,
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
        after: { availableStock: nextAvailable, damagedQuantity: damaged, missingQuantity: missing },
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
    ...(filters.publicationState ? { publicationState: normalizePublicationState(filters.publicationState) } : {}),
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
    products,
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

export async function listIronSprueAdminMediaAssets(
  filters: { approvalState?: string; role?: string; pageSize?: number } = {},
  client = getIronSprueAdminPrisma(),
): Promise<IronSprueAdminMediaReviewItem[]> {
  const pageSize = Math.min(500, Math.max(1, filters.pageSize ?? 160));
  return client.ironSprueAdminMediaAsset.findMany({
    where: {
      storeCode: IRON_SPRUE_STORE_CODE,
      ...(filters.approvalState ? { approvalState: filters.approvalState } : {}),
      ...(filters.role ? { role: filters.role } : {}),
    },
    orderBy: [{ product: { sku: 'asc' } }, { role: 'asc' }, { approvalState: 'asc' }, { updatedAt: 'desc' }],
    take: pageSize,
    include: {
      product: { select: { id: true, sku: true, customerTitle: true, publicationState: true } },
    },
  });
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

  return record;
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
      product: { select: { id: true, sku: true, customerTitle: true, publicationState: true } },
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

  return updated;
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

  return client.$transaction(async (tx) => {
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

export async function getIronSprueAdminStorefrontControls(client = getIronSprueAdminPrisma()) {
  const [homepagePlacements, heroes, specialOffers, auditLog] = await Promise.all([
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
    client.ironSprueAdminAuditLog.findMany({
      where: { storeCode: IRON_SPRUE_STORE_CODE },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return { homepagePlacements, heroes, specialOffers, auditLog };
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
      after: { headline: record.headline, active: record.active, sortOrder: record.sortOrder },
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
