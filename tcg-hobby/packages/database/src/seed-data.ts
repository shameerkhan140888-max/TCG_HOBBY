import { hashPassword } from '@tcg-hobby/auth';
import type {
  CatalogueCategory,
  CatalogueProduct,
  CatalogueProductDetail,
  Money,
  NotificationPreference,
  NotificationType,
  ProductReleaseStatus,
} from '@tcg-hobby/types';

type CategorySeed = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  imageLabel: string;
};

type SupplierSeed = {
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

type UserSeed = {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF';
  passwordHash: string;
};

type AddressSeed = {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
};

type ProductSeed = {
  id: string;
  importId?: string | null;
  sku: string;
  slug: string;
  name: string;
  game: string;
  setName: string | null;
  description: string;
  longDescription: string;
  condition: 'MINT' | 'NEAR_MINT' | 'LIGHTLY_PLAYED' | 'MODERATELY_PLAYED' | 'HEAVILY_PLAYED' | 'DAMAGED' | 'SEALED';
  priceMinor: number;
  vatRate?: number;
  currency: Money['currency'];
  featured: boolean;
  homepagePriority?: number | null;
  heroFeatured?: boolean;
  freeUkStandardShipping?: boolean;
  shippingPromotionProductOnly?: boolean;
  lifecycleState?: string;
  published: boolean;
  searchText: string;
  imageLabel: string;
  categorySlug: string;
  supplierSlug: string;
  releaseStatus?: ProductReleaseStatus;
  releaseDate?: string | null;
  expectedDispatchAt?: string | null;
  expectedArrivalAt?: string | null;
  allocationLimit?: number | null;
  customerPurchaseLimit?: number | null;
  supplierAllocation?: number | null;
  lowAllocationThreshold?: number | null;
  availabilityMessage?: string | null;
  preorderBadgeLabel?: string | null;
  comingSoonBadgeLabel?: string | null;
  importSourceType?: string | null;
  importSourceReference?: string | null;
  importValidationWarnings?: string | null;
};

export const MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG = 'pokemon-tcg-mega-greninja-ex-premium-collection';

type ReleaseSeed = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  game: string;
  categorySlug: string;
  releaseDate: string;
  expectedDispatchAt: string | null;
  expectedArrivalAt: string | null;
  announcementText: string | null;
  releaseNotes: string | null;
  visible: boolean;
  featuredOnHomepage: boolean;
};

type ReleaseProductSeed = {
  id: string;
  releaseSlug: string;
  productSlug: string;
  releaseStatus: ProductReleaseStatus;
  releaseDate: string | null;
  expectedDispatchAt: string | null;
  expectedArrivalAt: string | null;
  allocationLimit: number | null;
  customerPurchaseLimit: number | null;
  supplierAllocation: number | null;
  lowAllocationThreshold: number | null;
  allocatedQuantity: number;
  availabilityMessage: string | null;
  preorderBadgeLabel: string | null;
  comingSoonBadgeLabel: string | null;
};

type NotificationSubscriptionSeed = {
  id: string;
  userId: string;
  productSlug: string;
  preference: NotificationPreference;
};

type NotificationCenterPreferenceSeed = {
  id: string;
  userId: string;
  notificationType: NotificationType;
  subjectType: 'PRODUCT' | 'RELEASE' | 'COLLECTION_ITEM' | null;
  subjectLabel: string | null;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
};

type PricingRuleSeed = {
  id: string;
  name: string;
  ruleType: 'MANUAL' | 'COST_PLUS_PERCENT' | 'FIXED_MARGIN' | 'SUPPLIER_COST' | 'PROMOTIONAL' | 'FUTURE_MARKET_FEED';
  ruleScope: 'GLOBAL' | 'PRODUCT' | 'CATEGORY' | 'SUPPLIER';
  productSlug: string | null;
  categorySlug: string | null;
  supplierSlug: string | null;
  currency: Money['currency'];
  priority: number;
  active: boolean;
  config: Record<string, number | string | boolean>;
};

type ProductPricingSeed = {
  id: string;
  productSlug: string;
  pricingRuleId: string | null;
  costMinor: number;
  retailMinor: number;
  buyMinor: number;
  marginMinor: number;
  markupPercent: number;
  profitMinor: number;
  minimumMarginPercent: number;
  maximumDiscountPercent: number;
  priceSource: string;
  priceStatus: 'ACTIVE' | 'MANUAL_OVERRIDE' | 'DISABLED' | 'FUTURE';
  manualOverride: boolean;
};

type BuylistSeed = {
  id: string;
  buylistNumber: string;
  userId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  currency: Money['currency'];
  estimatedPayoutMinor: number;
  offeredPayoutMinor: number;
  customerNotes: string | null;
  staffNotes: string | null;
  paymentReference: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
};

type BuylistItemSeed = {
  id: string;
  buylistId: string;
  productSlug: string;
  quantity: number;
  estimatedBuyMinor: number;
  offeredBuyMinor: number;
  notes: string | null;
};

type InventorySeed = {
  id: string;
  productSlug: string;
  stockOnHand: number;
  reservedStock: number;
  reorderPoint: number;
  locationCode: string;
};

type CartSeed = {
  id: string;
  userId: string;
  status: 'ACTIVE';
  currency: Money['currency'];
};

type CartItemSeed = {
  id: string;
  cartId: string;
  productSlug: string;
  quantity: number;
  unitPriceMinor: number;
  productName: string;
  productSlugSnapshot: string;
};

type OrderSeed = {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PAID';
  paymentStatus: 'REQUIRES_PAYMENT' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
  fulfilmentStatus: 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';
  shippingMethodCode: 'UK_STANDARD' | 'UK_EXPRESS' | 'WORLDWIDE_STANDARD';
  shippingMethodName: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: Money['currency'];
  shippingFullName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingAddressId: string | null;
};

type OrderItemSeed = {
  id: string;
  orderId: string;
  productSlug: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  productName: string;
  productSlugSnapshot: string;
};

type SupplierProductSeed = {
  id: string;
  supplierSlug: string;
  productSlug: string;
  supplierSku: string;
  costMinor: number;
  currency: Money['currency'];
  leadTimeDays: number;
};

type ProductImageSeed = {
  id: string;
  productSlug: string;
  url: string;
  altText: string;
  imageType: string;
  sortOrder: number;
  isPrimary: boolean;
};

type WishlistSeed = {
  id: string;
  userId: string;
};

type WishlistItemSeed = {
  id: string;
  wishlistId: string;
  productSlug: string;
};

type CollectionSeed = {
  id: string;
  userId: string;
};

type CollectionItemSeed = {
  id: string;
  collectionId: string;
  productSlug: string;
  ownedQuantity: number;
  printVariant: 'REGULAR' | 'REVERSE_HOLO' | 'HOLO' | 'PROMO' | 'FIRST_EDITION' | 'FOIL';
  condition: 'MINT' | 'NEAR_MINT' | 'LIGHTLY_PLAYED' | 'MODERATELY_PLAYED' | 'HEAVILY_PLAYED' | 'DAMAGED' | 'SEALED';
  foil: boolean;
  language: string;
  notes: string | null;
  dateAcquired: string | null;
  purchasePriceMinor: number | null;
};

type DeckSeed = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  game: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  notes: string | null;
  imageLabel: string;
  maxCards: number;
  maxCopiesPerCard: number;
};

type DeckCardSeed = {
  id: string;
  deckId: string;
  productSlug: string;
  quantity: number;
};

type MarketSnapshotSeed = {
  id: string;
  productSlug: string;
  currentEstimateMinor: number;
  yesterdayMinor: number;
  sevenDayMinor: number;
  thirtyDayMinor: number;
  trend: 'UP' | 'DOWN' | 'FLAT' | 'VOLATILE';
  confidenceScore: number;
  lastUpdatedAt: string;
  source: string;
  history: Array<{
    label: string;
    valueMinor: number;
    recordedAt: string;
  }>;
};

type WatchlistItemSeed = {
  id: string;
  userId: string;
  subjectType: 'PRODUCT' | 'RELEASE' | 'COLLECTION_ITEM';
  subjectKey: string;
  productSlug?: string | null;
  releaseSlug?: string | null;
  collectionItemId?: string | null;
  notificationType: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  note: string | null;
};

