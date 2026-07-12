import { createHash, randomBytes } from 'node:crypto';
import { MarketingCampaignStatus, MarketingSubscriberStatus, type Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from './client';

export const DEFAULT_MARKETING_TAGS = [
  { slug: 'launch', label: 'Launch', description: 'Launch list signups and launch-day updates.' },
  { slug: 'newsletter', label: 'Newsletter', description: 'General product news and selected marketing updates.' },
  { slug: 'pokemon', label: 'Pokemon', description: 'Pokemon launch, preorder, and restock interest.' },
  { slug: 'magic-the-gathering', label: 'Magic: The Gathering', description: 'Magic release and restock interest.' },
  { slug: 'lorcana', label: 'Lorcana', description: 'Lorcana release and restock interest.' },
  { slug: 'one-piece', label: 'One Piece Card Game', description: 'One Piece Card Game release and restock interest.' },
  { slug: 'yugioh', label: 'Yu-Gi-Oh!', description: 'Yu-Gi-Oh! release and restock interest.' },
  { slug: 'flesh-and-blood', label: 'Flesh and Blood', description: 'Flesh and Blood release and restock interest.' },
  { slug: 'vip', label: 'VIP', description: 'High-priority customer communication segment.' },
  { slug: 'customer', label: 'Customer', description: 'Subscribers linked to customer accounts.' },
  { slug: 'preorder', label: 'Preorder', description: 'Preorder notification interest.' },
  { slug: 'restock-alert', label: 'Restock Alert', description: 'Restock notification interest.' },
] as const;

export type MarketingSignupInput = {
  email: string;
  firstName?: string | null;
  marketingConsent?: boolean;
  source?: string;
  consentSource?: string;
  privacyPolicyVersion?: string;
  consentIp?: string | null;
  tags?: string[];
};

export type MarketingSignupResult = {
  subscriberId: string;
  email: string;
  firstName: string | null;
  created: boolean;
  shouldSendConfirmation: boolean;
  unsubscribeToken: string;
};

export type MarketingSubscriberListInput = {
  search?: string;
  status?: MarketingSubscriberStatus | 'ALL' | '';
  tag?: string;
  consent?: 'all' | 'yes' | 'no';
  page?: number;
  pageSize?: number;
};

export type MarketingSubscriberListItem = {
  id: string;
  email: string;
  firstName: string | null;
  marketingConsent: boolean;
  status: MarketingSubscriberStatus;
  source: string;
  lastSignupAt: Date;
  createdAt: Date;
  tags: Array<{ slug: string; label: string }>;
};

type MarketingDb = PrismaClient | Prisma.TransactionClient;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE_MAX_LENGTH = 120;
const NAME_MAX_LENGTH = 80;
const PRIVACY_POLICY_VERSION = '2026-07-11';
const MARKETING_CONSENT_REQUIRED_ERROR = 'Marketing consent is required for launch-list signup.';

export function normalizeSubscriberEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateSubscriberEmail(email: string) {
  const normalized = normalizeSubscriberEmail(email);

  if (!normalized) {
    return { ok: false as const, email: normalized, error: 'Enter your email address.' };
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return { ok: false as const, email: normalized, error: 'Enter a valid email address.' };
  }

  return { ok: true as const, email: normalized };
}

export function normalizeSubscriberFirstName(firstName?: string | null) {
  const normalized = firstName?.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX_LENGTH) ?? '';
  return normalized || null;
}

export function normalizeSubscriberSource(source?: string) {
  return source?.trim().slice(0, SOURCE_MAX_LENGTH) || 'storefront';
}

export function hashSubscriberIp(ip?: string | null) {
  const normalized = ip?.trim();

  if (!normalized) {
    return null;
  }

  return createHash('sha256').update(normalized).digest('hex');
}

export function createUnsubscribeToken() {
  return randomBytes(32).toString('base64url');
}

export function getMarketingEligibilityWhere(): Prisma.MarketingSubscriberWhereInput {
  return {
    marketingConsent: true,
    status: MarketingSubscriberStatus.ACTIVE,
    unsubscribedAt: null,
    bouncedAt: null,
    suppressedAt: null,
  };
}

