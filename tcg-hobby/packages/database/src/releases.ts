import type {
  NotificationPreference,
  NotificationSubscription,
  ReleaseCalendarEntry,
  ReleaseProduct,
  ReleaseSummary,
} from '@tcg-hobby/types';
import type { Prisma } from '@prisma/client';
import { slugify } from '@tcg-hobby/utils';
import { prisma } from './client';
import { seedCategories, seedProducts, seedReleases, seedReleaseProducts, seedSuppliers } from './seed-data';

const releaseInclude = {
  category: true,
  products: {
    orderBy: [{ status: 'asc' }, { releaseDate: 'asc' }],
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
} as const satisfies Prisma.ReleaseInclude;

type ReleaseRow = Prisma.ReleaseGetPayload<{ include: typeof releaseInclude }>;
type ReleaseProductRow = ReleaseRow['products'][number];

const notificationSubscriptionInclude = {
  product: { select: { name: true, slug: true } },
} as const satisfies Prisma.NotificationSubscriptionInclude;

type NotificationSubscriptionResultRow = Prisma.NotificationSubscriptionGetPayload<{ include: typeof notificationSubscriptionInclude }>;

type ReleaseFilters = {
  search?: string;
  game?: string;
  brand?: string;
  category?: string;
  month?: string;
};

type AdminReleaseFilters = ReleaseFilters & {
  page?: number;
  pageSize?: number;
};

export type ReleaseFormInput = {
  name: string;
  slug?: string;
  brand: string;
  game: string;
  categoryId: string;
  releaseDate: string;
  expectedDispatchAt?: string;
  expectedArrivalAt?: string;
  announcementText?: string;
  releaseNotes?: string;
  visible: boolean;
  featuredOnHomepage: boolean;
  productIds: string[];
  allocationLimit?: number;
  customerPurchaseLimit?: number;
  supplierAllocation?: number;
  lowAllocationThreshold?: number;
  preorderBadgeLabel?: string;
  comingSoonBadgeLabel?: string;
};

export type NotificationSubscriptionRow = NotificationSubscription & {
  productName: string;
  productSlug: string;
};

export type ReleaseCalendarGroup = {
  key: string;
  label: string;
  releases: ReleaseCalendarEntry[];
};

export type ComingSoonHubData = {
  featuredRelease: ReleaseSummary | null;
  upcomingReleases: ReleaseSummary[];
  upcomingSealedProducts: ReleaseProduct[];
  upcomingAccessories: ReleaseProduct[];
  upcomingSets: ReleaseProduct[];
  recentlyAnnounced: ReleaseSummary[];
  trendingUpcoming: ReleaseProduct[];
  releaseTimeline: ReleaseCalendarGroup[];
};

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function resolvePagination(totalItems: number, page = 1, pageSize = 20) {
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

function formatMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function safeDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateRemainingAllocation(allocationLimit: number | null, allocatedQuantity: number) {
  if (allocationLimit == null) {
    return null;
  }

  return Math.max(allocationLimit - allocatedQuantity, 0);
}

function calculateLowAllocationWarning(allocationLimit: number | null, allocatedQuantity: number, lowAllocationThreshold: number | null) {
  const remaining = calculateRemainingAllocation(allocationLimit, allocatedQuantity);

  if (remaining == null || lowAllocationThreshold == null) {
    return false;
  }

  return remaining <= lowAllocationThreshold;
}

function mapReleaseProductRow(row: ReleaseProductRow): ReleaseProduct {
  const remainingAllocation = calculateRemainingAllocation(row.allocationLimit, row.allocatedQuantity);
  const lowAllocation = calculateLowAllocationWarning(row.allocationLimit, row.allocatedQuantity, row.lowAllocationThreshold);
  const supplierName = row.product.supplierProducts[0]?.supplier.name ?? 'Unknown supplier';

  return {
    id: row.id,
    productId: row.product.id,
    productName: row.product.name,
    productSlug: row.product.slug,
    categoryName: row.product.category.name,
    game: row.product.game,
    releaseStatus: row.status,
    releaseDate: row.releaseDate?.toISOString() ?? null,
    expectedDispatchAt: row.expectedDispatchAt?.toISOString() ?? null,
    expectedArrivalAt: row.expectedArrivalAt?.toISOString() ?? null,
    allocationLimit: row.allocationLimit,
    customerPurchaseLimit: row.customerPurchaseLimit,
    supplierAllocation: row.supplierAllocation,
    lowAllocationThreshold: row.lowAllocationThreshold,
    allocatedQuantity: row.allocatedQuantity,
    availabilityMessage:
      row.availabilityMessage ??
      (row.status === 'PREORDER'
        ? lowAllocation
          ? 'Low allocation warning: preorder units are limited.'
          : 'Preorders are open.'
        : 'Coming soon.'),
    preorderBadgeLabel: row.preorderBadgeLabel ?? (row.status === 'PREORDER' ? 'Pre-order open' : 'Pre-order soon'),
    comingSoonBadgeLabel: row.comingSoonBadgeLabel ?? (row.status === 'COMING_SOON' ? 'Coming soon' : 'Release soon'),
    supplierName,
    imageLabel: row.product.imageLabel,
  };
}

function mapReleaseRow(row: ReleaseRow): ReleaseSummary {
  const products = row.products.map(mapReleaseProductRow);
  const productCount = products.length;
  const preorderProductCount = products.filter((product) => product.releaseStatus === 'PREORDER').length;
  const comingSoonProductCount = products.filter((product) => product.releaseStatus === 'COMING_SOON').length;
  const lowAllocationCount = products.filter((product) => {
    const remaining = calculateRemainingAllocation(product.allocationLimit, product.allocatedQuantity);
    return remaining != null && product.lowAllocationThreshold != null && remaining <= product.lowAllocationThreshold;
  }).length;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    game: row.game,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    releaseDate: row.releaseDate.toISOString(),
    expectedDispatchAt: row.expectedDispatchAt?.toISOString() ?? null,
    expectedArrivalAt: row.expectedArrivalAt?.toISOString() ?? null,
    announcementText: row.announcementText,
    releaseNotes: row.releaseNotes,
    visible: row.visible,
    featuredOnHomepage: row.featuredOnHomepage,
    supplierName: products[0]?.supplierName ?? 'Unknown supplier',
    productCount,
    preorderProductCount,
    comingSoonProductCount,
    lowAllocationCount,
    products,
  };
}

function mapCalendarEntry(row: ReleaseSummary): ReleaseCalendarEntry {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    game: row.game,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    releaseDate: row.releaseDate,
    expectedDispatchAt: row.expectedDispatchAt,
    expectedArrivalAt: row.expectedArrivalAt,
    announcementText: row.announcementText,
    featuredOnHomepage: row.featuredOnHomepage,
    visible: row.visible,
    productCount: row.productCount,
    releaseStatusCounts: {
      RELEASED: row.products.filter((product) => product.releaseStatus === 'RELEASED').length,
      PREORDER: row.products.filter((product) => product.releaseStatus === 'PREORDER').length,
      COMING_SOON: row.products.filter((product) => product.releaseStatus === 'COMING_SOON').length,
      ARCHIVED: row.products.filter((product) => product.releaseStatus === 'ARCHIVED').length,
    },
    products: row.products,
  };
}

