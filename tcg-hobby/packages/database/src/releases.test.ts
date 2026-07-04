import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateAllocationState,
  calculateCountdownParts,
  getComingSoonHubData,
  getCustomerNotificationSubscriptions,
  getReleaseCalendar,
  setNotificationSubscriptionPreference,
  toggleNotificationSubscription,
} from './releases';

const originalNodeEnv = process.env.NODE_ENV;
const originalReleaseSource = process.env.TCG_HOBBY_RELEASE_DATA_SOURCE;

function createDbMock() {
  return {
    notificationSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    release: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    releaseProduct: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(createDbMock() as any)),
  } as any;
}

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalReleaseSource === undefined) {
    delete process.env.TCG_HOBBY_RELEASE_DATA_SOURCE;
  } else {
    process.env.TCG_HOBBY_RELEASE_DATA_SOURCE = originalReleaseSource;
  }
});

describe('release calculations', () => {
  it('calculates countdown parts from a release date', () => {
    const result = calculateCountdownParts('2026-07-10T12:00:00.000Z', new Date('2026-07-08T09:30:00.000Z'));

    expect(result.days).toBe(2);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
    expect(result.expired).toBe(false);
  });

  it('calculates allocation state and low allocation warnings', () => {
    const result = calculateAllocationState(100, 92, 10);

    expect(result.remainingAllocation).toBe(8);
    expect(result.lowAllocation).toBe(true);
    expect(result.soldOut).toBe(false);
  });
});

describe('release repository', () => {
  it('filters releases by month and search term', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TCG_HOBBY_RELEASE_DATA_SOURCE = 'seed';

    const calendar = await getReleaseCalendar({
      search: 'ancient',
      game: 'Pokemon',
      brand: 'Pokemon',
      category: 'sealed-product',
      month: '2026-07',
    });

    expect(calendar.releases.length).toBeGreaterThan(0);
    expect(calendar.releases.every((release) => release.name.toLowerCase().includes('ancient'))).toBe(true);
    expect(calendar.releases.every((release) => release.game === 'Pokemon')).toBe(true);
    expect(calendar.releases.every((release) => release.releaseDate.startsWith('2026-07'))).toBe(true);
  });

  it('builds a coming soon hub from seeded release data', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TCG_HOBBY_RELEASE_DATA_SOURCE = 'seed';

    const hub = await getComingSoonHubData();

    expect(hub.featuredRelease).not.toBeNull();
    expect(hub.upcomingReleases.length).toBeGreaterThan(0);
    expect(hub.releaseTimeline.length).toBeGreaterThan(0);
  });

  it('toggles notification subscriptions and updates preferences', async () => {
    const db = createDbMock();
    db.notificationSubscription.findUnique.mockResolvedValue(null);
    db.notificationSubscription.create.mockResolvedValue({ id: 'sub-1' });
    db.notificationSubscription.delete.mockResolvedValue({ id: 'sub-1' });
    db.notificationSubscription.upsert.mockResolvedValue({ id: 'sub-1' });
    db.notificationSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        productId: 'prod-1',
        preference: 'ALL',
        createdAt: new Date('2026-07-04T00:00:00.000Z'),
        updatedAt: new Date('2026-07-04T00:00:00.000Z'),
        product: { name: 'Ancient Legends Booster Box', slug: 'ancient-legends-booster-box' },
      },
    ]);

    const added = await toggleNotificationSubscription('user-1', 'prod-1', 'PREORDER', db);
    expect(added.subscribed).toBe(true);

    db.notificationSubscription.findUnique.mockResolvedValue({ id: 'sub-1' });
    const removed = await toggleNotificationSubscription('user-1', 'prod-1', 'PREORDER', db);
    expect(removed.subscribed).toBe(false);

    await setNotificationSubscriptionPreference('user-1', 'prod-1', 'RELEASE', db);
    const subscriptions = await getCustomerNotificationSubscriptions('user-1', db);

    expect(subscriptions[0]?.productName).toBe('Ancient Legends Booster Box');
    expect(db.notificationSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          preference: 'RELEASE',
        }),
        update: expect.objectContaining({
          preference: 'RELEASE',
        }),
      }),
    );
  });
});
