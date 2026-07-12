import { describe, expect, it, vi } from 'vitest';
import { MarketingSubscriberStatus } from '@prisma/client';
import {
  exportMarketingSubscribersCsv,
  getMarketingEligibilityWhere,
  isMarketingSubscriberEligible,
  normalizeSubscriberEmail,
  normalizeSubscriberFirstName,
  unsubscribeMarketingSubscriberByToken,
  upsertMarketingSubscriberSignup,
  validateSubscriberEmail,
} from './marketing';

function createSignupDb(existing: any = null) {
  const tx = {
    marketingSubscriberTag: {
      upsert: vi.fn(async ({ where }: any) => ({ id: `tag-${where.slug}`, slug: where.slug, label: where.slug })),
    },
    marketingSubscriber: {
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async ({ data }: any) => ({
        id: 'subscriber-1',
        email: data.email,
        firstName: data.firstName,
        unsubscribeToken: data.unsubscribeToken,
        confirmationEmailSentAt: null,
        confirmationEmailLastAttemptAt: null,
      })),
      update: vi.fn(async ({ data }: any) => ({
        id: existing?.id ?? 'subscriber-1',
        email: existing?.email ?? 'collector@example.test',
        unsubscribeToken: existing?.unsubscribeToken ?? 'token-1',
        confirmationEmailSentAt: existing?.confirmationEmailSentAt ?? null,
        confirmationEmailLastAttemptAt: existing?.confirmationEmailLastAttemptAt ?? null,
        ...data,
      })),
    },
    marketingSubscriberTagAssignment: {
      createMany: vi.fn(),
    },
  };
  const db = {
    $transaction: vi.fn(async (callback: any) => callback(tx)),
  };

  return { db: db as any, tx };
}

function createExistingSubscriber(status: MarketingSubscriberStatus, overrides: Record<string, unknown> = {}) {
  return {
    id: 'subscriber-1',
    email: 'collector@example.test',
    firstName: 'Existing',
    marketingConsent: status === MarketingSubscriberStatus.ACTIVE,
    status,
    confirmationEmailSentAt: new Date('2026-01-01'),
    confirmationEmailLastAttemptAt: new Date('2026-01-01'),
    unsubscribeToken: 'token-1',
    ...overrides,
  };
}