type CollectionInsightSnapshotSeed = {
  id: string;
  userId: string;
  collectionId: string;
  estimatedValueMinor: number;
  previousValueMinor: number;
  sevenDayValueMinor: number;
  thirtyDayValueMinor: number;
  collectionHealthScore: number;
  cardsOwned: number;
  setsOwned: number;
  favouriteGame: string;
  wishlistOverlapCount: number;
  deckCompletionPercent: number;
  recentGrowthMinor: number;
  heatMap: Record<string, number>;
  recentActivity: Array<{ label: string; value: string }>;
  lastUpdatedAt: string;
};

export const seedCategories: CategorySeed[] = [
  {
    id: 'cat-sealed',
    name: 'Sealed Product',
    slug: 'sealed-product',
    description: 'Booster boxes, bundles, and collector products ready for shelf display.',
    sortOrder: 1,
    imageLabel: 'Display case',
  },
  {
    id: 'cat-singles',
    name: 'Singles',
    slug: 'singles',
    description: 'Individual cards for deck construction, upgrades, and collectability.',
    sortOrder: 2,
    imageLabel: 'Playset tray',
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Sleeves, binders, deck boxes, and protective storage for every collection.',
    sortOrder: 3,
    imageLabel: 'Accessory wall',
  },
  {
    id: 'cat-events',
    name: 'Events',
    slug: 'events',
    description: 'Tournament entries, league nights, and organised play products.',
    sortOrder: 4,
    imageLabel: 'Event pass',
  },
];

