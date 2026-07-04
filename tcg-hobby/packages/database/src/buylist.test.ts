import { describe, expect, it, vi, beforeEach } from 'vitest';
import { addProductToBuylist, getBuylistSearchProducts, submitBuylistRequest } from './buylist';
import { getProductPricingSnapshot } from './pricing';

vi.mock('./pricing', () => ({
  getProductPricingSnapshot: vi.fn(),
}));

function createDbMock() {
  return {
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    buylist: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    buylistItem: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as any;
}

const pricingSnapshot = {
  costMinor: 0,
  retailMinor: 0,
  buyMinor: 700,
  marginMinor: 0,
  markupPercent: 0,
  profitMinor: 0,
  minimumMarginPercent: 30,
  maximumDiscountPercent: 45,
  priceSource: 'Global pricing',
  priceStatus: 'ACTIVE' as const,
  manualOverride: false,
  updatedAt: '2026-07-04T00:00:00.000Z',
  pricingRuleId: 'rule-1',
  ruleName: 'Global pricing',
};

beforeEach(() => {
  vi.mocked(getProductPricingSnapshot).mockResolvedValue(pricingSnapshot);
});

describe('buylist repository', () => {
  it('searches eligible products with buylist pricing', async () => {
    const db = createDbMock();
    db.product.count.mockResolvedValue(1);
    db.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        slug: 'arcane-booster-box',
        name: 'Arcane Booster Box',
        game: 'Magic',
        description: 'A premium sealed product.',
        category: { id: 'cat-1', name: 'Sealed Product', slug: 'sealed-product' },
        inventory: { stockOnHand: 5, reservedStock: 1 },
        supplierProducts: [{ supplier: { id: 'sup-1', name: 'Card Citadel' } }],
        imageLabel: 'Arcane Booster Box',
      },
    ]);

    const result = await getBuylistSearchProducts({ search: 'arcane', category: 'sealed-product', page: 2, pageSize: 1 }, db);

    expect(db.product.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          published: true,
          archivedAt: null,
          pricing: expect.any(Object),
        }),
      }),
    );
    expect(result.products[0]?.buyMinor).toBe(700);
    expect(result.pagination.page).toBe(1);
  });

  it('adds items to a draft and recalculates the payout summary', async () => {
    const db = createDbMock();

    db.buylist.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'buylist-1',
        buylistNumber: 'BL-20260704-0001',
        userId: 'user-1',
        status: 'DRAFT',
        currency: 'GBP',
        estimatedPayoutMinor: 1400,
        offeredPayoutMinor: 1400,
        customerNotes: null,
        staffNotes: null,
        paymentReference: null,
        submittedAt: null,
        receivedAt: null,
        reviewedAt: null,
        approvedAt: null,
        rejectedAt: null,
        paidAt: null,
        createdAt: new Date('2026-07-04T00:00:00.000Z'),
        updatedAt: new Date('2026-07-04T00:00:00.000Z'),
        user: { id: 'user-1', name: 'Sam Collector', email: 'sam@example.test' },
        items: [
          {
            id: 'item-1',
            quantity: 2,
            estimatedBuyMinor: 700,
            offeredBuyMinor: 700,
            notes: null,
            product: {
              id: 'prod-1',
              slug: 'arcane-booster-box',
              name: 'Arcane Booster Box',
              game: 'Magic',
              description: 'A premium sealed product.',
              featured: true,
              published: true,
              archivedAt: null,
              imageLabel: 'Arcane Booster Box',
              category: { id: 'cat-1', name: 'Sealed Product', slug: 'sealed-product', description: 'desc', sortOrder: 1 },
              inventory: { stockOnHand: 5, reservedStock: 1 },
              supplierProducts: [{ supplier: { id: 'sup-1', name: 'Card Citadel' } }],
            },
          },
        ],
      });
    db.buylist.create.mockResolvedValue({ id: 'buylist-1' });
    db.buylistItem.findUnique.mockResolvedValue(null);
    db.buylistItem.upsert.mockResolvedValue({ id: 'item-1' });

    const result = await addProductToBuylist('user-1', 'prod-1', 2, db);

    expect(db.buylistItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          quantity: 2,
          estimatedBuyMinor: 700,
          offeredBuyMinor: 700,
        }),
      }),
    );
    expect(result?.estimatedPayoutMinor).toBe(1400);
    expect(result?.itemCount).toBe(2);
  });

  it('submits a draft and opens a fresh one for later use', async () => {
    const db = createDbMock();
    const draft = {
      id: 'buylist-1',
      buylistNumber: 'BL-20260704-0001',
      userId: 'user-1',
      status: 'DRAFT',
      currency: 'GBP',
      estimatedPayoutMinor: 500,
      offeredPayoutMinor: 500,
      customerNotes: null,
      staffNotes: null,
      paymentReference: null,
      submittedAt: null,
      receivedAt: null,
      reviewedAt: null,
      approvedAt: null,
      rejectedAt: null,
      paidAt: null,
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      updatedAt: new Date('2026-07-04T00:00:00.000Z'),
      user: { id: 'user-1', name: 'Sam Collector', email: 'sam@example.test' },
      items: [
        {
          id: 'item-1',
          quantity: 1,
          estimatedBuyMinor: 500,
          offeredBuyMinor: 500,
          notes: null,
          product: {
            id: 'prod-1',
            slug: 'arcane-booster-box',
            name: 'Arcane Booster Box',
            game: 'Magic',
            description: 'A premium sealed product.',
            featured: true,
            published: true,
            archivedAt: null,
            imageLabel: 'Arcane Booster Box',
            category: { id: 'cat-1', name: 'Sealed Product', slug: 'sealed-product', description: 'desc', sortOrder: 1 },
            inventory: { stockOnHand: 5, reservedStock: 1 },
            supplierProducts: [{ supplier: { id: 'sup-1', name: 'Card Citadel' } }],
          },
        },
      ],
    };

    db.buylist.findFirst
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(null);
    db.buylist.update.mockResolvedValue({});
    db.buylist.create.mockResolvedValue({ id: 'buylist-2' });
    db.buylist.findUnique.mockResolvedValue({
      ...draft,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-07-04T12:00:00.000Z'),
    });

    const result = await submitBuylistRequest('user-1', 'Gift wrap please', db);

    expect(db.buylist.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'buylist-1' },
        data: expect.objectContaining({
          status: 'SUBMITTED',
          customerNotes: 'Gift wrap please',
          estimatedPayoutMinor: 500,
          offeredPayoutMinor: 500,
        }),
      }),
    );
    expect(db.buylist.create).toHaveBeenCalledTimes(1);
    expect(result?.status).toBe('SUBMITTED');
    expect(result?.estimatedPayoutMinor).toBe(500);
  });
});