describe('marketing subscribers', () => {
  it('normalizes and validates subscriber identity fields', () => {
    expect(normalizeSubscriberEmail(' Collector@Example.COM ')).toBe('collector@example.com');
    expect(normalizeSubscriberFirstName('  Mia   Carter  ')).toBe('Mia Carter');
    expect(validateSubscriberEmail('bad-email').ok).toBe(false);
    expect(validateSubscriberEmail('collector@example.test').ok).toBe(true);
  });

  it('creates a launch subscriber with newsletter tag only after consent', async () => {
    const { db, tx } = createSignupDb();

    const result = await upsertMarketingSubscriberSignup({
      email: 'Collector@Example.Test',
      firstName: ' Mia ',
      source: 'coming-soon-page',
      marketingConsent: true,
      consentIp: '127.0.0.1',
    }, db);

    expect(result.created).toBe(true);
    expect(tx.marketingSubscriber.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'collector@example.test',
        firstName: 'Mia',
        source: 'coming-soon-page',
        marketingConsent: true,
        marketingConsentAt: expect.any(Date),
        consentSource: 'coming-soon-page',
        privacyPolicyVersion: '2026-07-11',
        consentIpHash: expect.any(String),
      }),
    }));
    expect(tx.marketingSubscriberTagAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { subscriberId: 'subscriber-1', tagId: 'tag-launch' },
        { subscriberId: 'subscriber-1', tagId: 'tag-newsletter' },
      ],
      skipDuplicates: true,
    });
  });

  it('rejects duplicate signup without consent before subscriber updates', async () => {
    const existing = createExistingSubscriber(MarketingSubscriberStatus.ACTIVE);
    const { db, tx } = createSignupDb(existing);

    await expect(upsertMarketingSubscriberSignup({
      email: 'collector@example.test',
      source: 'coming-soon-page',
      marketingConsent: false,
    }, db)).rejects.toThrow('Marketing consent is required');

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(tx.marketingSubscriber.update).not.toHaveBeenCalled();
    expect(tx.marketingSubscriberTagAssignment.createMany).not.toHaveBeenCalled();
  });

  it('returns duplicate active signups without resending or overwriting consent history', async () => {
    const existing = createExistingSubscriber(MarketingSubscriberStatus.ACTIVE);
    const { db, tx } = createSignupDb(existing);

    const result = await upsertMarketingSubscriberSignup({
      email: 'collector@example.test',
      firstName: 'New Name',
      source: 'coming-soon-page',
      marketingConsent: true,
      consentIp: '127.0.0.1',
    }, db);

    expect(result.created).toBe(false);
    expect(result.shouldSendConfirmation).toBe(false);
    expect(tx.marketingSubscriber.create).not.toHaveBeenCalled();
    expect(tx.marketingSubscriber.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'subscriber-1' },
      data: {
        lastUpdatedSource: 'coming-soon-page',
        lastSignupAt: expect.any(Date),
      },
    }));
    expect(tx.marketingSubscriberTag.upsert).not.toHaveBeenCalled();
    expect(tx.marketingSubscriberTagAssignment.createMany).not.toHaveBeenCalled();
  });

  it.each([
    MarketingSubscriberStatus.UNSUBSCRIBED,
    MarketingSubscriberStatus.BOUNCED,
    MarketingSubscriberStatus.SUPPRESSED,
  ])('preserves %s duplicate state without confirmation email', async (status) => {
    const existing = createExistingSubscriber(status, { marketingConsent: false });
    const { db, tx } = createSignupDb(existing);

    const result = await upsertMarketingSubscriberSignup({
      email: 'collector@example.test',
      source: 'coming-soon-page',
      marketingConsent: true,
    }, db);

    expect(result.created).toBe(false);
    expect(result.shouldSendConfirmation).toBe(false);
    expect(tx.marketingSubscriber.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({
        status: MarketingSubscriberStatus.ACTIVE,
        unsubscribedAt: null,
        marketingConsent: true,
      }),
    }));
    expect(tx.marketingSubscriberTagAssignment.createMany).not.toHaveBeenCalled();
  });

  it('centralizes campaign eligibility', () => {
    expect(getMarketingEligibilityWhere()).toEqual({
      marketingConsent: true,
      status: MarketingSubscriberStatus.ACTIVE,
      unsubscribedAt: null,
      bouncedAt: null,
      suppressedAt: null,
    });
    expect(isMarketingSubscriberEligible({
      marketingConsent: true,
      status: MarketingSubscriberStatus.ACTIVE,
      unsubscribedAt: null,
      bouncedAt: null,
      suppressedAt: null,
    })).toBe(true);
    expect(isMarketingSubscriberEligible({
      marketingConsent: true,
      status: MarketingSubscriberStatus.UNSUBSCRIBED,
      unsubscribedAt: new Date(),
      bouncedAt: null,
      suppressedAt: null,
    })).toBe(false);
  });

  it('unsubscribes by token without exposing email and remains idempotent', async () => {
    const db = {
      marketingSubscriber: {
        findUnique: vi.fn(async () => ({ id: 'subscriber-1', status: MarketingSubscriberStatus.ACTIVE, unsubscribedAt: null })),
        update: vi.fn(),
      },
    } as any;

    const result = await unsubscribeMarketingSubscriberByToken('token-1', db);

    expect(result).toEqual({ ok: true, alreadyUnsubscribed: false });
    expect(db.marketingSubscriber.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'subscriber-1' },
      data: expect.objectContaining({
        status: MarketingSubscriberStatus.UNSUBSCRIBED,
        marketingConsent: false,
      }),
    }));
  });

  it('sanitizes subscriber exports for spreadsheets', async () => {
    const db = {
      marketingSubscriber: {
        findMany: vi.fn(async () => [
          {
            email: '=formula@example.test',
            firstName: '+Mia',
            marketingConsent: true,
            status: MarketingSubscriberStatus.ACTIVE,
            source: 'coming-soon-page',
            lastSignupAt: new Date('2026-01-01T10:00:00.000Z'),
            createdAt: new Date('2026-01-01T10:00:00.000Z'),
            unsubscribedAt: null,
            tags: [{ tag: { slug: 'launch' } }],
          },
        ]),
      },
    } as any;

    const csv = await exportMarketingSubscribersCsv({}, db);

    expect(csv).toContain('"\'=formula@example.test"');
    expect(csv).toContain(`"'+Mia"`);
  });
});