export const seedSuppliers: SupplierSeed[] = [
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

export const seedUsers: UserSeed[] = [
  {
    id: 'user-customer-sam',
    email: 'sam.customer@tcghobby.test',
    name: 'Sam Collector',
    role: 'CUSTOMER',
    passwordHash: hashPassword('SamCollector123!'),
  },
  {
    id: 'user-staff-ops',
    email: 'ops@tcghobby.test',
    name: 'Operations Desk',
    role: 'STAFF',
    passwordHash: hashPassword('OpsDesk123!'),
  },
];

export const seedAddresses: AddressSeed[] = [
  {
    id: 'addr-sam-home',
    userId: 'user-customer-sam',
    fullName: 'Sam Collector',
    email: 'sam.customer@tcghobby.test',
    line1: '14 Aurora Street',
    line2: null,
    city: 'Bristol',
    region: null,
    postalCode: 'BS1 4TR',
    country: 'GB',
  },
  {
    id: 'addr-order-1001',
    userId: 'user-customer-sam',
    fullName: 'Sam Collector',
    email: 'sam.customer@tcghobby.test',
    line1: '14 Aurora Street',
    line2: null,
    city: 'Bristol',
    region: null,
    postalCode: 'BS1 4TR',
    country: 'GB',
  },
];

const seededProducts: ProductSeed[] = [
  {
    id: 'prod-mega-greninja-ex-premium-collection',
    importId: 'owner-supplied-pokemon-mega-greninja-ex-premium-collection',
    sku: 'PKM-MGREN-PC-001',
    slug: MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG,
    name: 'Pokémon TCG: Mega Greninja ex Premium Collection',
    game: 'Pokémon TCG',
    setName: 'Premium Collection',
    description:
      'Take Mega Greninja ex into battle with an exclusive promotional card, an oversized lenticular card, a reusable tech sticker and eight Pokémon TCG booster packs.',
    longDescription:
      'Mega Greninja ex flips the battle upside down in this premium Pokémon TCG collection.\n\nTake Mega Greninja ex into battle with an exclusive promotional card, an oversized lenticular card, a reusable tech sticker and eight Pokémon TCG booster packs.\n\nThe collection includes Mega Greninja ex in both playable and oversized display formats, making it a strong choice for collectors, players and Mega Greninja fans looking for a premium Pokémon TCG release.',
    condition: 'SEALED',
    priceMinor: 4999,
    vatRate: 20,
    currency: 'GBP',
    featured: true,
    homepagePriority: 1,
    heroFeatured: true,
    freeUkStandardShipping: true,
    shippingPromotionProductOnly: true,
    lifecycleState: 'PUBLISHED',
    published: true,
    searchText:
      'pokemon tcg mega greninja ex premium collection promo card oversized lenticular tech sticker eight booster packs free uk standard delivery limit one household',
    imageLabel: 'Mega Greninja ex collection',
    categorySlug: 'sealed-product',
    supplierSlug: 'card-citadel',
    customerPurchaseLimit: 1,
    availabilityMessage: 'Free UK Standard Delivery. Limited to one per household.',
    importSourceType: 'OWNER_SUPPLIED',
    importSourceReference: 'Business-owner supplied media and verified packaging contents.',
  },
  {
    id: 'prod-arcane-booster-box',
    sku: 'SEALED-ARC-001',
    slug: 'arcane-booster-box',
    name: 'Arcane Booster Box',
    game: 'Magic: The Gathering',
    setName: 'Arcane Horizons',
    description: 'A premium sealed box with chase mythics and strong release-week demand.',
    longDescription:
      'Arcane Booster Box is the centrepiece of the sealed product lineup, with premium presentation and enough depth for draft weekends, collector pulls, and retail display.', 
    condition: 'SEALED',
    priceMinor: 11999,
    currency: 'GBP',
    featured: true,
    published: true,
    searchText: 'arcane booster box magic the gathering sealed product arcane horizons premium collector draft',
    imageLabel: 'Booster box',
    categorySlug: 'sealed-product',
    supplierSlug: 'card-citadel',
  },
  {
    id: 'prod-stellar-crown-etb',
    sku: 'SEALED-PKM-002',
    slug: 'stellar-crown-elite-trainer-box',
    name: 'Stellar Crown Elite Trainer Box',
    game: 'Pokemon',
    setName: 'Stellar Crown',
    description: 'A highly giftable ETB with strong merchandising appeal.',
    longDescription:
      'Stellar Crown Elite Trainer Box is positioned for front-of-store visibility, with a balanced mix of storage, sleeves, and packs that suits casual players and gift buyers.',
    condition: 'SEALED',
    priceMinor: 4499,
    currency: 'GBP',
    featured: true,
    published: true,
    searchText: 'stellar crown elite trainer box pokemon sealed gift storage packs',
    imageLabel: 'Trainer box',
    categorySlug: 'sealed-product',
    supplierSlug: 'card-citadel',
  },
  {
    id: 'prod-midnight-rites-display',
    sku: 'SEALED-BOX-003',
    slug: 'midnight-rites-booster-display',
    name: 'Midnight Rites Booster Display',
    game: 'One Piece Card Game',
    setName: 'Midnight Rites',
    description: 'A display case staple with excellent release-week turnover.',
    longDescription:
      'Midnight Rites Booster Display is configured for retailers who want a strong sealed wall presence alongside steady event traffic.',
    condition: 'SEALED',
    priceMinor: 8999,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'midnight rites booster display one piece sealed display box',
    imageLabel: 'Display box',
    categorySlug: 'sealed-product',
    supplierSlug: 'gamegrid-wholesale',
  },
  {
    id: 'prod-dragon-lord-rare',
    sku: 'SING-DRG-004',
    slug: 'dragon-lord-secret-rare',
    name: 'Dragon Lord Secret Rare',
    game: 'Yu-Gi-Oh!',
    setName: 'Skyline Dominion',
    description: 'High-demand single for collectors and competitive builds.',
    longDescription:
      'Dragon Lord Secret Rare is a chase card with strong visual appeal, ideal for showcase stock and collector browsing.',
    condition: 'NEAR_MINT',
    priceMinor: 3499,
    currency: 'GBP',
    featured: true,
    published: true,
    searchText: 'dragon lord secret rare yugioh skyline dominion single collector chase',
    imageLabel: 'Secret rare',
    categorySlug: 'singles',
    supplierSlug: 'gamegrid-wholesale',
  },
  {
    id: 'prod-lightning-bolt-playset',
    sku: 'SING-MTG-005',
    slug: 'lightning-bolt-playset',
    name: 'Lightning Bolt Playset',
    game: 'Magic: The Gathering',
    setName: 'Modern Staples',
    description: 'A reliable playset for competitive red decks and trade binders.',
    longDescription:
      'Lightning Bolt Playset is a staple singles listing with predictable demand, useful for both deck building and trade counter activity.',
    condition: 'LIGHTLY_PLAYED',
    priceMinor: 2499,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'lightning bolt playset magic the gathering staple single red deck',
    imageLabel: 'Playset',
    categorySlug: 'singles',
    supplierSlug: 'card-citadel',
  },
  {
    id: 'prod-mystic-oracle-binder-page',
    sku: 'SING-CHR-006',
    slug: 'mystic-oracle-binder-page',
    name: 'Mystic Oracle Binder Page',
    game: 'Cardfight!! Vanguard',
    setName: 'Oracle of Tides',
    description: 'Clean binder-ready single for collectors and set completionists.',
    longDescription:
      'Mystic Oracle Binder Page suits browse-and-grab shoppers looking for a polished, high-quality single listing with consistent condition notes.',
    condition: 'NEAR_MINT',
    priceMinor: 1599,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'mystic oracle binder page cardfight vanguard single collector binder',
    imageLabel: 'Binder page',
    categorySlug: 'singles',
    supplierSlug: 'card-citadel',
  },
  {
    id: 'prod-dragon-shield-sleeves',
    sku: 'ACC-SLV-007',
    slug: 'matte-black-dragon-shield-sleeves',
    name: 'Matte Black Dragon Shield Sleeves',
    game: 'Accessories',
    setName: null,
    description: 'Retail-ready premium sleeves with a dark aesthetic.',
    longDescription:
      'Matte Black Dragon Shield Sleeves are a strong accessory anchor for the store, with enough stock to support upsells and bundle recommendations.',
    condition: 'SEALED',
    priceMinor: 1099,
    currency: 'GBP',
    featured: true,
    published: true,
    searchText: 'matte black dragon shield sleeves accessories premium sleeve binder deck box',
    imageLabel: 'Sleeves',
    categorySlug: 'accessories',
    supplierSlug: 'gamegrid-wholesale',
  },
  {
    id: 'prod-one-touch-case',
    sku: 'ACC-CASE-008',
    slug: 'one-touch-magnetic-case',
    name: 'One Touch Magnetic Case',
    game: 'Accessories',
    setName: null,
    description: 'A premium magnetic case for high-value single protection.',
    longDescription:
      'One Touch Magnetic Case is positioned for premium upsell moments, especially around singles, hits, and graded-card-inspired presentation.',
    condition: 'SEALED',
    priceMinor: 1299,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'one touch magnetic case accessories premium protection case',
    imageLabel: 'Magnetic case',
    categorySlug: 'accessories',
    supplierSlug: 'gamegrid-wholesale',
  },
  {
    id: 'prod-friday-night-entry',
    sku: 'EVT-ENT-009',
    slug: 'friday-night-magic-entry',
    name: 'Friday Night Magic Entry',
    game: 'Magic: The Gathering',
    setName: null,
    description: 'Weekly organised play entry for casual and competitive nights.',
    longDescription:
      'Friday Night Magic Entry keeps tournament registration visible in the commerce layer and provides a clean path for event commerce surfaces.',
    condition: 'SEALED',
    priceMinor: 700,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'friday night magic entry event tournament mtg',
    imageLabel: 'Event entry',
    categorySlug: 'events',
    supplierSlug: 'card-citadel',
  },
  {
    id: 'prod-pre-release-bundle',
    sku: 'EVT-ENT-010',
    slug: 'pre-release-bundle',
    name: 'Pre-release Bundle',
    game: 'Pokemon',
    setName: null,
    description: 'Tournament bundle for prerelease weekends and event specials.',
    longDescription:
      'Pre-release Bundle is the event-friendly listing for special weekend commerce, with room for future registration and ticketing integrations.',
    condition: 'SEALED',
    priceMinor: 2500,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'pre release bundle pokemon event entry tournament',
    imageLabel: 'Bundle ticket',
    categorySlug: 'events',
    supplierSlug: 'gamegrid-wholesale',
  },
  {
    id: 'prod-ancient-legends-booster-box',
    sku: 'SEALED-UPC-011',
    slug: 'ancient-legends-booster-box',
    name: 'Ancient Legends Booster Box',
    game: 'Pokemon',
    setName: 'Ancient Legends',
    description: 'A headline preorder booster box with a tightly managed allocation.',
    longDescription:
      'Ancient Legends Booster Box is designed as a showcase preorder with a countdown-led launch window and a premium release hero treatment.',
    condition: 'SEALED',
    priceMinor: 12999,
    currency: 'GBP',
    featured: true,
    published: true,
    searchText: 'ancient legends booster box pokemon preorder sealed upcoming release',
    imageLabel: 'Preorder box',
    categorySlug: 'sealed-product',
    supplierSlug: 'card-citadel',
    releaseStatus: 'PREORDER',
    releaseDate: '2026-07-26T09:00:00.000Z',
    expectedDispatchAt: '2026-07-26T15:00:00.000Z',
    expectedArrivalAt: '2026-07-29T09:00:00.000Z',
    allocationLimit: 96,
    customerPurchaseLimit: 2,
    supplierAllocation: 120,
    lowAllocationThreshold: 18,
    availabilityMessage: 'Preorders are open with a limited allocation.',
    preorderBadgeLabel: 'Pre-order open',
    comingSoonBadgeLabel: 'Coming soon',
  },
  {
    id: 'prod-cyber-destiny-trainer-box',
    sku: 'SEALED-UPC-012',
    slug: 'cyber-destiny-trainer-box',
    name: 'Cyber Destiny Trainer Box',
    game: 'Pokemon',
    setName: 'Cyber Destiny',
    description: 'A polished coming-soon trainer box with gift-friendly positioning.',
    longDescription:
      'Cyber Destiny Trainer Box is a coming-soon release built to anchor the homepage merchandising rail and the release calendar launch pages.',
    condition: 'SEALED',
    priceMinor: 4999,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'cyber destiny trainer box pokemon coming soon sealed preorder',
    imageLabel: 'Launch box',
    categorySlug: 'sealed-product',
    supplierSlug: 'card-citadel',
    releaseStatus: 'COMING_SOON',
    releaseDate: '2026-08-09T09:00:00.000Z',
    expectedDispatchAt: '2026-08-10T09:00:00.000Z',
    expectedArrivalAt: '2026-08-12T09:00:00.000Z',
    allocationLimit: 144,
    customerPurchaseLimit: 4,
    supplierAllocation: 180,
    lowAllocationThreshold: 20,
    availabilityMessage: 'Release announced. Notify me when preorders open.',
    preorderBadgeLabel: 'Pre-order soon',
    comingSoonBadgeLabel: 'Coming soon',
  },
  {
    id: 'prod-astral-shield-sleeves',
    sku: 'ACC-UPC-013',
    slug: 'astral-shield-sleeves',
    name: 'Astral Shield Sleeves',
    game: 'Accessories',
    setName: null,
    description: 'Premium sleeves tied to the release wave for display and bundle merchandising.',
    longDescription:
      'Astral Shield Sleeves expand the accessories line for upcoming launch weekends and help drive repeat visits through weekly release updates.',
    condition: 'SEALED',
    priceMinor: 1199,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'astral shield sleeves accessories preorder coming soon premium',
    imageLabel: 'Accessory pack',
    categorySlug: 'accessories',
    supplierSlug: 'gamegrid-wholesale',
    releaseStatus: 'PREORDER',
    releaseDate: '2026-07-31T09:00:00.000Z',
    expectedDispatchAt: '2026-07-31T13:00:00.000Z',
    expectedArrivalAt: '2026-08-02T09:00:00.000Z',
    allocationLimit: 220,
    customerPurchaseLimit: 6,
    supplierAllocation: 260,
    lowAllocationThreshold: 30,
    availabilityMessage: 'Accessory preorder allocations are filling quickly.',
    preorderBadgeLabel: 'Pre-order open',
    comingSoonBadgeLabel: 'Coming soon',
  },
  {
    id: 'prod-starlight-league-pass',
    sku: 'EVT-UPC-014',
    slug: 'starlight-league-pass',
    name: 'Starlight League Pass',
    game: 'One Piece Card Game',
    setName: null,
    description: 'Upcoming event product for league nights and prerelease weekends.',
    longDescription:
      'Starlight League Pass is a release-calendar friendly event item that keeps the venue-side commerce layer visible even before launch.',
    condition: 'SEALED',
    priceMinor: 1500,
    currency: 'GBP',
    featured: false,
    published: true,
    searchText: 'starlight league pass event upcoming release one piece',
    imageLabel: 'Event pass',
    categorySlug: 'events',
    supplierSlug: 'gamegrid-wholesale',
    releaseStatus: 'COMING_SOON',
    releaseDate: '2026-08-18T09:00:00.000Z',
    expectedDispatchAt: '2026-08-18T11:00:00.000Z',
    expectedArrivalAt: '2026-08-20T09:00:00.000Z',
    allocationLimit: 300,
    customerPurchaseLimit: 10,
    supplierAllocation: 350,
    lowAllocationThreshold: 50,
    availabilityMessage: 'Event tickets and bundled launch products are on the way.',
    preorderBadgeLabel: 'Release soon',
    comingSoonBadgeLabel: 'Coming soon',
  },
];

export const seedProducts = seededProducts;

export const seedReleases: ReleaseSeed[] = [
  {
    id: 'release-ancient-legends',
    name: 'Ancient Legends',
    slug: 'ancient-legends',
    brand: 'Pokemon',
    game: 'Pokemon',
    categorySlug: 'sealed-product',
    releaseDate: '2026-07-26T09:00:00.000Z',
    expectedDispatchAt: '2026-07-26T15:00:00.000Z',
    expectedArrivalAt: '2026-07-29T09:00:00.000Z',
    announcementText: 'A flagship preorder wave with a tightly controlled launch allocation.',
    releaseNotes: 'Premium sealed product with a homepage hero slot and countdown focus.',
    visible: true,
    featuredOnHomepage: true,
  },
  {
    id: 'release-cyber-destiny',
    name: 'Cyber Destiny',
    slug: 'cyber-destiny',
    brand: 'Pokemon',
    game: 'Pokemon',
    categorySlug: 'sealed-product',
    releaseDate: '2026-08-09T09:00:00.000Z',
    expectedDispatchAt: '2026-08-10T09:00:00.000Z',
    expectedArrivalAt: '2026-08-12T09:00:00.000Z',
    announcementText: 'Announced and ready for the coming soon hub.',
    releaseNotes: 'Launch wave for the release calendar and preorder merchandising.',
    visible: true,
    featuredOnHomepage: false,
  },
  {
    id: 'release-astral-shield',
    name: 'Astral Shield Accessories Drop',
    slug: 'astral-shield-accessories-drop',
    brand: 'TCG Hobby',
    game: 'Accessories',
    categorySlug: 'accessories',
    releaseDate: '2026-07-31T09:00:00.000Z',
    expectedDispatchAt: '2026-07-31T13:00:00.000Z',
    expectedArrivalAt: '2026-08-02T09:00:00.000Z',
    announcementText: 'Accessories release for launch-week bundles and upsells.',
    releaseNotes: 'Built for repeat visits and store merchandising.',
    visible: true,
    featuredOnHomepage: false,
  },
  {
    id: 'release-starlight-league',
    name: 'Starlight League Pass',
    slug: 'starlight-league-pass',
    brand: 'One Piece Card Game',
    game: 'One Piece Card Game',
    categorySlug: 'events',
    releaseDate: '2026-08-18T09:00:00.000Z',
    expectedDispatchAt: '2026-08-18T11:00:00.000Z',
    expectedArrivalAt: '2026-08-20T09:00:00.000Z',
    announcementText: 'Event commerce surface for weekly engagement.',
    releaseNotes: 'Keeps upcoming events visible before launch day.',
    visible: true,
    featuredOnHomepage: false,
  },
];

export const seedReleaseProducts: ReleaseProductSeed[] = [
  {
    id: 'relprod-ancient-box',
    releaseSlug: 'ancient-legends',
    productSlug: 'ancient-legends-booster-box',
    releaseStatus: 'PREORDER',
    releaseDate: '2026-07-26T09:00:00.000Z',
    expectedDispatchAt: '2026-07-26T15:00:00.000Z',
    expectedArrivalAt: '2026-07-29T09:00:00.000Z',
    allocationLimit: 96,
    customerPurchaseLimit: 2,
    supplierAllocation: 120,
    lowAllocationThreshold: 18,
    allocatedQuantity: 42,
    availabilityMessage: 'Preorders are open with a limited allocation.',
    preorderBadgeLabel: 'Pre-order open',
    comingSoonBadgeLabel: 'Coming soon',
  },
  {
    id: 'relprod-cyber-box',
    releaseSlug: 'cyber-destiny',
    productSlug: 'cyber-destiny-trainer-box',
    releaseStatus: 'COMING_SOON',
    releaseDate: '2026-08-09T09:00:00.000Z',
    expectedDispatchAt: '2026-08-10T09:00:00.000Z',
    expectedArrivalAt: '2026-08-12T09:00:00.000Z',
    allocationLimit: 144,
    customerPurchaseLimit: 4,
    supplierAllocation: 180,
    lowAllocationThreshold: 20,
    allocatedQuantity: 8,
    availabilityMessage: 'Release announced. Notify me when preorders open.',
    preorderBadgeLabel: 'Pre-order soon',
    comingSoonBadgeLabel: 'Coming soon',
  },
  {
    id: 'relprod-astral-sleeves',
    releaseSlug: 'astral-shield-accessories-drop',
    productSlug: 'astral-shield-sleeves',
    releaseStatus: 'PREORDER',
    releaseDate: '2026-07-31T09:00:00.000Z',
    expectedDispatchAt: '2026-07-31T13:00:00.000Z',
    expectedArrivalAt: '2026-08-02T09:00:00.000Z',
    allocationLimit: 220,
    customerPurchaseLimit: 6,
    supplierAllocation: 260,
    lowAllocationThreshold: 30,
    allocatedQuantity: 110,
    availabilityMessage: 'Accessory preorder allocations are filling quickly.',
    preorderBadgeLabel: 'Pre-order open',
    comingSoonBadgeLabel: 'Coming soon',
  },
  {
    id: 'relprod-starlight-pass',
    releaseSlug: 'starlight-league-pass',
    productSlug: 'starlight-league-pass',
    releaseStatus: 'COMING_SOON',
    releaseDate: '2026-08-18T09:00:00.000Z',
    expectedDispatchAt: '2026-08-18T11:00:00.000Z',
    expectedArrivalAt: '2026-08-20T09:00:00.000Z',
    allocationLimit: 300,
    customerPurchaseLimit: 10,
    supplierAllocation: 350,
    lowAllocationThreshold: 50,
    allocatedQuantity: 62,
    availabilityMessage: 'Event tickets and bundled launch products are on the way.',
    preorderBadgeLabel: 'Release soon',
    comingSoonBadgeLabel: 'Coming soon',
  },
];

export const seedNotificationSubscriptions: NotificationSubscriptionSeed[] = [
  {
    id: 'notify-sam-ancient',
    userId: 'user-customer-sam',
    productSlug: 'ancient-legends-booster-box',
    preference: 'ALL',
  },
  {
    id: 'notify-sam-cyber',
    userId: 'user-customer-sam',
    productSlug: 'cyber-destiny-trainer-box',
    preference: 'PREORDER',
  },
];

export const seedPricingRules: PricingRuleSeed[] = [
  {
    id: 'rule-global-manual',
    name: 'Global manual pricing',
    ruleType: 'MANUAL',
    ruleScope: 'GLOBAL',
    productSlug: null,
    categorySlug: null,
    supplierSlug: null,
    currency: 'GBP',
    priority: 1,
    active: true,
    config: { minimumMarginPercent: 35, maximumDiscountPercent: 20 },
  },
  {
    id: 'rule-sealed-supplier',
    name: 'Sealed supplier cost-plus',
    ruleType: 'COST_PLUS_PERCENT',
    ruleScope: 'CATEGORY',
    productSlug: null,
    categorySlug: 'sealed-product',
    supplierSlug: null,
    currency: 'GBP',
    priority: 90,
    active: true,
    config: { percentage: 18, minimumMarginPercent: 30, maximumDiscountPercent: 18 },
  },
  {
    id: 'rule-singles-fixed-margin',
    name: 'Singles fixed margin',
    ruleType: 'FIXED_MARGIN',
    ruleScope: 'CATEGORY',
    productSlug: null,
    categorySlug: 'singles',
    supplierSlug: null,
    currency: 'GBP',
    priority: 80,
    active: true,
    config: { marginMinor: 750, minimumMarginPercent: 28, maximumDiscountPercent: 15 },
  },
  {
    id: 'rule-accessories-promotional',
    name: 'Accessories promotional',
    ruleType: 'PROMOTIONAL',
    ruleScope: 'CATEGORY',
    productSlug: null,
    categorySlug: 'accessories',
    supplierSlug: null,
    currency: 'GBP',
    priority: 70,
    active: true,
    config: { buyMinor: 450, minimumMarginPercent: 25, maximumDiscountPercent: 30 },
  },
  {
    id: 'rule-events-supplier',
    name: 'Events supplier cost',
    ruleType: 'SUPPLIER_COST',
    ruleScope: 'CATEGORY',
    productSlug: null,
    categorySlug: 'events',
    supplierSlug: null,
    currency: 'GBP',
    priority: 60,
    active: true,
    config: { multiplier: 0.5, minimumMarginPercent: 35, maximumDiscountPercent: 40 },
  },
];

export const seedProductPricing: ProductPricingSeed[] = [
  {
    id: 'price-mega-greninja',
    productSlug: MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG,
    pricingRuleId: 'rule-sealed-supplier',
    costMinor: 3500,
    retailMinor: 4999,
    buyMinor: 3000,
    marginMinor: 1499,
    markupPercent: 43,
    profitMinor: 1499,
    minimumMarginPercent: 30,
    maximumDiscountPercent: 18,
    priceSource: 'Manual launch price',
    priceStatus: 'MANUAL_OVERRIDE',
    manualOverride: true,
  },
  {
    id: 'price-arcane',
    productSlug: 'arcane-booster-box',
    pricingRuleId: 'rule-sealed-supplier',
    costMinor: 8400,
    retailMinor: 11999,
    buyMinor: 6999,
    marginMinor: 3599,
    markupPercent: 43,
    profitMinor: 3599,
    minimumMarginPercent: 30,
    maximumDiscountPercent: 18,
    priceSource: 'Sealed supplier cost-plus',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-stellar',
    productSlug: 'stellar-crown-elite-trainer-box',
    pricingRuleId: 'rule-sealed-supplier',
    costMinor: 2900,
    retailMinor: 4499,
    buyMinor: 2550,
    marginMinor: 1599,
    markupPercent: 55,
    profitMinor: 1599,
    minimumMarginPercent: 30,
    maximumDiscountPercent: 18,
    priceSource: 'Sealed supplier cost-plus',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-midnight',
    productSlug: 'midnight-rites-booster-display',
    pricingRuleId: 'rule-sealed-supplier',
    costMinor: 6200,
    retailMinor: 8999,
    buyMinor: 5200,
    marginMinor: 2799,
    markupPercent: 45,
    profitMinor: 2799,
    minimumMarginPercent: 30,
    maximumDiscountPercent: 18,
    priceSource: 'Sealed supplier cost-plus',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-dragon',
    productSlug: 'dragon-lord-secret-rare',
    pricingRuleId: 'rule-singles-fixed-margin',
    costMinor: 2150,
    retailMinor: 3499,
    buyMinor: 1750,
    marginMinor: 1349,
    markupPercent: 63,
    profitMinor: 1349,
    minimumMarginPercent: 28,
    maximumDiscountPercent: 15,
    priceSource: 'Singles fixed margin',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-bolt',
    productSlug: 'lightning-bolt-playset',
    pricingRuleId: 'rule-singles-fixed-margin',
    costMinor: 1450,
    retailMinor: 2499,
    buyMinor: 1200,
    marginMinor: 1049,
    markupPercent: 72,
    profitMinor: 1049,
    minimumMarginPercent: 28,
    maximumDiscountPercent: 15,
    priceSource: 'Singles fixed margin',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-oracle',
    productSlug: 'mystic-oracle-binder-page',
    pricingRuleId: 'rule-singles-fixed-margin',
    costMinor: 900,
    retailMinor: 1599,
    buyMinor: 825,
    marginMinor: 699,
    markupPercent: 78,
    profitMinor: 699,
    minimumMarginPercent: 28,
    maximumDiscountPercent: 15,
    priceSource: 'Singles fixed margin',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-sleeves',
    productSlug: 'matte-black-dragon-shield-sleeves',
    pricingRuleId: 'rule-accessories-promotional',
    costMinor: 360,
    retailMinor: 1099,
    buyMinor: 450,
    marginMinor: 739,
    markupPercent: 205,
    profitMinor: 739,
    minimumMarginPercent: 25,
    maximumDiscountPercent: 30,
    priceSource: 'Accessories promotional',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-case',
    productSlug: 'one-touch-magnetic-case',
    pricingRuleId: 'rule-accessories-promotional',
    costMinor: 420,
    retailMinor: 1299,
    buyMinor: 500,
    marginMinor: 879,
    markupPercent: 209,
    profitMinor: 879,
    minimumMarginPercent: 25,
    maximumDiscountPercent: 30,
    priceSource: 'Accessories promotional',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-friday',
    productSlug: 'friday-night-magic-entry',
    pricingRuleId: 'rule-events-supplier',
    costMinor: 300,
    retailMinor: 700,
    buyMinor: 250,
    marginMinor: 400,
    markupPercent: 133,
    profitMinor: 400,
    minimumMarginPercent: 35,
    maximumDiscountPercent: 40,
    priceSource: 'Events supplier cost',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-prerelease',
    productSlug: 'pre-release-bundle',
    pricingRuleId: 'rule-events-supplier',
    costMinor: 1300,
    retailMinor: 2500,
    buyMinor: 900,
    marginMinor: 1200,
    markupPercent: 92,
    profitMinor: 1200,
    minimumMarginPercent: 35,
    maximumDiscountPercent: 40,
    priceSource: 'Events supplier cost',
    priceStatus: 'ACTIVE',
    manualOverride: false,
  },
  {
    id: 'price-ancient',
    productSlug: 'ancient-legends-booster-box',
    pricingRuleId: 'rule-sealed-supplier',
    costMinor: 9000,
    retailMinor: 12999,
    buyMinor: 7600,
    marginMinor: 3999,
    markupPercent: 44,
    profitMinor: 3999,
    minimumMarginPercent: 30,
    maximumDiscountPercent: 18,
    priceSource: 'Sealed supplier cost-plus',
    priceStatus: 'FUTURE',
    manualOverride: false,
  },
  {
    id: 'price-cyber',
    productSlug: 'cyber-destiny-trainer-box',
    pricingRuleId: 'rule-sealed-supplier',
    costMinor: 3400,
    retailMinor: 4999,
    buyMinor: 2850,
    marginMinor: 1599,
    markupPercent: 47,
    profitMinor: 1599,
    minimumMarginPercent: 30,
    maximumDiscountPercent: 18,
    priceSource: 'Sealed supplier cost-plus',
    priceStatus: 'FUTURE',
    manualOverride: false,
  },
  {
    id: 'price-astral',
    productSlug: 'astral-shield-sleeves',
    pricingRuleId: 'rule-accessories-promotional',
    costMinor: 430,
    retailMinor: 1199,
    buyMinor: 500,
    marginMinor: 769,
    markupPercent: 179,
    profitMinor: 769,
    minimumMarginPercent: 25,
    maximumDiscountPercent: 30,
    priceSource: 'Accessories promotional',
    priceStatus: 'FUTURE',
    manualOverride: false,
  },
  {
    id: 'price-starlight',
    productSlug: 'starlight-league-pass',
    pricingRuleId: 'rule-events-supplier',
    costMinor: 350,
    retailMinor: 1500,
    buyMinor: 300,
    marginMinor: 1150,
    markupPercent: 329,
    profitMinor: 1150,
    minimumMarginPercent: 35,
    maximumDiscountPercent: 40,
    priceSource: 'Events supplier cost',
    priceStatus: 'FUTURE',
    manualOverride: false,
  },
];

export const seedBuylists: BuylistSeed[] = [
  {
    id: 'buylist-sam-draft',
    buylistNumber: 'BL-20260704-0001',
    userId: 'user-customer-sam',
    status: 'DRAFT',
    currency: 'GBP',
    estimatedPayoutMinor: 8749,
    offeredPayoutMinor: 0,
    customerNotes: 'Looking for a quick trade-in estimate.',
    staffNotes: null,
    paymentReference: null,
    submittedAt: null,
    receivedAt: null,
    reviewedAt: null,
    approvedAt: null,
    rejectedAt: null,
    paidAt: null,
  },
  {
    id: 'buylist-sam-submitted',
    buylistNumber: 'BL-20260704-0002',
    userId: 'user-customer-sam',
    status: 'SUBMITTED',
    currency: 'GBP',
    estimatedPayoutMinor: 12750,
    offeredPayoutMinor: 12000,
    customerNotes: 'Would like the payout by bank transfer if approved.',
    staffNotes: 'Pending intake verification.',
    paymentReference: null,
    submittedAt: '2026-07-03T10:30:00.000Z',
    receivedAt: null,
    reviewedAt: null,
    approvedAt: null,
    rejectedAt: null,
    paidAt: null,
  },
];

export const seedBuylistItems: BuylistItemSeed[] = [
  {
    id: 'buyitem-arcane',
    buylistId: 'buylist-sam-draft',
    productSlug: 'arcane-booster-box',
    quantity: 1,
    estimatedBuyMinor: 6999,
    offeredBuyMinor: 0,
    notes: 'Box is in excellent condition.',
  },
  {
    id: 'buyitem-bolt',
    buylistId: 'buylist-sam-draft',
    productSlug: 'lightning-bolt-playset',
    quantity: 1,
    estimatedBuyMinor: 1750,
    offeredBuyMinor: 0,
    notes: 'Near mint playset.',
  },
  {
    id: 'buyitem-dragon',
    buylistId: 'buylist-sam-submitted',
    productSlug: 'dragon-lord-secret-rare',
    quantity: 2,
    estimatedBuyMinor: 6375,
    offeredBuyMinor: 6000,
    notes: null,
  },
];

export const seedInventory: InventorySeed[] = [
  { id: 'inv-mega-greninja', productSlug: MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG, stockOnHand: 3, reservedStock: 0, reorderPoint: 0, locationCode: 'MAIN' },
  { id: 'inv-arcane', productSlug: 'arcane-booster-box', stockOnHand: 14, reservedStock: 2, reorderPoint: 4, locationCode: 'MAIN' },
  { id: 'inv-stellar', productSlug: 'stellar-crown-elite-trainer-box', stockOnHand: 22, reservedStock: 4, reorderPoint: 6, locationCode: 'MAIN' },
  { id: 'inv-midnight', productSlug: 'midnight-rites-booster-display', stockOnHand: 8, reservedStock: 1, reorderPoint: 3, locationCode: 'MAIN' },
  { id: 'inv-dragon', productSlug: 'dragon-lord-secret-rare', stockOnHand: 3, reservedStock: 0, reorderPoint: 1, locationCode: 'BINDER' },
  { id: 'inv-bolt', productSlug: 'lightning-bolt-playset', stockOnHand: 11, reservedStock: 2, reorderPoint: 3, locationCode: 'BINDER' },
  { id: 'inv-oracle', productSlug: 'mystic-oracle-binder-page', stockOnHand: 7, reservedStock: 1, reorderPoint: 2, locationCode: 'BINDER' },
  { id: 'inv-sleeves', productSlug: 'matte-black-dragon-shield-sleeves', stockOnHand: 50, reservedStock: 6, reorderPoint: 12, locationCode: 'ACCESSORIES' },
  { id: 'inv-case', productSlug: 'one-touch-magnetic-case', stockOnHand: 31, reservedStock: 3, reorderPoint: 10, locationCode: 'ACCESSORIES' },
  { id: 'inv-friday', productSlug: 'friday-night-magic-entry', stockOnHand: 120, reservedStock: 0, reorderPoint: 15, locationCode: 'EVENTS' },
  { id: 'inv-pre-release', productSlug: 'pre-release-bundle', stockOnHand: 40, reservedStock: 0, reorderPoint: 10, locationCode: 'EVENTS' },
  { id: 'inv-ancient', productSlug: 'ancient-legends-booster-box', stockOnHand: 0, reservedStock: 0, reorderPoint: 0, locationCode: 'PREORDER' },
  { id: 'inv-cyber', productSlug: 'cyber-destiny-trainer-box', stockOnHand: 0, reservedStock: 0, reorderPoint: 0, locationCode: 'PREORDER' },
  { id: 'inv-astral', productSlug: 'astral-shield-sleeves', stockOnHand: 0, reservedStock: 0, reorderPoint: 0, locationCode: 'PREORDER' },
  { id: 'inv-starlight', productSlug: 'starlight-league-pass', stockOnHand: 0, reservedStock: 0, reorderPoint: 0, locationCode: 'PREORDER' },
];

export const seedCarts: CartSeed[] = [
  { id: 'cart-customer-sam', userId: 'user-customer-sam', status: 'ACTIVE', currency: 'GBP' },
];

export const seedCartItems: CartItemSeed[] = [
  {
    id: 'cart-item-arcane',
    cartId: 'cart-customer-sam',
    productSlug: 'arcane-booster-box',
    quantity: 1,
    unitPriceMinor: 11999,
    productName: 'Arcane Booster Box',
    productSlugSnapshot: 'arcane-booster-box',
  },
  {
    id: 'cart-item-sleeves',
    cartId: 'cart-customer-sam',
    productSlug: 'matte-black-dragon-shield-sleeves',
    quantity: 2,
    unitPriceMinor: 1099,
    productName: 'Matte Black Dragon Shield Sleeves',
    productSlugSnapshot: 'matte-black-dragon-shield-sleeves',
  },
];

export const seedOrders: OrderSeed[] = [
  {
    id: 'order-1001',
    orderNumber: 'TCG-1001',
    userId: 'user-customer-sam',
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    fulfilmentStatus: 'PENDING',
    shippingMethodCode: 'UK_STANDARD',
    shippingMethodName: 'UK Standard',
    subtotalMinor: 14197,
    shippingMinor: 499,
    taxMinor: 0,
    totalMinor: 14696,
    currency: 'GBP',
    shippingFullName: 'Sam Collector',
    shippingEmail: 'sam.customer@tcghobby.test',
    shippingLine1: '14 Aurora Street',
    shippingLine2: null,
    shippingCity: 'Bristol',
    shippingRegion: null,
    shippingPostalCode: 'BS1 4TR',
    shippingCountry: 'GB',
    shippingAddressId: 'addr-order-1001',
  },
];

export const seedOrderItems: OrderItemSeed[] = [
  {
    id: 'order-item-arcane',
    orderId: 'order-1001',
    productSlug: 'arcane-booster-box',
    quantity: 1,
    unitPriceMinor: 11999,
    totalMinor: 11999,
    productName: 'Arcane Booster Box',
    productSlugSnapshot: 'arcane-booster-box',
  },
  {
    id: 'order-item-case',
    orderId: 'order-1001',
    productSlug: 'one-touch-magnetic-case',
    quantity: 2,
    unitPriceMinor: 1099,
    totalMinor: 2198,
    productName: 'One Touch Magnetic Case',
    productSlugSnapshot: 'one-touch-magnetic-case',
  },
];

export const seedSupplierProducts: SupplierProductSeed[] = [
  { id: 'sp-mega-greninja', supplierSlug: 'card-citadel', productSlug: MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG, supplierSku: 'PKM-MGREN-PC-001', costMinor: 3500, currency: 'GBP', leadTimeDays: 5 },
  { id: 'sp-arcane', supplierSlug: 'card-citadel', productSlug: 'arcane-booster-box', supplierSku: 'CC-ARC-001', costMinor: 8750, currency: 'GBP', leadTimeDays: 4 },
  { id: 'sp-stellar', supplierSlug: 'card-citadel', productSlug: 'stellar-crown-elite-trainer-box', supplierSku: 'CC-PKM-002', costMinor: 3150, currency: 'GBP', leadTimeDays: 4 },
  { id: 'sp-midnight', supplierSlug: 'gamegrid-wholesale', productSlug: 'midnight-rites-booster-display', supplierSku: 'GG-BOX-003', costMinor: 6540, currency: 'GBP', leadTimeDays: 6 },
  { id: 'sp-dragon', supplierSlug: 'gamegrid-wholesale', productSlug: 'dragon-lord-secret-rare', supplierSku: 'GG-SING-004', costMinor: 2125, currency: 'GBP', leadTimeDays: 3 },
  { id: 'sp-bolt', supplierSlug: 'card-citadel', productSlug: 'lightning-bolt-playset', supplierSku: 'CC-SING-005', costMinor: 1490, currency: 'GBP', leadTimeDays: 3 },
  { id: 'sp-oracle', supplierSlug: 'card-citadel', productSlug: 'mystic-oracle-binder-page', supplierSku: 'CC-SING-006', costMinor: 890, currency: 'GBP', leadTimeDays: 3 },
  { id: 'sp-sleeves', supplierSlug: 'gamegrid-wholesale', productSlug: 'matte-black-dragon-shield-sleeves', supplierSku: 'GG-ACC-007', costMinor: 650, currency: 'GBP', leadTimeDays: 5 },
  { id: 'sp-case', supplierSlug: 'gamegrid-wholesale', productSlug: 'one-touch-magnetic-case', supplierSku: 'GG-ACC-008', costMinor: 790, currency: 'GBP', leadTimeDays: 5 },
  { id: 'sp-friday', supplierSlug: 'card-citadel', productSlug: 'friday-night-magic-entry', supplierSku: 'CC-EVT-009', costMinor: 250, currency: 'GBP', leadTimeDays: 2 },
  { id: 'sp-prerelease', supplierSlug: 'gamegrid-wholesale', productSlug: 'pre-release-bundle', supplierSku: 'GG-EVT-010', costMinor: 1200, currency: 'GBP', leadTimeDays: 2 },
  { id: 'sp-ancient', supplierSlug: 'card-citadel', productSlug: 'ancient-legends-booster-box', supplierSku: 'CC-UPC-011', costMinor: 9000, currency: 'GBP', leadTimeDays: 5 },
  { id: 'sp-cyber', supplierSlug: 'card-citadel', productSlug: 'cyber-destiny-trainer-box', supplierSku: 'CC-UPC-012', costMinor: 3400, currency: 'GBP', leadTimeDays: 5 },
  { id: 'sp-astral', supplierSlug: 'gamegrid-wholesale', productSlug: 'astral-shield-sleeves', supplierSku: 'GG-ACC-013', costMinor: 430, currency: 'GBP', leadTimeDays: 4 },
  { id: 'sp-starlight', supplierSlug: 'gamegrid-wholesale', productSlug: 'starlight-league-pass', supplierSku: 'GG-EVT-014', costMinor: 350, currency: 'GBP', leadTimeDays: 2 },
];

export const seedProductImages: ProductImageSeed[] = seedProducts.flatMap((product) => {
  if (product.slug === MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG) {
    const baseUrl = '/products/pokemon/mega-greninja-ex-premium-collection';
    return [
      {
        id: 'img-mega-greninja-primary',
        productSlug: product.slug,
        url: `${baseUrl}/primary.webp`,
        altText: 'Pokémon TCG Mega Greninja ex Premium Collection box',
        imageType: 'primary',
        sortOrder: 1,
        isPrimary: true,
      },
      {
        id: 'img-mega-greninja-booster-packs',
        productSlug: product.slug,
        url: `${baseUrl}/booster-packs.webp`,
        altText: 'Eight Pokémon TCG booster packs included in the Mega Greninja ex Premium Collection',
        imageType: 'gallery',
        sortOrder: 2,
        isPrimary: false,
      },
      {
        id: 'img-mega-greninja-promo-cards',
        productSlug: product.slug,
        url: `${baseUrl}/promo-cards.webp`,
        altText: 'Mega Greninja ex promotional card and oversized lenticular promotional card',
        imageType: 'gallery',
        sortOrder: 3,
        isPrimary: false,
      },
      {
        id: 'img-mega-greninja-rear-packaging',
        productSlug: product.slug,
        url: `${baseUrl}/rear-packaging.webp`,
        altText: 'Rear packaging of the Pokémon TCG Mega Greninja ex Premium Collection',
        imageType: 'gallery',
        sortOrder: 4,
        isPrimary: false,
      },
    ];
  }

  const baseUrl = `https://images.tcghobby.test/products/${product.slug}`;
  return [
    {
      id: `img-${product.slug}-primary`,
      productSlug: product.slug,
      url: `${baseUrl}/primary.jpg`,
      altText: `${product.name} primary image`,
      imageType: 'gallery',
      sortOrder: 1,
      isPrimary: true,
    },
    {
      id: `img-${product.slug}-secondary`,
      productSlug: product.slug,
      url: `${baseUrl}/secondary.jpg`,
      altText: `${product.name} secondary image`,
      imageType: 'gallery',
      sortOrder: 2,
      isPrimary: false,
    },
  ];
});

export const seedWishlists: WishlistSeed[] = [
  {
    id: 'wishlist-sam',
    userId: 'user-customer-sam',
  },
];

export const seedWishlistItems: WishlistItemSeed[] = [
  {
    id: 'wishlist-item-arcane',
    wishlistId: 'wishlist-sam',
    productSlug: 'arcane-booster-box',
  },
  {
    id: 'wishlist-item-sleeves',
    wishlistId: 'wishlist-sam',
    productSlug: 'matte-black-dragon-shield-sleeves',
  },
];

export const seedCollections: CollectionSeed[] = [
  {
    id: 'collection-sam',
    userId: 'user-customer-sam',
  },
];

export const seedCollectionItems: CollectionItemSeed[] = [
  {
    id: 'collection-item-dragon',
    collectionId: 'collection-sam',
    productSlug: 'dragon-lord-secret-rare',
    ownedQuantity: 2,
    printVariant: 'HOLO',
    condition: 'NEAR_MINT',
    foil: true,
    language: 'EN',
    notes: 'Top-loader stored with binder copy.',
    dateAcquired: '2026-06-18T00:00:00.000Z',
    purchasePriceMinor: 2999,
  },
  {
    id: 'collection-item-bolt',
    collectionId: 'collection-sam',
    productSlug: 'lightning-bolt-playset',
    ownedQuantity: 4,
    printVariant: 'REGULAR',
    condition: 'LIGHTLY_PLAYED',
    foil: false,
    language: 'EN',
    notes: 'Competitive playset kept in deck box.',
    dateAcquired: '2026-06-22T00:00:00.000Z',
    purchasePriceMinor: 1999,
  },
  {
    id: 'collection-item-oracle',
    collectionId: 'collection-sam',
    productSlug: 'mystic-oracle-binder-page',
    ownedQuantity: 1,
    printVariant: 'PROMO',
    condition: 'NEAR_MINT',
    foil: false,
    language: 'JP',
    notes: 'Promo insert from a trade night.',
    dateAcquired: '2026-07-01T00:00:00.000Z',
    purchasePriceMinor: null,
  },
];

export const seedDecks: DeckSeed[] = [
  {
    id: 'deck-sam-burn',
    userId: 'user-customer-sam',
    name: 'Sam Burn',
    slug: 'sam-burn',
    game: 'Magic: The Gathering',
    visibility: 'PRIVATE',
    notes: 'A focused burn list for quick testing and local events.',
    imageLabel: 'Deck stack',
    maxCards: 60,
    maxCopiesPerCard: 4,
  },
];

export const seedDeckCards: DeckCardSeed[] = [
  { id: 'deck-card-bolt-1', deckId: 'deck-sam-burn', productSlug: 'lightning-bolt-playset', quantity: 4 },
  { id: 'deck-card-dragon-1', deckId: 'deck-sam-burn', productSlug: 'dragon-lord-secret-rare', quantity: 2 },
  { id: 'deck-card-oracle-1', deckId: 'deck-sam-burn', productSlug: 'mystic-oracle-binder-page', quantity: 1 },
];

const marketSeedUpdatedAt = '2026-07-04T12:00:00.000Z';

function buildMarketHistory(currentEstimateMinor: number, yesterdayMinor: number, sevenDayMinor: number, thirtyDayMinor: number) {
  return [
    { label: '30D', valueMinor: thirtyDayMinor, recordedAt: '2026-06-04T12:00:00.000Z' },
    { label: '7D', valueMinor: sevenDayMinor, recordedAt: '2026-06-27T12:00:00.000Z' },
    { label: 'Yesterday', valueMinor: yesterdayMinor, recordedAt: '2026-07-03T12:00:00.000Z' },
    { label: 'Current', valueMinor: currentEstimateMinor, recordedAt: marketSeedUpdatedAt },
  ];
}

function buildMarketSnapshotSeed(product: ProductSeed, index: number): MarketSnapshotSeed {
  const baseMultiplier =
    product.categorySlug === 'singles' ? 0.84 :
    product.categorySlug === 'accessories' ? 0.9 :
    product.categorySlug === 'events' ? 0.96 :
    0.92;
  const trendShift = (index % 5) - 2;
  const currentEstimateMinor = Math.max(150, Math.round(product.priceMinor * baseMultiplier) + trendShift * 25);
  const yesterdayMinor = Math.max(150, currentEstimateMinor - trendShift * 15 - 20);
  const sevenDayMinor = Math.max(150, currentEstimateMinor - trendShift * 20 - 35);
  const thirtyDayMinor = Math.max(150, currentEstimateMinor - trendShift * 30 - 80);
  const trend: MarketSnapshotSeed['trend'] =
    currentEstimateMinor > thirtyDayMinor ? 'UP' : currentEstimateMinor < thirtyDayMinor ? 'DOWN' : index % 3 === 0 ? 'FLAT' : 'VOLATILE';
  const confidenceScore = 68 + ((index * 7) % 28);

  return {
    id: `market-${product.slug}`,
    productSlug: product.slug,
    currentEstimateMinor,
    yesterdayMinor,
    sevenDayMinor,
    thirtyDayMinor,
    trend,
    confidenceScore,
    lastUpdatedAt: marketSeedUpdatedAt,
    source: 'Seeded collector market',
    history: buildMarketHistory(currentEstimateMinor, yesterdayMinor, sevenDayMinor, thirtyDayMinor),
  };
}

export const seedMarketSnapshots: MarketSnapshotSeed[] = seedProducts.map((product, index) => buildMarketSnapshotSeed(product, index));

const marketSnapshotLookup = new Map(seedMarketSnapshots.map((snapshot) => [snapshot.productSlug, snapshot]));

export const seedWatchlistItems: WatchlistItemSeed[] = [
  {
    id: 'watch-sam-arcane',
    userId: 'user-customer-sam',
    subjectType: 'PRODUCT',
    subjectKey: 'arcane-booster-box',
    productSlug: 'arcane-booster-box',
    notificationType: 'PRICE_MOVEMENT',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    note: 'Track sealed box movement before restocks.',
  },
  {
    id: 'watch-sam-ancient',
    userId: 'user-customer-sam',
    subjectType: 'RELEASE',
    subjectKey: 'release-ancient-legends',
    releaseSlug: 'ancient-legends',
    notificationType: 'UPCOMING_RELEASE',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    note: 'Watch the launch window for the next set.',
  },
  {
    id: 'watch-sam-dragon-collection',
    userId: 'user-customer-sam',
    subjectType: 'COLLECTION_ITEM',
    subjectKey: 'collection-item-dragon',
    collectionItemId: 'collection-item-dragon',
    productSlug: 'dragon-lord-secret-rare',
    notificationType: 'COLLECTION_UPDATES',
    emailEnabled: false,
    pushEnabled: false,
    inAppEnabled: true,
    note: 'Keep an eye on this binder staple.',
  },
];

export const seedNotificationCenterPreferences: NotificationCenterPreferenceSeed[] = [
  {
    id: 'notify-pref-sam-price',
    userId: 'user-customer-sam',
    notificationType: 'PRICE_MOVEMENT',
    subjectType: null,
    subjectLabel: 'All watched cards',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
  },
  {
    id: 'notify-pref-sam-release',
    userId: 'user-customer-sam',
    notificationType: 'UPCOMING_RELEASE',
    subjectType: null,
    subjectLabel: 'Upcoming releases',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
  },
  {
    id: 'notify-pref-sam-wishlist',
    userId: 'user-customer-sam',
    notificationType: 'WISHLIST_AVAILABILITY',
    subjectType: null,
    subjectLabel: 'Wishlist availability',
    emailEnabled: false,
    pushEnabled: false,
    inAppEnabled: true,
  },
  {
    id: 'notify-pref-sam-collection',
    userId: 'user-customer-sam',
    notificationType: 'COLLECTION_UPDATES',
    subjectType: null,
    subjectLabel: 'Collection updates',
    emailEnabled: false,
    pushEnabled: false,
    inAppEnabled: true,
  },
  {
    id: 'notify-pref-sam-buylist',
    userId: 'user-customer-sam',
    notificationType: 'BUYLIST_UPDATES',
    subjectType: null,
    subjectLabel: 'Buylist updates',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
  },
];

export const seedCollectionInsightSnapshots: CollectionInsightSnapshotSeed[] = [
  (() => {
    const cardsOwned = seedCollectionItems.reduce((sum, item) => sum + item.ownedQuantity, 0);
    const setsOwned = new Set(seedCollectionItems.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);
      return product?.setName ?? product?.categorySlug ?? item.productSlug;
    })).size;
    const favouriteGame = seedCollectionItems.reduce((counts, item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);
      const game = product?.game ?? 'Unknown';
      counts.set(game, (counts.get(game) ?? 0) + item.ownedQuantity);
      return counts;
    }, new Map<string, number>());
    const favouriteGameName = [...favouriteGame.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
    const estimatedValueMinor = seedCollectionItems.reduce((sum, item) => {
      const snapshot = marketSnapshotLookup.get(item.productSlug);
      return sum + ((snapshot?.currentEstimateMinor ?? item.purchasePriceMinor ?? 0) * item.ownedQuantity);
    }, 0);
    const previousValueMinor = Math.round(estimatedValueMinor * 0.96);
    const sevenDayValueMinor = Math.round(estimatedValueMinor * 0.98);
    const thirtyDayValueMinor = Math.round(estimatedValueMinor * 0.93);
    const wishlistOverlapCount = seedCollectionItems.filter((item) => seedWishlistItems.some((wishlist) => wishlist.productSlug === item.productSlug)).length;
    const deckCompletionPercent = 82;
    const recentGrowthMinor = estimatedValueMinor - thirtyDayValueMinor;

    return {
      id: 'insight-sam',
      userId: 'user-customer-sam',
      collectionId: 'collection-sam',
      estimatedValueMinor,
      previousValueMinor,
      sevenDayValueMinor,
      thirtyDayValueMinor,
      collectionHealthScore: 88,
      cardsOwned,
      setsOwned,
      favouriteGame: favouriteGameName,
      wishlistOverlapCount,
      deckCompletionPercent,
      recentGrowthMinor,
      heatMap: {
        magic: 6,
        pokemon: 2,
        yugioh: 1,
      },
      recentActivity: [
        { label: 'Dragon Lord Secret Rare', value: 'Added 2 copies' },
        { label: 'Lightning Bolt Playset', value: 'Updated quantity' },
        { label: 'Mystic Oracle Binder Page', value: 'Imported from catalogue' },
      ],
      lastUpdatedAt: marketSeedUpdatedAt,
    };
  })(),
];

