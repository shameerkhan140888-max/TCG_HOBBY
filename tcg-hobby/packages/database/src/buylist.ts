import type { BuylistStatus, CurrencyCode, PaginationMeta } from '@tcg-hobby/types';
import { sumMinorAmounts } from '@tcg-hobby/utils';
import { prisma } from './client';
import { getProductPricingSnapshot } from './pricing';

type BuylistProductRow = {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string;
  featured: boolean;
  published: boolean;
  archivedAt: Date | null;
  imageLabel: string;
  category: { id: string; name: string; slug: string; description: string; sortOrder: number };
  inventory: { stockOnHand: number; reservedStock: number } | null;
  supplierProducts: Array<{ supplier: { id: string; name: string } }>;
};

type BuylistItemRow = {
  id: string;
  quantity: number;
  estimatedBuyMinor: number;
  offeredBuyMinor: number;
  notes: string | null;
  product: BuylistProductRow;
};

type BuylistRow = {
  id: string;
  buylistNumber: string;
  userId: string;
  status: BuylistStatus;
  currency: CurrencyCode;
  estimatedPayoutMinor: number;
  offeredPayoutMinor: number;
  customerNotes: string | null;
  staffNotes: string | null;
  paymentReference: string | null;
  submittedAt: Date | null;
  receivedAt: Date | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: BuylistItemRow[];
  user: { id: string; name: string | null; email: string };
};

export type BuylistLineItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  estimatedBuyMinor: number;
  offeredBuyMinor: number;
  lineEstimatedPayoutMinor: number;
  lineOfferedPayoutMinor: number;
  notes: string | null;
  pricing: Awaited<ReturnType<typeof getProductPricingSnapshot>>;
};

export type BuylistSummary = {
  id: string;
  buylistNumber: string;
  status: BuylistStatus;
  currency: CurrencyCode;
  estimatedPayoutMinor: number;
  offeredPayoutMinor: number;
  itemCount: number;
  customerNotes: string | null;
  staffNotes: string | null;
  submittedAt: Date | null;
  paidAt: Date | null;
};

export type AdminBuylistSummary = BuylistSummary & {
  customerName: string;
  customerEmail: string;
};

