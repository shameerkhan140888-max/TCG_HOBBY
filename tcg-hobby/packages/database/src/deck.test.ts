import { describe, expect, it, vi } from 'vitest';
import { addCardToDeck, calculateDeckStatistics, generateDeckSlug, validateDeckCardQuantity } from './deck';

function createDbMock() {
  return {
    deck: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    deckCard: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  } as any;
}

describe('deck repository', () => {
  it('validates deck card quantities against the duplicate rule', () => {
    const result = validateDeckCardQuantity(5, 4);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('at most 4 copies');
  });

  it('generates a clean deck slug', () => {
    expect(generateDeckSlug('Friday Night Red')).toBe('friday-night-red');
  });

  it('calculates deck stats and missing collection cards', () => {
    const stats = calculateDeckStatistics(
      {
        maxCards: 60,
        maxCopiesPerCard: 4,
      },
      [
        {
          id: 'card-1',
          quantity: 4,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
          product: {
            id: 'prod-1',
            slug: 'alpha',
            name: 'Alpha',
            game: 'Magic: The Gathering',
            priceMinor: 1200,
            category: { name: 'Singles', slug: 'singles' },
          },
        },
      ],
      [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Alpha',
          productSlug: 'alpha',
          game: 'Magic: The Gathering',
          categoryName: 'Singles',
          setName: 'Set A',
          ownedQuantity: 2,
          printVariant: 'REGULAR',
          condition: 'NEAR_MINT',
          foil: false,
          language: 'EN',
          notes: null,
          dateAcquired: '2026-07-01T00:00:00.000Z',
          purchasePriceMinor: 1200,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    );

    expect(stats.cardCount).toBe(4);
    expect(stats.uniqueCards).toBe(1);
    expect(stats.missingCardsFromCollection[0]?.missingQuantity).toBe(2);
    expect(stats.warnings[0]).toContain('missing from your collection');
  });

  it('prevents adding more copies than the duplicate rule allows', async () => {
    const db = createDbMock();
    db.deck.findFirst.mockResolvedValue({
      id: 'deck-1',
      maxCards: 60,
      maxCopiesPerCard: 4,
      cards: [],
    });
    db.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      slug: 'alpha',
      name: 'Alpha',
      priceMinor: 1200,
      category: { name: 'Singles', slug: 'singles' },
    });

    await expect(addCardToDeck('user-1', 'deck-1', 'prod-1', 5, db)).rejects.toThrow('at most 4 copies');
  });
});
