import type { PrismaClient, Prisma } from '@prisma/client';

export type CanonicalCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  imageLabel: string;
};

export type CanonicalSupplier = {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  preferred: boolean;
  internalNotes: string | null;
};

export const canonicalCategories: CanonicalCategory[] = [
  {
    id: 'cat-pokemon-tcg',
    name: 'Pokemon TCG',
    slug: 'pokemon-tcg',
    description: 'Pokemon Trading Card Game products and releases.',
    sortOrder: 1,
    imageLabel: 'Pokemon TCG',
  },
  {
    id: 'cat-magic-the-gathering',
    name: 'Magic: The Gathering',
    slug: 'magic-the-gathering',
    description: 'Magic: The Gathering sealed products, singles and accessories.',
    sortOrder: 2,
    imageLabel: 'Magic: The Gathering',
  },
  {
    id: 'cat-one-piece-card-game',
    name: 'One Piece Card Game',
    slug: 'one-piece-card-game',
    description: 'One Piece Card Game sealed products and releases.',
    sortOrder: 3,
    imageLabel: 'One Piece Card Game',
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Sleeves, binders, deck boxes, and protective storage for every collection.',
    sortOrder: 4,
    imageLabel: 'Accessory wall',
  },
  {
    id: 'cat-sealed',
    name: 'Sealed Product',
    slug: 'sealed-product',
    description: 'Booster boxes, bundles, and collector products ready for shelf display.',
    sortOrder: 5,
    imageLabel: 'Display case',
  },
  {
    id: 'cat-singles',
    name: 'Singles',
    slug: 'singles',
    description: 'Individual cards for deck construction, upgrades, and collectability.',
    sortOrder: 6,
    imageLabel: 'Playset tray',
  },
  {
    id: 'cat-supplies',
    name: 'Supplies',
    slug: 'supplies',
    description: 'Consumable hobby supplies and collector essentials.',
    sortOrder: 7,
    imageLabel: 'Supplies shelf',
  },
  {
    id: 'cat-events',
    name: 'Events',
    slug: 'events',
    description: 'Tournament entries, league nights, and organised play products.',
    sortOrder: 8,
    imageLabel: 'Event pass',
  },
];

export const canonicalSuppliers: CanonicalSupplier[] = [
  {
    id: 'sup-card-citadel',
    name: 'Card Citadel',
    slug: 'card-citadel',
    contactName: 'Mia Carter',
    email: 'hello@cardcitadel.example',
    phone: '+44 20 5550 8100',
    website: 'https://cardcitadel.example',
    addressLine1: '12 Spire Road',
    addressLine2: null,
    city: 'Leeds',
    region: 'West Yorkshire',
    postalCode: 'LS1 2AB',
    country: 'GB',
    preferred: true,
    internalNotes: 'Primary sealed product distributor.',
  },
  {
    id: 'sup-gamegrid',
    name: 'GameGrid Wholesale',
    slug: 'gamegrid-wholesale',
    contactName: 'Jonas Reed',
    email: 'sales@gamegrid.example',
    phone: '+44 20 5550 8200',
    website: 'https://gamegrid.example',
    addressLine1: '44 Warehouse Lane',
    addressLine2: 'Unit 8',
    city: 'Manchester',
    region: null,
    postalCode: 'M1 1AA',
    country: 'GB',
    preferred: false,
    internalNotes: 'Accessories and event support partner.',
  },
];

type SeedDatabase = Pick<PrismaClient, '$connect' | '$disconnect' | 'category' | 'supplier'> | Prisma.TransactionClient;

export async function seedCanonicalLookupData(
  db: SeedDatabase,
  log: (message: string) => void = () => undefined,
): Promise<void> {
  log('Seeding categories...');
  for (const category of canonicalCategories) {
    await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        imageLabel: category.imageLabel,
      },
    });
  }

  log('Seeding suppliers...');
  for (const supplier of canonicalSuppliers) {
    await db.supplier.upsert({
      where: { slug: supplier.slug },
      create: supplier,
      update: {
        name: supplier.name,
        contactName: supplier.contactName,
        email: supplier.email,
        phone: supplier.phone,
        website: supplier.website,
        addressLine1: supplier.addressLine1,
        addressLine2: supplier.addressLine2,
        city: supplier.city,
        region: supplier.region,
        postalCode: supplier.postalCode,
        country: supplier.country,
        preferred: supplier.preferred,
        internalNotes: supplier.internalNotes,
        active: true,
      },
    });
  }

  log('Seeding products...');
  log('Seeding users...');
}

export async function verifyCanonicalLookupData(db: Pick<PrismaClient, 'category' | 'supplier'> | Prisma.TransactionClient): Promise<void> {
  const [categories, suppliers] = await Promise.all([
    db.category.findMany({
      where: { slug: { in: canonicalCategories.map((category) => category.slug) } },
      select: { slug: true },
    }),
    db.supplier.findMany({
      where: { slug: { in: canonicalSuppliers.map((supplier) => supplier.slug) } },
      select: { slug: true },
    }),
  ]);

  const categorySlugs = new Set(categories.map((category) => category.slug));
  const supplierSlugs = new Set(suppliers.map((supplier) => supplier.slug));
  const missingCategories = canonicalCategories.filter((category) => !categorySlugs.has(category.slug)).map((category) => category.slug);
  const missingSuppliers = canonicalSuppliers.filter((supplier) => !supplierSlugs.has(supplier.slug)).map((supplier) => supplier.slug);

  if (missingCategories.length || missingSuppliers.length) {
    throw new Error(
      [
        'Canonical lookup verification failed.',
        missingCategories.length ? `Missing categories: ${missingCategories.join(', ')}` : null,
        missingSuppliers.length ? `Missing suppliers: ${missingSuppliers.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

export async function assertProductImportLookupData(
  db: Pick<PrismaClient, 'category' | 'supplier'> | Prisma.TransactionClient,
  input: { category: string; supplierSlug?: string },
): Promise<void> {
  const category = await db.category.findUnique({
    where: { slug: input.category },
    select: { slug: true },
  });

  if (!category) {
    throw new Error(
      `Product import prerequisite missing: category "${input.category}" does not exist. Run npm run db:seed and ensure canonical category slugs match product.json.`,
    );
  }

  if (!input.supplierSlug) {
    return;
  }

  const supplier = await db.supplier.findUnique({
    where: { slug: input.supplierSlug },
    select: { slug: true },
  });

  if (!supplier) {
    throw new Error(
      `Product import prerequisite missing: supplier "${input.supplierSlug}" does not exist. Run npm run db:seed or correct supplierSlug in product.json.`,
    );
  }
}