function buildSeedReleaseSummary(releaseSlug: string): ReleaseSummary | null {
  const release = seedReleases.find((entry) => entry.slug === releaseSlug);

  if (!release) {
    return null;
  }

  const category = seedCategories.find((entry) => entry.slug === release.categorySlug);
  if (!category) {
    return null;
  }

  const products = seedReleaseProducts
    .filter((item) => item.releaseSlug === release.slug)
    .map((entry) => {
      const product = seedProducts.find((item) => item.slug === entry.productSlug);
      const supplier = seedSuppliers.find((supplierEntry) => supplierEntry.slug === product?.supplierSlug);

      if (!product || !supplier) {
        throw new Error(`Incomplete seeded release data for ${entry.productSlug}`);
      }

      return {
        id: entry.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categoryName: category.name,
        game: product.game,
        releaseStatus: entry.releaseStatus,
        releaseDate: entry.releaseDate,
        expectedDispatchAt: entry.expectedDispatchAt,
        expectedArrivalAt: entry.expectedArrivalAt,
        allocationLimit: entry.allocationLimit,
        customerPurchaseLimit: entry.customerPurchaseLimit,
        supplierAllocation: entry.supplierAllocation,
        lowAllocationThreshold: entry.lowAllocationThreshold,
        allocatedQuantity: entry.allocatedQuantity,
        availabilityMessage: entry.availabilityMessage,
        preorderBadgeLabel: entry.preorderBadgeLabel,
        comingSoonBadgeLabel: entry.comingSoonBadgeLabel,
        supplierName: supplier.name,
        imageLabel: product.imageLabel,
      } satisfies ReleaseProduct;
    });

  return {
    id: release.id,
    name: release.name,
    slug: release.slug,
    brand: release.brand,
    game: release.game,
    categorySlug: category.slug,
    categoryName: category.name,
    releaseDate: release.releaseDate,
    expectedDispatchAt: release.expectedDispatchAt,
    expectedArrivalAt: release.expectedArrivalAt,
    announcementText: release.announcementText,
    releaseNotes: release.releaseNotes,
    visible: release.visible,
    featuredOnHomepage: release.featuredOnHomepage,
    supplierName: products[0]?.supplierName ?? 'Unknown supplier',
    productCount: products.length,
    preorderProductCount: products.filter((product) => product.releaseStatus === 'PREORDER').length,
    comingSoonProductCount: products.filter((product) => product.releaseStatus === 'COMING_SOON').length,
    lowAllocationCount: products.filter((product) => {
      const remaining = calculateRemainingAllocation(product.allocationLimit, product.allocatedQuantity);
      return remaining != null && product.lowAllocationThreshold != null && remaining <= product.lowAllocationThreshold;
    }).length,
    products,
  };
}

