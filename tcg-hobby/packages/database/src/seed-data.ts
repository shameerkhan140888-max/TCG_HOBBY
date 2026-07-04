import { hashPassword } from '@tcg-hobby/auth';
import type { CatalogueCategory, CatalogueProduct, CatalogueProductDetail, Money } from '@tcg-hobby/types';

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
  sku: string;
  slug: string;
  name: string;
  game: string;
  setName: string | null;
  description: string;
  longDescription: string;
  condition: 'MINT' | 'NEAR_MINT' | 'LIGHTLY_PLAYED' | 'MODERATELY_PLAYED' | 'HEAVILY_PLAYED' | 'DAMAGED' | 'SEALED';
  priceMinor: number;
  currency: Money['currency'];
  featured: boolean;
  published: boolean;
  searchText: string;
  imageLabel: string;
  categorySlug: string;
  supplierSlug: string;
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
];

export const seedProducts = seededProducts;

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
];

export const seedProductImages: ProductImageSeed[] = seedProducts.flatMap((product) => {
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
    inStock: inventory.stockOnHand - inventory.reservedStock > 0,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    supplierName: supplier.name,
    badge: seed.featured ? 'Featured' : category.name,
    imageLabel: seed.imageLabel,
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
    relatedProducts: [],
  };
}