export function isMarketingSubscriberEligible(subscriber: {
  marketingConsent: boolean;
  status: MarketingSubscriberStatus;
  unsubscribedAt: Date | null;
  bouncedAt: Date | null;
  suppressedAt: Date | null;
}) {
  return (
    subscriber.marketingConsent &&
    subscriber.status === MarketingSubscriberStatus.ACTIVE &&
    subscriber.unsubscribedAt === null &&
    subscriber.bouncedAt === null &&
    subscriber.suppressedAt === null
  );
}

function tagConfigFor(slug: string) {
  return DEFAULT_MARKETING_TAGS.find((tag) => tag.slug === slug) ?? {
    slug,
    label: slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    description: null,
  };
}

function uniqueTagSlugs(slugs: string[]) {
  return Array.from(new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean)));
}

async function ensureMarketingTags(slugs: string[], db: MarketingDb) {
  const tags = await Promise.all(
    uniqueTagSlugs(slugs).map((slug) => {
      const tag = tagConfigFor(slug);
      return db.marketingSubscriberTag.upsert({
        where: { slug },
        create: {
          slug: tag.slug,
          label: tag.label,
          description: tag.description,
        },
        update: {
          label: tag.label,
          description: tag.description,
        },
      });
    }),
  );

  return new Map(tags.map((tag) => [tag.slug, tag.id]));
}

function buildConsentUpdate(input: MarketingSignupInput) {
  if (!input.marketingConsent) {
    return {};
  }

  return {
    marketingConsent: true,
    marketingConsentAt: new Date(),
    consentSource: normalizeSubscriberSource(input.consentSource ?? input.source),
    privacyPolicyVersion: input.privacyPolicyVersion ?? PRIVACY_POLICY_VERSION,
    consentIpHash: hashSubscriberIp(input.consentIp),
  };
}

export async function upsertMarketingSubscriberSignup(input: MarketingSignupInput, db: PrismaClient = prisma): Promise<MarketingSignupResult> {
  const validation = validateSubscriberEmail(input.email);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  if (input.marketingConsent !== true) {
    throw new Error(MARKETING_CONSENT_REQUIRED_ERROR);
  }

  const source = normalizeSubscriberSource(input.source);
  const firstName = normalizeSubscriberFirstName(input.firstName);
  const signupTags = uniqueTagSlugs(['launch', ...(input.marketingConsent ? ['newsletter'] : []), ...(input.tags ?? [])]);

  return db.$transaction(async (tx) => {
    const existing = await tx.marketingSubscriber.findUnique({
      where: { email: validation.email },
      select: {
        id: true,
        firstName: true,
        marketingConsent: true,
        status: true,
        confirmationEmailSentAt: true,
        confirmationEmailLastAttemptAt: true,
        unsubscribeToken: true,
      },
    });

    const subscriber = existing
      ? await tx.marketingSubscriber.update({
          where: { id: existing.id },
          data: {
            lastUpdatedSource: source,
            lastSignupAt: new Date(),
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            unsubscribeToken: true,
            confirmationEmailSentAt: true,
            confirmationEmailLastAttemptAt: true,
          },
        })
      : await tx.marketingSubscriber.create({
          data: {
            email: validation.email,
            firstName,
            source,
            lastUpdatedSource: source,
            unsubscribeToken: createUnsubscribeToken(),
            ...buildConsentUpdate(input),
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            unsubscribeToken: true,
            confirmationEmailSentAt: true,
            confirmationEmailLastAttemptAt: true,
          },
        });

    if (!existing) {
      const tagIds = await ensureMarketingTags(signupTags, tx);

      await tx.marketingSubscriberTagAssignment.createMany({
        data: signupTags.map((slug) => ({
          subscriberId: subscriber.id,
          tagId: tagIds.get(slug) ?? slug,
        })),
        skipDuplicates: true,
      });
    }

    return {
      subscriberId: subscriber.id,
      email: subscriber.email,
      firstName: subscriber.firstName,
      created: !existing,
      shouldSendConfirmation: !existing && subscriber.confirmationEmailSentAt === null && subscriber.confirmationEmailLastAttemptAt === null,
      unsubscribeToken: subscriber.unsubscribeToken,
    };
  });
}