function getSeedReleaseSummaries(filters: ReleaseFilters = {}) {
  const query = normalizeSearch(filters.search);
  const releaseMonth = filters.month?.trim() ?? '';

  return seedReleases
    .map((release) => buildSeedReleaseSummary(release.slug))
    .filter((release): release is ReleaseSummary => Boolean(release))
    .filter((release) => {
      if (filters.game && release.game.toLowerCase() !== filters.game.trim().toLowerCase()) {
        return false;
      }

      if (filters.brand && release.brand.toLowerCase() !== filters.brand.trim().toLowerCase()) {
        return false;
      }

      if (filters.category && release.categorySlug.toLowerCase() !== filters.category.trim().toLowerCase()) {
        return false;
      }

      if (releaseMonth && formatMonthKey(new Date(release.releaseDate)) !== releaseMonth) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        release.name,
        release.brand,
        release.game,
        release.categoryName,
        release.announcementText ?? '',
        ...release.products.map((product) => product.productName),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    })
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
}

async function loadReleasesFromDatabase(
  filters: ReleaseFilters = {},
  db = prisma,
  includeHidden = false,
): Promise<ReleaseSummary[]> {
  const where: Prisma.ReleaseWhereInput = {};

  if (!includeHidden) {
    where.visible = true;
  }

  if (filters.game) {
    where.game = { contains: filters.game, mode: 'insensitive' };
  }

  if (filters.brand) {
    where.brand = { contains: filters.brand, mode: 'insensitive' };
  }

  if (filters.category) {
    where.category = { is: { slug: filters.category } };
  }

  if (filters.month) {
    const [yearPart, monthPart] = filters.month.split('-');
    const year = Number.parseInt(yearPart ?? '', 10);
    const month = Number.parseInt(monthPart ?? '', 10);
    if (Number.isFinite(year) && Number.isFinite(month)) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      where.releaseDate = { gte: start, lt: end };
    }
  }

  const releases = await db.release.findMany({
    where,
    orderBy: [{ featuredOnHomepage: 'desc' }, { releaseDate: 'asc' }],
    include: releaseInclude,
  });

  const mapped = releases.map(mapReleaseRow);
  const query = normalizeSearch(filters.search);

  return mapped.filter((release) => {
    if (!query) {
      return true;
    }

    const searchable = [
      release.name,
      release.brand,
      release.game,
      release.categoryName,
      release.announcementText ?? '',
      release.releaseNotes ?? '',
      ...release.products.map((product) => product.productName),
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(query);
  });
}