export function isCatalogueProductVisible(product: ProductSeed): boolean {
  return product.published;
}

export function toCatalogueCategory(seed: CategorySeed, productCount = 0): CatalogueCategory {
  return {
    id: seed.id,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    sortOrder: seed.sortOrder,
    productCount,
  };
}

export function toMoney(amountMinor: number, currency: Money['currency'] = 'GBP'): Money {
  return { amountMinor, currency };
}

export function toCatalogueProduct(seed: ProductSeed, inventory: InventorySeed, category: CategorySeed, supplier: SupplierSeed): CatalogueProduct {
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    game: seed.game,
    description: seed.description,
    categoryName: category.name,
    categorySlug: category.slug,
    price: toMoney(seed.priceMinor, seed.currency),
    featured: seed.featured,
    homepagePriority: seed.homepagePriority ?? null,
    heroFeatured: seed.heroFeatured ?? false,
    lifecycleState: seed.lifecycleState ?? (seed.published ? 'PUBLISHED' : 'DRAFT'),
    inStock: inventory.stockOnHand - inventory.reservedStock > 0,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    supplierName: supplier.name,
    badge: seed.featured ? 'Featured' : category.name,
    imageLabel: seed.imageLabel,
    releaseStatus: seed.releaseStatus ?? 'RELEASED',
    releaseDate: seed.releaseDate ?? null,
    expectedDispatchAt: seed.expectedDispatchAt ?? null,
    expectedArrivalAt: seed.expectedArrivalAt ?? null,
    allocationLimit: seed.allocationLimit ?? null,
    customerPurchaseLimit: seed.customerPurchaseLimit ?? null,
    supplierAllocation: seed.supplierAllocation ?? null,
    lowAllocationThreshold: seed.lowAllocationThreshold ?? null,
    availabilityMessage: seed.availabilityMessage ?? null,
    preorderBadgeLabel: seed.preorderBadgeLabel ?? null,
    comingSoonBadgeLabel: seed.comingSoonBadgeLabel ?? null,
    vatRate: seed.vatRate ?? 20,
    freeUkStandardShipping: seed.freeUkStandardShipping ?? seed.slug === MEGA_GRENINJA_PREMIUM_COLLECTION_SLUG,
    shippingPromotionProductOnly: seed.shippingPromotionProductOnly ?? true,
  };
}

export function toCatalogueProductDetail(
  seed: ProductSeed,
  inventory: InventorySeed,
  category: CategorySeed,
  supplier: SupplierSeed,
): CatalogueProductDetail {
  const supplierProduct = seedSupplierProducts.find((entry) => entry.productSlug === seed.slug && entry.supplierSlug === supplier.slug);

  return {
    ...toCatalogueProduct(seed, inventory, category, supplier),
    sku: seed.sku,
    setName: seed.setName,
    condition: seed.condition,
    longDescription: seed.longDescription,
    searchText: seed.searchText,
    supplierSku: supplierProduct?.supplierSku ?? `${seed.sku}-SEED`,
    leadTimeDays: supplierProduct?.leadTimeDays ?? 5,
    images: [],
    relatedProducts: [],
  };
}
