import { describe, expect, it, vi } from 'vitest';
import {
  createCatalogueMasterDataRecord,
  resolveMasterDataByImportValues,
  resolveProductMasterDataInput,
} from './catalogue-master-data';

const activeGame = { id: 'game-1', name: 'Pokemon TCG', slug: 'pokemon-tcg', active: true, sortOrder: 1, _count: { products: 0 } };
const inactiveGame = { id: 'game-2', name: 'Inactive Game', slug: 'inactive-game', active: false, sortOrder: 2, _count: { products: 0 } };
const brand = { id: 'brand-1', name: 'Pokemon TCG', slug: 'pokemon-tcg', active: true, sortOrder: 1, website: null, _count: { products: 0 } };
const productType = { id: 'type-1', name: 'Premium Collection', slug: 'premium-collection', active: true, sortOrder: 1, group: 'sealed', _count: { products: 0 } };
const language = { id: 'language-1', name: 'English', code: 'en', active: true, sortOrder: 1, _count: { products: 0 } };
const set = { id: 'set-1', name: 'Black Bolt', slug: 'black-bolt', gameId: 'game-1', active: true, sortOrder: 1, game: activeGame, _count: { products: 0 } };
const otherSet = { id: 'set-2', name: 'Magic Set', slug: 'magic-set', gameId: 'game-3', active: true, sortOrder: 2, game: activeGame, _count: { products: 0 } };

function db() {
  return {
    game: {
      findMany: vi.fn().mockResolvedValue([activeGame, inactiveGame]),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === activeGame.id ? activeGame : null)),
      findFirst: vi.fn(),
      create: vi.fn(async ({ data }: { data: { name: string; slug: string; active: boolean; sortOrder: number } }) => ({
        ...data,
        id: 'created-game',
        _count: { products: 0 },
      })),
      update: vi.fn(),
    },
    brand: {
      findMany: vi.fn().mockResolvedValue([brand]),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === brand.id ? brand : null)),
      create: vi.fn(),
      update: vi.fn(),
    },
    productType: {
      findMany: vi.fn().mockResolvedValue([productType]),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === productType.id ? productType : null)),
      create: vi.fn(),
      update: vi.fn(),
    },
    productLanguage: {
      findMany: vi.fn().mockResolvedValue([language]),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === language.id ? language : null)),
      create: vi.fn(),
      update: vi.fn(),
    },
    productSet: {
      findMany: vi.fn().mockResolvedValue([set, otherSet]),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === set.id) return set;
        if (where.id === otherSet.id) return otherSet;
        return null;
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

describe('catalogue master data', () => {
  it('resolves active import values by name, slug or code', async () => {
    const result = await resolveMasterDataByImportValues(
      { game: 'Pokemon TCG', brand: 'pokemon-tcg', productType: 'Premium Collection', language: 'en', set: 'black-bolt' },
      db() as never,
    );

    expect(result.errors).toEqual([]);
    expect(result.game?.id).toBe('game-1');
    expect(result.brand?.id).toBe('brand-1');
    expect(result.productType?.id).toBe('type-1');
    expect(result.language?.id).toBe('language-1');
    expect(result.set?.id).toBe('set-1');
  });

  it('rejects inactive and unknown import lookup values', async () => {
    const result = await resolveMasterDataByImportValues({ game: 'inactive-game', brand: 'Missing Brand' }, db() as never);

    expect(result.errors).toContain('Game "Inactive Game" is inactive and cannot be used for new imports.');
    expect(result.errors).toContain('Unknown Brand "Missing Brand". Create it in Catalogue Settings before importing.');
  });

  it('rejects a product set that does not belong to the selected game', async () => {
    const result = await resolveMasterDataByImportValues({ game: 'pokemon-tcg', set: 'magic-set' }, db() as never);

    expect(result.errors).toContain('Set "Magic Set" does not belong to Game "Pokemon TCG".');
  });

  it('validates dependent set selection for admin product forms', async () => {
    await expect(
      resolveProductMasterDataInput({ gameId: activeGame.id, productTypeId: productType.id, languageId: language.id, setId: otherSet.id }, db() as never),
    ).rejects.toThrow('Selected set does not belong to the selected game.');
  });

  it('prevents duplicate records when creating master data', async () => {
    await expect(
      createCatalogueMasterDataRecord('games', { name: 'Pokemon TCG', slug: 'pokemon-tcg', sortOrder: 1, active: true }, db() as never),
    ).rejects.toThrow('Games already contains Pokemon TCG.');
  });
});
