import type { Prisma } from '@prisma/client';
import { slugify } from '@tcg-hobby/utils';
import { prisma } from './client';

export type CatalogueMasterDataKind = 'games' | 'brands' | 'product-types' | 'languages' | 'sets' | 'categories';

export type CatalogueMasterDataRecord = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  active: boolean;
  sortOrder: number;
  group: string | null;
  website: string | null;
  gameId: string | null;
  gameName: string | null;
  productCount: number;
};

export type CatalogueMasterDataOptions = {
  games: CatalogueMasterDataRecord[];
  brands: CatalogueMasterDataRecord[];
  productTypes: CatalogueMasterDataRecord[];
  languages: CatalogueMasterDataRecord[];
  sets: CatalogueMasterDataRecord[];
  categories: CatalogueMasterDataRecord[];
};

export type CatalogueMasterDataOverview = {
  sections: Array<{
    kind: CatalogueMasterDataKind;
    title: string;
    description: string;
    href: string;
    totalCount: number;
    activeCount: number;
    inactiveCount: number;
  }>;
};

export type CatalogueMasterDataInput = {
  name: string;
  slug?: string;
  code?: string;
  active?: boolean;
  sortOrder?: number;
  group?: string | null;
  website?: string | null;
  gameId?: string | null;
};

type MasterDataReadDatabase = {
  game: Pick<typeof prisma.game, 'findMany'>;
  brand: Pick<typeof prisma.brand, 'findMany'>;
  productType: Pick<typeof prisma.productType, 'findMany'>;
  productLanguage: Pick<typeof prisma.productLanguage, 'findMany'>;
  productSet: Pick<typeof prisma.productSet, 'findMany'>;
  category: Pick<typeof prisma.category, 'findMany'>;
};

type MasterDataDatabase = MasterDataReadDatabase & {
  game: Pick<typeof prisma.game, 'findMany' | 'findUnique' | 'findFirst' | 'create' | 'update'>;
  brand: Pick<typeof prisma.brand, 'findMany' | 'findUnique' | 'create' | 'update'>;
  productType: Pick<typeof prisma.productType, 'findMany' | 'findUnique' | 'create' | 'update'>;
  productLanguage: Pick<typeof prisma.productLanguage, 'findMany' | 'findUnique' | 'create' | 'update'>;
  productSet: Pick<typeof prisma.productSet, 'findMany' | 'findUnique' | 'findFirst' | 'create' | 'update'>;
};

const masterDataLabels: Record<CatalogueMasterDataKind, { title: string; description: string; href: string }> = {
  games: {
    title: 'Games',
    description: 'Trading card games used by products, sets, filters and reporting.',
    href: '/admin/catalogue/games',
  },
  brands: {
    title: 'Brands',
    description: 'Publishers, manufacturers and accessory brands linked to products.',
    href: '/admin/catalogue/brands',
  },
  'product-types': {
    title: 'Product Types',
    description: 'Controlled retail formats such as booster boxes, tins and sleeves.',
    href: '/admin/catalogue/product-types',
  },
  languages: {
    title: 'Languages',
    description: 'Product language codes available for catalogue records.',
    href: '/admin/catalogue/languages',
  },
  sets: {
    title: 'Sets',
    description: 'Game-specific sets and expansions for sealed products and singles.',
    href: '/admin/catalogue/sets',
  },
  categories: {
    title: 'Categories',
    description: 'Customer-facing catalogue categories used by storefront navigation.',
    href: '/admin/catalogue/categories',
  },
};

function normalizeDuplicateKey(value: string): string {
  return slugify(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).toLowerCase();
}

function mapRecord(
  row: {
    id: string;
    name: string;
    slug?: string;
    code?: string;
    active?: boolean;
    sortOrder: number;
    group?: string | null;
    website?: string | null;
    gameId?: string | null;
    game?: { name: string } | null;
    _count?: { products: number };
  },
  fallbackActive = true,
): CatalogueMasterDataRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? row.code ?? row.id,
    code: row.code ?? null,
    active: row.active ?? fallbackActive,
    sortOrder: row.sortOrder,
    group: row.group ?? null,
    website: row.website ?? null,
    gameId: row.gameId ?? null,
    gameName: row.game?.name ?? null,
    productCount: row._count?.products ?? 0,
  };
}

