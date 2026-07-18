import { describe, expect, it, vi } from 'vitest';
import {
  assertProductImportLookupData,
  canonicalBrands,
  canonicalCategories,
  canonicalGames,
  canonicalProductLanguages,
  canonicalProductSets,
  canonicalProductTypes,
  canonicalSuppliers,
  seedCanonicalLookupData,
  verifyCanonicalLookupData,
} from './canonical-seed';

function createSlugDelegate(initialValues: string[] = []) {
  const values = new Set(initialValues);
  return {
    upsert: vi.fn(async ({ where }: { where: { slug?: string; code?: string; gameId_slug?: { slug: string } } }) => {
      values.add(where.slug ?? where.code ?? where.gameId_slug?.slug ?? '');
    }),
    findMany: vi.fn(async () => Array.from(values).map((slug) => ({ slug, code: slug }))),
    findUnique: vi.fn(async ({ where }: { where: { slug?: string; code?: string } }) => {
      const value = where.slug ?? where.code ?? '';
      return values.has(value) ? { slug: value, code: value } : null;
    }),
  };
}

function createMockLookupDb(
  options: {
    categories?: string[];
    suppliers?: string[];
    games?: string[];
    brands?: string[];
    productTypes?: string[];
    languages?: string[];
    sets?: string[];
  } = {},
) {
  const categorySlugs = new Set(options.categories ?? canonicalCategories.map((category) => category.slug));
  const supplierSlugs = new Set(options.suppliers ?? canonicalSuppliers.map((supplier) => supplier.slug));

  return {
    category: {
      upsert: vi.fn(async ({ where }: { where: { slug: string } }) => {
        categorySlugs.add(where.slug);
      }),
      findMany: vi.fn(async () => Array.from(categorySlugs).map((slug) => ({ slug }))),
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) =>
        categorySlugs.has(where.slug) ? { slug: where.slug } : null,
      ),
    },
    supplier: {
      upsert: vi.fn(async ({ where }: { where: { slug: string } }) => {
        supplierSlugs.add(where.slug);
      }),
      findMany: vi.fn(async () => Array.from(supplierSlugs).map((slug) => ({ slug }))),
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) =>
        supplierSlugs.has(where.slug) ? { slug: where.slug } : null,
      ),
    },
    game: createSlugDelegate(options.games ?? canonicalGames.map((game) => game.slug)),
    brand: createSlugDelegate(options.brands ?? canonicalBrands.map((brand) => brand.slug)),
    productType: createSlugDelegate(options.productTypes ?? canonicalProductTypes.map((productType) => productType.slug)),
    productLanguage: createSlugDelegate(options.languages ?? canonicalProductLanguages.map((language) => language.code)),
    productSet: createSlugDelegate(options.sets ?? canonicalProductSets.map((set) => set.slug)),
  };
}

describe('canonical seed', () => {
  it('upserts canonical categories, suppliers and master data and exits through verification', async () => {
    const db = createMockLookupDb({ categories: [], suppliers: [], games: [], brands: [], productTypes: [], languages: [], sets: [] });
    const log = vi.fn();

    await seedCanonicalLookupData(db as never, log);
    await verifyCanonicalLookupData(db as never);

    expect(db.category.upsert).toHaveBeenCalledTimes(canonicalCategories.length);
    expect(db.supplier.upsert).toHaveBeenCalledTimes(canonicalSuppliers.length);
    expect(db.game.upsert).toHaveBeenCalledTimes(canonicalGames.length);
    expect(db.brand.upsert).toHaveBeenCalledTimes(canonicalBrands.length);
    expect(db.productType.upsert).toHaveBeenCalledTimes(canonicalProductTypes.length);
    expect(db.productLanguage.upsert).toHaveBeenCalledTimes(canonicalProductLanguages.length);
    expect(db.productSet.upsert).toHaveBeenCalledTimes(canonicalProductSets.length);
    expect(log).toHaveBeenCalledWith('Seeding categories...');
    expect(log).toHaveBeenCalledWith('Seeding suppliers...');
    expect(log).toHaveBeenCalledWith('Seeding catalogue master data...');
    expect(log).toHaveBeenCalledWith('Seeding products...');
    expect(log).toHaveBeenCalledWith('Seeding users...');
  });

  it('fails verification when a canonical category is missing', async () => {
    const db = createMockLookupDb({
      categories: canonicalCategories.filter((category) => category.slug !== 'sealed-product').map((category) => category.slug),
    });

    await expect(verifyCanonicalLookupData(db as never)).rejects.toThrow('Missing categories: sealed-product');
  });

  it('fails verification when canonical catalogue master data is missing', async () => {
    const db = createMockLookupDb({
      games: canonicalGames.filter((game) => game.slug !== 'pokemon-tcg').map((game) => game.slug),
    });

    await expect(verifyCanonicalLookupData(db as never)).rejects.toThrow('Missing games: pokemon-tcg');
  });

  it('rejects imports when lookup category slugs do not match seeded data', async () => {
    const db = createMockLookupDb({ categories: ['pokemon-tcg'], suppliers: ['card-citadel'] });

    await expect(
      assertProductImportLookupData(db as never, {
        category: 'sealed-product',
        supplierSlug: 'card-citadel',
      }),
    ).rejects.toThrow('category "sealed-product" does not exist');
  });

  it('accepts import prerequisites when category and supplier exist', async () => {
    const db = createMockLookupDb({ categories: ['sealed-product'], suppliers: ['card-citadel'] });

    await expect(
      assertProductImportLookupData(db as never, {
        category: 'sealed-product',
        supplierSlug: 'card-citadel',
      }),
    ).resolves.toBeUndefined();
  });
});