export async function recordMarketingConfirmationAttempt(subscriberId: string, db: MarketingDb = prisma) {
  await db.marketingSubscriber.update({
    where: { id: subscriberId },
    data: {
      confirmationEmailLastAttemptAt: new Date(),
      confirmationEmailError: null,
    },
  });
}

export async function recordMarketingConfirmationSent(subscriberId: string, db: MarketingDb = prisma) {
  await db.marketingSubscriber.update({
    where: { id: subscriberId },
    data: {
      confirmationEmailSentAt: new Date(),
      confirmationEmailLastAttemptAt: new Date(),
      confirmationEmailError: null,
      lastEmailSentAt: new Date(),
    },
  });
}

export async function recordMarketingConfirmationFailure(subscriberId: string, message: string, db: MarketingDb = prisma) {
  await db.marketingSubscriber.update({
    where: { id: subscriberId },
    data: {
      confirmationEmailLastAttemptAt: new Date(),
      confirmationEmailError: message.slice(0, 500),
    },
  });
}

export async function unsubscribeMarketingSubscriberByToken(token: string, db: MarketingDb = prisma) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return { ok: false as const };
  }

  const existing = await db.marketingSubscriber.findUnique({
    where: { unsubscribeToken: normalizedToken },
    select: { id: true, status: true, unsubscribedAt: true },
  });

  if (!existing) {
    return { ok: false as const };
  }

  if (existing.status === MarketingSubscriberStatus.UNSUBSCRIBED && existing.unsubscribedAt) {
    return { ok: true as const, alreadyUnsubscribed: true };
  }

  await db.marketingSubscriber.update({
    where: { id: existing.id },
    data: {
      status: MarketingSubscriberStatus.UNSUBSCRIBED,
      marketingConsent: false,
      unsubscribedAt: new Date(),
    },
  });

  return { ok: true as const, alreadyUnsubscribed: false };
}

function getSubscriberWhere(input: MarketingSubscriberListInput): Prisma.MarketingSubscriberWhereInput {
  const where: Prisma.MarketingSubscriberWhereInput = {};
  const search = input.search?.trim();

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (input.status && input.status !== 'ALL') {
    where.status = input.status;
  }

  if (input.consent === 'yes') {
    where.marketingConsent = true;
  }

  if (input.consent === 'no') {
    where.marketingConsent = false;
  }

  if (input.tag) {
    where.tags = {
      some: {
        tag: {
          slug: input.tag,
        },
      },
    };
  }

  return where;
}

export async function getMarketingSubscriberDashboard(db: MarketingDb = prisma) {
  const [total, eligible, unsubscribed, bounced, suppressed, tags] = await Promise.all([
    db.marketingSubscriber.count(),
    db.marketingSubscriber.count({ where: getMarketingEligibilityWhere() }),
    db.marketingSubscriber.count({ where: { status: MarketingSubscriberStatus.UNSUBSCRIBED } }),
    db.marketingSubscriber.count({ where: { status: MarketingSubscriberStatus.BOUNCED } }),
    db.marketingSubscriber.count({ where: { status: MarketingSubscriberStatus.SUPPRESSED } }),
    db.marketingSubscriberTag.findMany({
      orderBy: { label: 'asc' },
      select: { slug: true, label: true },
    }),
  ]);

  return {
    metrics: { total, eligible, unsubscribed, bounced, suppressed },
    tags,
  };
}

export async function getMarketingSubscribers(input: MarketingSubscriberListInput = {}, db: MarketingDb = prisma) {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const where = getSubscriberWhere(input);
  const totalItems = await db.marketingSubscriber.count({ where });
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const safePage = Math.min(page, totalPages);

  const subscribers = await db.marketingSubscriber.findMany({
    where,
    orderBy: { lastSignupAt: 'desc' },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      email: true,
      firstName: true,
      marketingConsent: true,
      status: true,
      source: true,
      lastSignupAt: true,
      createdAt: true,
      tags: {
        select: {
          tag: {
            select: {
              slug: true,
              label: true,
            },
          },
        },
      },
    },
  });

  return {
    subscribers: subscribers.map((subscriber): MarketingSubscriberListItem => ({
      ...subscriber,
      tags: subscriber.tags.map((assignment) => assignment.tag),
    })),
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: safePage > 1,
      hasNextPage: safePage < totalPages,
    },
  };
}