function groupCalendarByMonth(releases: ReleaseCalendarEntry[]): ReleaseCalendarGroup[] {
  const groups = new Map<string, ReleaseCalendarGroup>();

  for (const release of releases) {
    const date = new Date(release.releaseDate);
    const key = formatMonthKey(date);
    const label = formatMonthLabel(date);
    const group = groups.get(key) ?? { key, label, releases: [] };
    group.releases.push(release);
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export async function getComingSoonHubData(db = prisma): Promise<ComingSoonHubData> {
  const releases = await getReleaseSummaries({}, db);
  const upcomingReleases = releases
    .filter((release) => new Date(release.releaseDate).getTime() >= Date.now())
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const featuredRelease = upcomingReleases.find((release) => release.featuredOnHomepage) ?? upcomingReleases[0] ?? null;
  const upcomingProducts = upcomingReleases.flatMap((release) => release.products);
  const upcomingSealedProducts = upcomingProducts.filter((product) => product.categoryName.toLowerCase() === 'sealed product');
  const upcomingAccessories = upcomingProducts.filter((product) => product.categoryName.toLowerCase() === 'accessories');
  const upcomingSets = upcomingProducts.filter((product) => product.productName.toLowerCase().includes('set') || product.productName.toLowerCase().includes('box'));
  const recentlyAnnounced = [...releases].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 4);
  const trendingUpcoming = [...upcomingProducts]
    .sort((a, b) => {
      const remainingA = calculateRemainingAllocation(a.allocationLimit, a.allocatedQuantity) ?? Number.MAX_SAFE_INTEGER;
      const remainingB = calculateRemainingAllocation(b.allocationLimit, b.allocatedQuantity) ?? Number.MAX_SAFE_INTEGER;
      return remainingA - remainingB;
    })
    .slice(0, 6);

  return {
    featuredRelease,
    upcomingReleases,
    upcomingSealedProducts,
    upcomingAccessories,
    upcomingSets,
    recentlyAnnounced,
    trendingUpcoming,
    releaseTimeline: groupCalendarByMonth(upcomingReleases.map(mapCalendarEntry)),
  };
}

async function getReleaseSummaries(
  filters: ReleaseFilters = {},
  db = prisma,
  options: { includeHidden?: boolean } = {},
): Promise<ReleaseSummary[]> {
  if (process.env.TCG_HOBBY_RELEASE_DATA_SOURCE === 'seed') {
    return getSeedReleaseSummaries(filters);
  }

  try {
    return await loadReleasesFromDatabase(filters, db, options.includeHidden ?? false);
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Release data is unavailable in production.');
    }

    return getSeedReleaseSummaries(filters);
  }
}

export async function getReleaseCalendar(filters: ReleaseFilters = {}, db = prisma) {
  const releases = await getReleaseSummaries(filters, db);
  const calendar = releases.map(mapCalendarEntry);
  return {
    releases: calendar,
    months: groupCalendarByMonth(calendar),
    filters,
  };
}

export async function getReleaseBySlug(slug: string, db = prisma): Promise<ReleaseSummary | null> {
  const releases = await getReleaseSummaries({}, db);
  return releases.find((release) => release.slug === slug) ?? null;
}

export async function getAdminReleases(filters: AdminReleaseFilters = {}, db = prisma) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.max(filters.pageSize ?? 12, 1);
  const releases = await getReleaseSummaries(filters, db, { includeHidden: true });
  const totalItems = releases.length;
  const pagination = resolvePagination(totalItems, page, pageSize);
  const offset = (pagination.page - 1) * pageSize;

  return {
    releases: releases.slice(offset, offset + pageSize),
    pagination,
  };
}

export async function getAdminReleaseById(id: string, db = prisma): Promise<ReleaseSummary | null> {
  const releases = await getReleaseSummaries({}, db, { includeHidden: true });
  return releases.find((release) => release.id === id) ?? null;
}

export async function createAdminRelease(input: ReleaseFormInput, db = prisma) {
  const slug = slugify(input.slug || input.name) || 'release';

  const created = await db.$transaction(async (tx) => {
    const release = await tx.release.create({
      data: {
        name: input.name,
        slug,
        brand: input.brand,
        game: input.game,
        categoryId: input.categoryId,
        releaseDate: new Date(input.releaseDate),
        expectedDispatchAt: input.expectedDispatchAt ? new Date(input.expectedDispatchAt) : null,
        expectedArrivalAt: input.expectedArrivalAt ? new Date(input.expectedArrivalAt) : null,
        announcementText: input.announcementText || null,
        releaseNotes: input.releaseNotes || null,
        visible: input.visible,
        featuredOnHomepage: input.featuredOnHomepage,
      },
    });

    if (input.productIds.length) {
      await tx.releaseProduct.createMany({
        data: input.productIds.map((productId) => ({
          releaseId: release.id,
          productId,
          status: input.releaseDate ? 'PREORDER' : 'COMING_SOON',
          releaseDate: new Date(input.releaseDate),
          expectedDispatchAt: input.expectedDispatchAt ? new Date(input.expectedDispatchAt) : null,
          expectedArrivalAt: input.expectedArrivalAt ? new Date(input.expectedArrivalAt) : null,
          allocationLimit: input.allocationLimit ?? null,
          customerPurchaseLimit: input.customerPurchaseLimit ?? null,
          supplierAllocation: input.supplierAllocation ?? null,
          allocatedQuantity: 0,
          lowAllocationThreshold: input.lowAllocationThreshold ?? null,
          availabilityMessage: input.announcementText || null,
          preorderBadgeLabel: input.preorderBadgeLabel ?? null,
          comingSoonBadgeLabel: input.comingSoonBadgeLabel ?? null,
        })),
      });
    }

    return release;
  });

  return getAdminReleaseById(created.id, db);
}