export type BuylistDetail = BuylistSummary & {
  user: { id: string; name: string | null; email: string };
  items: BuylistLineItem[];
  paymentReference: string | null;
  receivedAt: Date | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BuylistSearchFilters = {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

export type BuylistSearchItem = {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  priceMinor: number;
  buyMinor: number;
  buyPriceLabel: string;
  priceSource: string;
  priceStatus: string;
  manualOverride: boolean;
  inStock: boolean;
  imageLabel: string;
};

export type BuylistSearchResult = {
  products: BuylistSearchItem[];
  pagination: PaginationMeta;
};

type AdminBuylistFilters = {
  search?: string;
  status?: BuylistStatus | 'ALL';
  page?: number;
  pageSize?: number;
};

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function resolvePagination(totalItems: number, page = 1, pageSize = 20): PaginationMeta {
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

function generateBuylistNumber() {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const unique = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BL-${stamp}-${unique}`;
}

function mapBuylistSummaryRow(buylist: BuylistRow): BuylistSummary {
  return {
    id: buylist.id,
    buylistNumber: buylist.buylistNumber,
    status: buylist.status,
    currency: buylist.currency,
    estimatedPayoutMinor: buylist.estimatedPayoutMinor,
    offeredPayoutMinor: buylist.offeredPayoutMinor,
    itemCount: buylist.items.length,
    customerNotes: buylist.customerNotes,
    staffNotes: buylist.staffNotes,
    submittedAt: buylist.submittedAt,
    paidAt: buylist.paidAt,
  };
}

function mapBuylistLineItem(item: BuylistItemRow): BuylistLineItem {
  return {
    id: item.id,
    productId: item.product.id,
    productName: item.product.name,
    productSlug: item.product.slug,
    quantity: item.quantity,
    estimatedBuyMinor: item.estimatedBuyMinor,
    offeredBuyMinor: item.offeredBuyMinor,
    lineEstimatedPayoutMinor: item.quantity * item.estimatedBuyMinor,
    lineOfferedPayoutMinor: item.quantity * item.offeredBuyMinor,
    notes: item.notes,
    pricing: null,
  };
}

async function getBuylistRecord(id: string, db = prisma): Promise<BuylistRow | null> {
  return db.buylist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              category: true,
              inventory: true,
              supplierProducts: { include: { supplier: true }, take: 1 },
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  }) as unknown as Promise<BuylistRow | null>;
}

async function ensureDraftBuylist(userId: string, db = prisma) {
  const existing = await db.buylist.findFirst({
    where: { userId, status: 'DRAFT' },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  return db.buylist.create({
    data: {
      buylistNumber: generateBuylistNumber(),
      userId,
      status: 'DRAFT',
      currency: 'GBP',
    },
  });
}

async function computeBuylistSummary(buylist: BuylistRow) {
  const items = buylist.items.map(mapBuylistLineItem);
  const estimatedPayoutMinor = sumMinorAmounts(items.map((item) => item.lineEstimatedPayoutMinor));
  const offeredPayoutMinor = sumMinorAmounts(items.map((item) => item.lineOfferedPayoutMinor));

  return {
    ...mapBuylistSummaryRow(buylist),
    estimatedPayoutMinor,
    offeredPayoutMinor,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
  };
}

export async function getCustomerBuylistDraft(userId: string, db = prisma): Promise<BuylistDetail | null> {
  const buylist = await db.buylist.findFirst({
    where: { userId, status: 'DRAFT' },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              category: true,
              inventory: true,
              supplierProducts: { include: { supplier: true }, take: 1 },
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  }) as unknown as BuylistRow | null;

  if (!buylist) {
    return null;
  }

  const items = await Promise.all(
    buylist.items.map(async (item) => ({
      ...mapBuylistLineItem(item),
      pricing: await getProductPricingSnapshot(item.product.id, db),
    })),
  );

  const summary = await computeBuylistSummary(buylist);

  return {
    ...summary,
    user: buylist.user,
    items,
    paymentReference: buylist.paymentReference,
    receivedAt: buylist.receivedAt,
    reviewedAt: buylist.reviewedAt,
    approvedAt: buylist.approvedAt,
    rejectedAt: buylist.rejectedAt,
    createdAt: buylist.createdAt,
    updatedAt: buylist.updatedAt,
  };
}

export async function getCustomerBuylists(userId: string, db = prisma): Promise<BuylistSummary[]> {
  const rows = (await db.buylist.findMany({
    where: { userId, status: { not: 'DRAFT' } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: { id: true },
      },
    },
  })) as unknown as BuylistRow[];

  return rows.map((buylist) => ({
    ...mapBuylistSummaryRow(buylist),
    itemCount: buylist.items.length,
  }));
}

export async function getBuylistSearchProducts(filters: BuylistSearchFilters = {}, db = prisma): Promise<BuylistSearchResult> {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 12, 1);

  const where: Record<string, unknown> = {
    published: true,
    archivedAt: null,
    pricing: {
      is: {
        buyMinor: {
          gt: 0,
        },
      },
    },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { searchText: { contains: search, mode: 'insensitive' } },
      { game: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (filters.category) {
    where.category = { is: { slug: filters.category } };
  }

  const totalItems = await db.product.count({ where: where as any });
  const pagination = resolvePagination(totalItems, page, pageSize);
  const rows = await db.product.findMany({
    where: where as any,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: pageSize,
    skip: (pagination.page - 1) * pageSize,
    include: {
      category: true,
      inventory: true,
      supplierProducts: { include: { supplier: true }, take: 1 },
      pricing: { include: { pricingRule: true } },
    },
  });

  const products = await Promise.all(
    rows.map(async (product) => {
      const pricing = await getProductPricingSnapshot(product.id, db);
      const inventory = product.inventory;
      const supplier = product.supplierProducts[0]?.supplier;

      if (!inventory || !supplier || !pricing) {
        throw new Error(`Incomplete buylist seed data for ${product.slug}`);
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        game: product.game,
        description: product.description,
        categoryName: product.category.name,
        categorySlug: product.category.slug,
        priceMinor: product.priceMinor,
        buyMinor: pricing.buyMinor,
        buyPriceLabel: `Estimated payout ${pricing.priceStatus === 'MANUAL_OVERRIDE' ? 'manual' : 'based on current rules'}`,
        priceSource: pricing.priceSource,
        priceStatus: pricing.priceStatus,
        manualOverride: pricing.manualOverride,
        inStock: inventory.stockOnHand - inventory.reservedStock > 0,
        imageLabel: product.imageLabel,
      };
    }),
  );

  return { products, pagination };
}

export async function addProductToBuylist(userId: string, productId: string, quantity = 1, db = prisma) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive whole number.');
  }

  const buylist = await ensureDraftBuylist(userId, db);
  const pricing = await getProductPricingSnapshot(productId, db);

  if (!pricing || pricing.buyMinor <= 0) {
    throw new Error('This product is not eligible for buylist submission.');
  }

  const existing = await db.buylistItem.findUnique({
    where: {
      buylistId_productId: {
        buylistId: buylist.id,
        productId,
      },
    },
  });

  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  await db.buylistItem.upsert({
    where: {
      buylistId_productId: {
        buylistId: buylist.id,
        productId,
      },
    },
    create: {
      buylistId: buylist.id,
      productId,
      quantity: nextQuantity,
      estimatedBuyMinor: pricing.buyMinor,
      offeredBuyMinor: pricing.buyMinor,
    },
    update: {
      quantity: nextQuantity,
      estimatedBuyMinor: pricing.buyMinor,
      offeredBuyMinor: pricing.buyMinor,
    },
  });

  return getCustomerBuylistDraft(userId, db);
}

export async function updateBuylistItemQuantity(userId: string, productId: string, quantity: number, db = prisma) {
  const buylist = await ensureDraftBuylist(userId, db);

  if (quantity <= 0) {
    await db.buylistItem.deleteMany({ where: { buylistId: buylist.id, productId } });
    return getCustomerBuylistDraft(userId, db);
  }

  const pricing = await getProductPricingSnapshot(productId, db);
  if (!pricing || pricing.buyMinor <= 0) {
    throw new Error('This product is not eligible for buylist submission.');
  }

  await db.buylistItem.upsert({
    where: {
      buylistId_productId: {
        buylistId: buylist.id,
        productId,
      },
    },
    create: {
      buylistId: buylist.id,
      productId,
      quantity,
      estimatedBuyMinor: pricing.buyMinor,
      offeredBuyMinor: pricing.buyMinor,
    },
    update: {
      quantity,
      estimatedBuyMinor: pricing.buyMinor,
      offeredBuyMinor: pricing.buyMinor,
    },
  });

  return getCustomerBuylistDraft(userId, db);
}

export async function removeProductFromBuylist(userId: string, productId: string, db = prisma) {
  const buylist = await ensureDraftBuylist(userId, db);
  await db.buylistItem.deleteMany({ where: { buylistId: buylist.id, productId } });
  return getCustomerBuylistDraft(userId, db);
}

export async function submitBuylistRequest(userId: string, customerNotes: string | null = null, db = prisma) {
  const buylist = await db.buylist.findFirst({
    where: { userId, status: 'DRAFT' },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  }) as unknown as BuylistRow | null;

  if (!buylist || buylist.items.length === 0) {
    throw new Error('Add at least one eligible product before submitting a buylist request.');
  }

  const estimatedPayoutMinor = sumMinorAmounts(buylist.items.map((item) => item.quantity * item.estimatedBuyMinor));

  await db.buylist.update({
    where: { id: buylist.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      estimatedPayoutMinor,
      offeredPayoutMinor: estimatedPayoutMinor,
      customerNotes,
    },
  });

  await ensureDraftBuylist(userId, db);

  return getBuylistById(buylist.id, db);
}

export async function getBuylistById(id: string, db = prisma): Promise<BuylistDetail | null> {
  const buylist = await getBuylistRecord(id, db);

  if (!buylist) {
    return null;
  }

  const items = await Promise.all(
    buylist.items.map(async (item) => ({
      ...mapBuylistLineItem(item),
      pricing: await getProductPricingSnapshot(item.product.id, db),
    })),
  );
  const summary = await computeBuylistSummary(buylist);

  return {
    ...summary,
    user: buylist.user,
    items,
    paymentReference: buylist.paymentReference,
    receivedAt: buylist.receivedAt,
    reviewedAt: buylist.reviewedAt,
    approvedAt: buylist.approvedAt,
    rejectedAt: buylist.rejectedAt,
    createdAt: buylist.createdAt,
    updatedAt: buylist.updatedAt,
  };
}

export async function getAdminBuylists(filters: AdminBuylistFilters = {}, db = prisma) {
  const search = normalizeSearch(filters.search);
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 20, 1);

  const where: Record<string, unknown> = {
    status: filters.status && filters.status !== 'ALL' ? filters.status : { not: 'DRAFT' },
  };

  if (search) {
    where.OR = [
      { buylistNumber: { contains: search, mode: 'insensitive' } },
      { customerNotes: { contains: search, mode: 'insensitive' } },
      { staffNotes: { contains: search, mode: 'insensitive' } },
      { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const totalItems = await db.buylist.count({ where: where as any });
  const pagination = resolvePagination(totalItems, page, pageSize);
  const rows = (await db.buylist.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (pagination.page - 1) * pageSize,
    include: {
      items: { select: { id: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  })) as unknown as BuylistRow[];

  return {
    buylists: rows.map((buylist) => ({
      ...mapBuylistSummaryRow(buylist),
      customerName: buylist.user.name ?? buylist.user.email,
      customerEmail: buylist.user.email,
    })) as AdminBuylistSummary[],
    pagination,
  };
}

export async function getAdminBuylistById(id: string, db = prisma): Promise<BuylistDetail | null> {
  return getBuylistById(id, db);
}

export async function updateAdminBuylist(
  id: string,
  input: {
    status?: BuylistStatus;
    staffNotes?: string;
    offeredPayoutMinor?: number;
    paymentReference?: string;
    paidAt?: Date | null;
  },
  db = prisma,
) {
  const current = await getBuylistById(id, db);

  if (!current) {
    return null;
  }

  const nextStatus = input.status ?? current.status;
  const timestampData: Record<string, Date | null> = {};

  if (input.status && input.status !== current.status) {
    const now = new Date();
    if (input.status === 'SUBMITTED') timestampData.submittedAt = now;
    if (input.status === 'RECEIVED') timestampData.receivedAt = now;
    if (input.status === 'UNDER_REVIEW') timestampData.reviewedAt = now;
    if (input.status === 'APPROVED') timestampData.approvedAt = now;
    if (input.status === 'REJECTED') timestampData.rejectedAt = now;
    if (input.status === 'PAID') timestampData.paidAt = input.paidAt ?? now;
  }

  const updateData: Record<string, unknown> = {
    status: nextStatus,
    ...timestampData,
  };

  if (input.staffNotes !== undefined) {
    updateData.staffNotes = input.staffNotes;
  }

  if (input.offeredPayoutMinor !== undefined) {
    updateData.offeredPayoutMinor = input.offeredPayoutMinor;
  }

  if (input.paymentReference !== undefined) {
    updateData.paymentReference = input.paymentReference;
  }

  if (input.paidAt !== undefined) {
    updateData.paidAt = input.paidAt;
  }

  await db.buylist.update({
    where: { id },
    data: updateData as any,
  });

  return getBuylistById(id, db);
}

export async function getBuylistSearchStats(db = prisma) {
  const [submitted, underReview, approved] = await Promise.all([
    db.buylist.count({ where: { status: 'SUBMITTED' } }),
    db.buylist.count({ where: { status: 'UNDER_REVIEW' } }),
    db.buylist.count({ where: { status: 'APPROVED' } }),
  ]);

  return {
    submitted,
    underReview,
    approved,
  };
}