function mapCategoryRecord(row: { id: string; name: string; slug: string; sortOrder: number; _count: { products: number } }): CatalogueMasterDataRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    code: null,
    active: true,
    sortOrder: row.sortOrder,
    group: null,
    website: null,
    gameId: null,
    gameName: null,
    productCount: row._count.products,
  };
}

export async function getCatalogueMasterDataOptions(db: MasterDataReadDatabase = prisma): Promise<CatalogueMasterDataOptions> {
  const [games, brands, productTypes, languages, sets, categories] = await Promise.all([
    db.game.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } }),
    db.brand.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } }),
    db.productType.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } }),
    db.productLanguage.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } }),
    db.productSet.findMany({ orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }], include: { game: true, _count: { select: { products: true } } } }),
    db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } }),
  ]);

  return {
    games: games.map((game) => mapRecord(game)),
    brands: brands.map((brand) => mapRecord(brand)),
    productTypes: productTypes.map((productType) => mapRecord(productType)),
    languages: languages.map((language) => mapRecord({ ...language, slug: language.code })),
    sets: sets.map((set) => mapRecord(set)),
    categories: categories.map(mapCategoryRecord),
  };
}

export async function getCatalogueMasterDataOverview(db: MasterDataReadDatabase = prisma): Promise<CatalogueMasterDataOverview> {
  const options = await getCatalogueMasterDataOptions(db);
  const sections = (Object.keys(masterDataLabels) as CatalogueMasterDataKind[]).map((kind) => {
    const records =
      kind === 'games'
        ? options.games
        : kind === 'brands'
          ? options.brands
          : kind === 'product-types'
            ? options.productTypes
            : kind === 'languages'
              ? options.languages
              : kind === 'sets'
                ? options.sets
                : options.categories;
    const label = masterDataLabels[kind];

    return {
      kind,
      title: label.title,
      description: label.description,
      href: label.href,
      totalCount: records.length,
      activeCount: records.filter((record) => record.active).length,
      inactiveCount: records.filter((record) => !record.active).length,
    };
  });

  return { sections };
}

export async function getCatalogueMasterDataRecords(kind: CatalogueMasterDataKind, db: MasterDataReadDatabase = prisma): Promise<CatalogueMasterDataRecord[]> {
  const options = await getCatalogueMasterDataOptions(db);
  switch (kind) {
    case 'games':
      return options.games;
    case 'brands':
      return options.brands;
    case 'product-types':
      return options.productTypes;
    case 'languages':
      return options.languages;
    case 'sets':
      return options.sets;
    case 'categories':
      return options.categories;
    default:
      return [];
  }
}