export async function updateAdminRelease(id: string, input: ReleaseFormInput, db = prisma) {
  const slug = slugify(input.slug || input.name) || 'release';

  const updated = await db.$transaction(async (tx) => {
    const release = await tx.release.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        brand: input.brand,
        game: input.game,
        categoryId: input.categoryId,
        releaseDate: new Date(input.releaseDate),
        expectedDispatchAt: input.expectedDispatchAt ? new Date(input.expectedDispatchAt) : null,
        expectedArrivalAt: input.expectedArrivalAt ? new Date(input.expectedArrivalAt) : null,
        announcementText: input.announcementText || null,
        releaseNotes: input.releaseNotes || null,
        visible: input.visible,
        featuredOnHomepage: input.featuredOnHomepage,
      },
    });

    await tx.releaseProduct.deleteMany({ where: { releaseId: id } });

    if (input.productIds.length) {
      await tx.releaseProduct.createMany({
        data: input.productIds.map((productId) => ({
          releaseId: release.id,
          productId,
          status: input.releaseDate ? 'PREORDER' : 'COMING_SOON',
          releaseDate: new Date(input.releaseDate),
          expectedDispatchAt: input.expectedDispatchAt ? new Date(input.expectedDispatchAt) : null,
          expectedArrivalAt: input.expectedArrivalAt ? new Date(input.expectedArrivalAt) : null,
          allocationLimit: input.allocationLimit ?? null,
          customerPurchaseLimit: input.customerPurchaseLimit ?? null,
          supplierAllocation: input.supplierAllocation ?? null,
          allocatedQuantity: 0,
          lowAllocationThreshold: input.lowAllocationThreshold ?? null,
          availabilityMessage: input.announcementText || null,
          preorderBadgeLabel: input.preorderBadgeLabel ?? null,
          comingSoonBadgeLabel: input.comingSoonBadgeLabel ?? null,
        })),
      });
    }

    return release;
  });

  return getAdminReleaseById(updated.id, db);
}

export async function getCustomerNotificationSubscriptions(userId: string, db = prisma): Promise<NotificationSubscriptionRow[]> {
  const rows: NotificationSubscriptionResultRow[] = await db.notificationSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: notificationSubscriptionInclude,
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    productName: row.product.name,
    productSlug: row.product.slug ?? row.productId,
    preference: row.preference,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function toggleNotificationSubscription(userId: string, productId: string, preference: NotificationPreference = 'ALL', db = prisma) {
  const existing = await db.notificationSubscription.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  if (existing) {
    await db.notificationSubscription.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { subscribed: false };
  }

  await db.notificationSubscription.create({
    data: {
      userId,
      productId,
      preference,
    },
  });

  return { subscribed: true };
}

export async function setNotificationSubscriptionPreference(userId: string, productId: string, preference: NotificationPreference, db = prisma) {
  await db.notificationSubscription.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    create: {
      userId,
      productId,
      preference,
    },
    update: {
      preference,
    },
  });
}

export function calculateCountdownParts(targetDate: string | Date, now = new Date()) {
  const target = safeDate(targetDate);

  if (!target) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      expired: true,
    };
  }

  const totalMs = Math.max(target.getTime() - now.getTime(), 0);
  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    expired: totalMs === 0,
  };
}

export function calculateAllocationState(allocationLimit: number | null, allocatedQuantity: number, lowAllocationThreshold: number | null) {
  const remainingAllocation = calculateRemainingAllocation(allocationLimit, allocatedQuantity);

  return {
    allocatedQuantity,
    allocationLimit,
    remainingAllocation,
    lowAllocation: calculateLowAllocationWarning(allocationLimit, allocatedQuantity, lowAllocationThreshold),
    soldOut: remainingAllocation === 0,
  };
}