export async function getMarketingSubscriberById(id: string, db: MarketingDb = prisma) {
  return db.marketingSubscriber.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
        orderBy: {
          tag: {
            label: 'asc',
          },
        },
      },
      customer: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

export async function updateMarketingSubscriberStatus(id: string, status: MarketingSubscriberStatus, db: MarketingDb = prisma) {
  const now = new Date();
  await db.marketingSubscriber.update({
    where: { id },
    data: {
      status,
      ...(status === MarketingSubscriberStatus.UNSUBSCRIBED ? { marketingConsent: false, unsubscribedAt: now } : {}),
      ...(status === MarketingSubscriberStatus.BOUNCED ? { bouncedAt: now } : {}),
      ...(status === MarketingSubscriberStatus.SUPPRESSED ? { suppressedAt: now } : {}),
      ...(status === MarketingSubscriberStatus.ACTIVE ? { unsubscribedAt: null, bouncedAt: null, suppressedAt: null } : {}),
    },
  });
}

export async function updateMarketingSubscriberTags(id: string, tags: string[], db: PrismaClient = prisma) {
  const slugs = uniqueTagSlugs(tags);
  await db.$transaction(async (tx) => {
    const tagIds = await ensureMarketingTags(slugs, tx);
    await tx.marketingSubscriberTagAssignment.deleteMany({ where: { subscriberId: id } });
    if (slugs.length) {
      await tx.marketingSubscriberTagAssignment.createMany({
        data: slugs.map((slug) => ({ subscriberId: id, tagId: tagIds.get(slug) ?? slug })),
        skipDuplicates: true,
      });
    }
  });
}

function escapeCsv(value: string | number | boolean | Date | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function exportMarketingSubscribersCsv(input: MarketingSubscriberListInput = {}, db: MarketingDb = prisma) {
  const where = getSubscriberWhere(input);
  const subscribers = await db.marketingSubscriber.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      email: true,
      firstName: true,
      marketingConsent: true,
      status: true,
      source: true,
      lastSignupAt: true,
      createdAt: true,
      unsubscribedAt: true,
      tags: {
        select: {
          tag: {
            select: { slug: true },
          },
        },
      },
    },
  });
  const rows = [
    ['email', 'firstName', 'marketingConsent', 'status', 'source', 'tags', 'lastSignupAt', 'createdAt', 'unsubscribedAt'],
    ...subscribers.map((subscriber) => [
      subscriber.email,
      subscriber.firstName ?? '',
      subscriber.marketingConsent,
      subscriber.status,
      subscriber.source,
      subscriber.tags.map((assignment) => assignment.tag.slug).join('|'),
      subscriber.lastSignupAt,
      subscriber.createdAt,
      subscriber.unsubscribedAt,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export async function getMarketingCampaigns(db: MarketingDb = prisma) {
  return db.marketingCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      subject: true,
      previewText: true,
      status: true,
      scheduledAt: true,
      sentAt: true,
      createdAt: true,
    },
  });
}

export async function createMarketingCampaignDraft(
  input: { name: string; subject: string; previewText?: string; tag?: string; createdById?: string },
  db: MarketingDb = prisma,
) {
  const name = input.name.trim();
  const subject = input.subject.trim();

  if (!name || !subject) {
    throw new Error('Campaign name and subject are required.');
  }

  return db.marketingCampaign.create({
    data: {
      name,
      subject,
      previewText: input.previewText?.trim() || null,
      status: MarketingCampaignStatus.DRAFT,
      audienceDefinition: {
        eligibility: 'marketing-consent-active',
        tag: input.tag?.trim() || null,
      },
      ...(input.createdById ? { createdById: input.createdById } : {}),
    },
  });
}