async function assertNoDuplicate(kind: Exclude<CatalogueMasterDataKind, 'categories'>, input: CatalogueMasterDataInput, db: MasterDataDatabase, excludeId?: string): Promise<void> {
  const slug = input.slug || slugify(input.name);
  const duplicateWhere =
    kind === 'languages'
      ? { OR: [{ code: input.code ?? slug }, { name: { equals: input.name, mode: 'insensitive' as const } }] }
      : kind === 'sets'
        ? { gameId: input.gameId ?? '', OR: [{ slug }, { name: { equals: input.name, mode: 'insensitive' as const } }] }
        : { OR: [{ slug }, { name: { equals: input.name, mode: 'insensitive' as const } }] };

  const normalizedName = normalizeDuplicateKey(input.name);
  const records = await getCatalogueMasterDataRecords(kind, db);
  if (
    records.some(
      (record) =>
        record.id !== excludeId &&
        (record.slug === slug ||
          record.code === input.code ||
          normalizeDuplicateKey(record.name) === normalizedName) &&
        (kind !== 'sets' || record.gameId === input.gameId),
    )
  ) {
    throw new Error(`${masterDataLabels[kind].title} already contains ${input.name}.`);
  }

  if (kind === 'sets' && input.gameId) {
    await db.productSet.findFirst({ where: { ...duplicateWhere, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
  }
}

export async function createCatalogueMasterDataRecord(
  kind: Exclude<CatalogueMasterDataKind, 'categories'>,
  input: CatalogueMasterDataInput,
  db: MasterDataDatabase = prisma,
): Promise<CatalogueMasterDataRecord> {
  if (!input.name.trim()) throw new Error('Name is required.');
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new Error('Slug or code is required.');
  await assertNoDuplicate(kind, input, db);

  if (kind === 'games') {
    const row = await db.game.create({ data: { name: input.name, slug, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord(row);
  }
  if (kind === 'brands') {
    const row = await db.brand.create({ data: { name: input.name, slug, website: input.website ?? null, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord(row);
  }
  if (kind === 'product-types') {
    const row = await db.productType.create({ data: { name: input.name, slug, group: input.group ?? null, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord(row);
  }
  if (kind === 'languages') {
    const code = input.code || slug;
    const row = await db.productLanguage.create({ data: { name: input.name, code, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord({ ...row, slug: row.code });
  }

  if (!input.gameId) throw new Error('A set must be linked to a game.');
  const row = await db.productSet.create({
    data: { name: input.name, slug, gameId: input.gameId, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 },
    include: { game: true, _count: { select: { products: true } } },
  });
  return mapRecord(row);
}

export async function updateCatalogueMasterDataRecord(
  kind: Exclude<CatalogueMasterDataKind, 'categories'>,
  id: string,
  input: CatalogueMasterDataInput,
  db: MasterDataDatabase = prisma,
): Promise<CatalogueMasterDataRecord> {
  if (!input.name.trim()) throw new Error('Name is required.');
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new Error('Slug or code is required.');
  await assertNoDuplicate(kind, input, db, id);

  if (kind === 'games') {
    const row = await db.game.update({ where: { id }, data: { name: input.name, slug, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord(row);
  }
  if (kind === 'brands') {
    const row = await db.brand.update({ where: { id }, data: { name: input.name, slug, website: input.website ?? null, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord(row);
  }
  if (kind === 'product-types') {
    const row = await db.productType.update({ where: { id }, data: { name: input.name, slug, group: input.group ?? null, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord(row);
  }
  if (kind === 'languages') {
    const code = input.code || slug;
    const row = await db.productLanguage.update({ where: { id }, data: { name: input.name, code, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 }, include: { _count: { select: { products: true } } } });
    return mapRecord({ ...row, slug: row.code });
  }

  if (!input.gameId) throw new Error('A set must be linked to a game.');
  const row = await db.productSet.update({
    where: { id },
    data: { name: input.name, slug, gameId: input.gameId, active: input.active ?? true, sortOrder: input.sortOrder ?? 0 },
    include: { game: true, _count: { select: { products: true } } },
  });
  return mapRecord(row);
}

export async function setCatalogueMasterDataActive(
  kind: Exclude<CatalogueMasterDataKind, 'categories'>,
  id: string,
  active: boolean,
  db: MasterDataDatabase = prisma,
): Promise<void> {
  if (kind === 'games') await db.game.update({ where: { id }, data: { active } });
  if (kind === 'brands') await db.brand.update({ where: { id }, data: { active } });
  if (kind === 'product-types') await db.productType.update({ where: { id }, data: { active } });
  if (kind === 'languages') await db.productLanguage.update({ where: { id }, data: { active } });
  if (kind === 'sets') await db.productSet.update({ where: { id }, data: { active } });
}

export async function resolveProductMasterDataInput(
  input: {
    gameId?: string | null;
    brandId?: string | null;
    productTypeId?: string | null;
    languageId?: string | null;
    setId?: string | null;
  },
  db: MasterDataDatabase = prisma,
): Promise<{
  game: CatalogueMasterDataRecord | null;
  brand: CatalogueMasterDataRecord | null;
  productType: CatalogueMasterDataRecord | null;
  language: CatalogueMasterDataRecord | null;
  set: CatalogueMasterDataRecord | null;
}> {
  const [game, brand, productType, language, set] = await Promise.all([
    input.gameId ? db.game.findUnique({ where: { id: input.gameId }, include: { _count: { select: { products: true } } } }) : null,
    input.brandId ? db.brand.findUnique({ where: { id: input.brandId }, include: { _count: { select: { products: true } } } }) : null,
    input.productTypeId ? db.productType.findUnique({ where: { id: input.productTypeId }, include: { _count: { select: { products: true } } } }) : null,
    input.languageId ? db.productLanguage.findUnique({ where: { id: input.languageId }, include: { _count: { select: { products: true } } } }) : null,
    input.setId ? db.productSet.findUnique({ where: { id: input.setId }, include: { game: true, _count: { select: { products: true } } } }) : null,
  ]);

  if (input.gameId && !game) throw new Error('Selected game does not exist.');
  if (input.brandId && !brand) throw new Error('Selected brand does not exist.');
  if (input.productTypeId && !productType) throw new Error('Selected product type does not exist.');
  if (input.languageId && !language) throw new Error('Selected language does not exist.');
  if (input.setId && !set) throw new Error('Selected set does not exist.');
  if (set && game && set.gameId !== game.id) throw new Error('Selected set does not belong to the selected game.');

  return {
    game: game ? mapRecord(game) : null,
    brand: brand ? mapRecord(brand) : null,
    productType: productType ? mapRecord(productType) : null,
    language: language ? mapRecord({ ...language, slug: language.code }) : null,
    set: set ? mapRecord(set) : null,
  };
}

export async function resolveMasterDataByImportValues(
  values: {
    game?: string;
    brand?: string;
    productType?: string;
    language?: string;
    set?: string;
  },
  db: MasterDataDatabase = prisma,
): Promise<{
  game: CatalogueMasterDataRecord | null;
  brand: CatalogueMasterDataRecord | null;
  productType: CatalogueMasterDataRecord | null;
  language: CatalogueMasterDataRecord | null;
  set: CatalogueMasterDataRecord | null;
  errors: string[];
}> {
  const options = await getCatalogueMasterDataOptions(db);
  const errors: string[] = [];
  const findBySlugOrName = (records: CatalogueMasterDataRecord[], value?: string) => {
    if (!value?.trim()) return null;
    const normalized = normalizeDuplicateKey(value);
    return records.find((record) => record.slug === value || record.code === value || normalizeDuplicateKey(record.name) === normalized) ?? null;
  };

  const game = findBySlugOrName(options.games, values.game);
  const brand = findBySlugOrName(options.brands, values.brand);
  const productType = findBySlugOrName(options.productTypes, values.productType);
  const language = findBySlugOrName(options.languages, values.language);
  const set = findBySlugOrName(options.sets, values.set);

  if (values.game && !game) errors.push(`Unknown Game "${values.game}". Create it in Catalogue Settings before importing.`);
  if (values.brand && !brand) errors.push(`Unknown Brand "${values.brand}". Create it in Catalogue Settings before importing.`);
  if (values.productType && !productType) errors.push(`Unknown Product Type "${values.productType}". Create it in Catalogue Settings before importing.`);
  if (values.language && !language) errors.push(`Unknown Language "${values.language}". Create it in Catalogue Settings before importing.`);
  if (values.set && !set) errors.push(`Unknown Set "${values.set}". Create it in Catalogue Settings before importing.`);
  if (game && !game.active) errors.push(`Game "${game.name}" is inactive and cannot be used for new imports.`);
  if (brand && !brand.active) errors.push(`Brand "${brand.name}" is inactive and cannot be used for new imports.`);
  if (productType && !productType.active) errors.push(`Product Type "${productType.name}" is inactive and cannot be used for new imports.`);
  if (language && !language.active) errors.push(`Language "${language.name}" is inactive and cannot be used for new imports.`);
  if (set && !set.active) errors.push(`Set "${set.name}" is inactive and cannot be used for new imports.`);
  if (set && game && set.gameId !== game.id) errors.push(`Set "${set.name}" does not belong to Game "${game.name}".`);

  return { game, brand, productType, language, set, errors };
}
