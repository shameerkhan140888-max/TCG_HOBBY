export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

export type ProductCondition =
  | 'MINT'
  | 'NEAR_MINT'
  | 'LIGHTLY_PLAYED'
  | 'MODERATELY_PLAYED'
  | 'HEAVILY_PLAYED'
  | 'DAMAGED'
  | 'SEALED';

export type CatalogueSort = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export type CatalogueFilters = {
  search: string;
  category: string;
  sort: CatalogueSort;
  page: number;
  pageSize: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CatalogueCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  productCount: number;
};

export type CatalogueProduct = {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  price: Money;
  featured: boolean;
  inStock: boolean;
  stockOnHand: number;
  reservedStock: number;
  supplierName: string;
  badge: string;
  imageLabel: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
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
};

export type CatalogueProductDetail = CatalogueProduct & {
  sku: string;
  setName: string | null;
  condition: ProductCondition;
  longDescription: string;
  searchText: string;
  supplierSku: string;
  leadTimeDays: number;
  relatedProducts: CatalogueProduct[];
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  game: string;
  price: Money;
  inStock: boolean;
};

export type ProductReleaseStatus = 'RELEASED' | 'PREORDER' | 'COMING_SOON' | 'ARCHIVED';

export type ApiHealth = {
  status: 'ok';
  service: 'tcg-hobby-api';
};

export type PaymentStatus = 'REQUIRES_PAYMENT' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';

export type FulfilmentStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';

export type ShippingMethodCode = 'UK_STANDARD' | 'UK_EXPRESS' | 'WORLDWIDE_STANDARD';

export type ShippingMethod = {
  code: ShippingMethodCode;
  name: string;
  description: string;
  etaLabel: string;
  currency: CurrencyCode;
  amountMinor: number;
  countryScope: 'GB' | 'WORLDWIDE';
};

export type CartLineItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  inStock: boolean;
};

export type CartSummary = {
  items: CartLineItem[];
  subtotalMinor: number;
  currency: CurrencyCode;
  totalItems: number;
};

export type CheckoutAddress = {
  fullName: string;
  email: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  country: string;
};

export type OrderLineItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
};

export type OrderSummary = {
  orderNumber: string;
  status: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  currency: CurrencyCode;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type PricingRuleType =
  | 'MANUAL'
  | 'COST_PLUS_PERCENT'
  | 'FIXED_MARGIN'
  | 'SUPPLIER_COST'
  | 'PROMOTIONAL'
  | 'FUTURE_MARKET_FEED';

export type PricingRuleScope = 'GLOBAL' | 'PRODUCT' | 'CATEGORY' | 'SUPPLIER';

export type PriceStatus = 'ACTIVE' | 'MANUAL_OVERRIDE' | 'DISABLED' | 'FUTURE';

export type NotificationPreference = 'ALL' | 'PREORDER' | 'RELEASE';

export type NotificationType = 'PRICE_MOVEMENT' | 'UPCOMING_RELEASE' | 'WISHLIST_AVAILABILITY' | 'COLLECTION_UPDATES' | 'BUYLIST_UPDATES';

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'IN_APP';

export type MarketTrend = 'UP' | 'DOWN' | 'FLAT' | 'VOLATILE';

export type PriceHistoryPoint = {
  label: string;
  valueMinor: number;
  recordedAt: string;
  source: string;
};

export type MarketSnapshot = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  currentEstimateMinor: number;
  yesterdayMinor: number;
  sevenDayMinor: number;
  thirtyDayMinor: number;
  trend: MarketTrend;
  confidenceScore: number;
  lastUpdatedAt: string;
  source: string;
  currency: CurrencyCode;
  history: PriceHistoryPoint[];
};

export type WatchlistSubjectType = 'PRODUCT' | 'RELEASE' | 'COLLECTION_ITEM';

export type WatchlistItem = {
  id: string;
  subjectType: WatchlistSubjectType;
  subjectKey: string;
  subjectLabel: string;
  productId: string | null;
  releaseId: string | null;
  collectionItemId: string | null;
  currentEstimateMinor: number;
  yesterdayMinor: number;
  sevenDayMinor: number;
  thirtyDayMinor: number;
  trend: MarketTrend;
  notificationType: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  note: string | null;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationCenterPreference = {
  id: string;
  notificationType: NotificationType;
  subjectType: WatchlistSubjectType | null;
  subjectLabel: string | null;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectionInsightSnapshot = {
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
  createdAt: string;
  updatedAt: string;
};

export type CollectionInsightCard = {
  id: string;
  name: string;
  slug: string;
  game: string;
  categoryName: string;
  estimateMinor: number;
  trend: MarketTrend;
  lastUpdatedAt: string;
};

export type CollectionInsights = CollectionInsightSnapshot & {
  mostValuableCards: CollectionInsightCard[];
  biggestGainers: CollectionInsightCard[];
  biggestDecliners: CollectionInsightCard[];
  recentMarketActivity: CollectionInsightCard[];
  wishlistOverlap: Array<{ id: string; productName: string; productSlug: string; estimateMinor: number; trend: MarketTrend }>;
  deckCompletionPercent: number;
  collectionHeatMap: Array<{ label: string; count: number }>;
  valueTrendPercent: number;
};

export type BuylistStatus = 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

export type PricingSnapshot = {
  costMinor: number;
  retailMinor: number;
  buyMinor: number;
  marginMinor: number;
  markupPercent: number;
  profitMinor: number;
  minimumMarginPercent: number;
  maximumDiscountPercent: number;
  priceSource: string;
  priceStatus: PriceStatus;
  manualOverride: boolean;
  updatedAt: string;
};

export type BuylistSummary = {
  id: string;
  buylistNumber: string;
  status: BuylistStatus;
  currency: CurrencyCode;
  estimatedPayoutMinor: number;
  offeredPayoutMinor: number;
  itemCount: number;
  createdAt: string;
};

export type CollectionPrintVariant = 'REGULAR' | 'REVERSE_HOLO' | 'HOLO' | 'PROMO' | 'FIRST_EDITION' | 'FOIL';

export type CollectionItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  game: string;
  categoryName: string;
  setName: string | null;
  ownedQuantity: number;
  printVariant: CollectionPrintVariant;
  condition: ProductCondition;
  foil: boolean;
  language: string;
  notes: string | null;
  dateAcquired: string | null;
  purchasePriceMinor: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectionSummary = {
  id: string;
  itemCount: number;
  cardsOwned: number;
  setsRepresented: number;
  productsRepresented: number;
  favouriteGame: string;
  recentAdditions: CollectionItem[];
};

export type CollectionDashboard = {
  summary: CollectionSummary;
  largestSets: Array<{ label: string; cardsOwned: number }>;
  wishlistOverlap: CollectionItem[];
  missingCards: Array<{ id: string; name: string; slug: string; game: string; categoryName: string }>;
  recentlyViewed: Array<{ id: string; name: string; slug: string; game: string; categoryName: string }>;
  deckCount: number;
  collectionCount: number;
};

export type DeckVisibility = 'PRIVATE' | 'PUBLIC';

export type DeckCard = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  game: string;
  categoryName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type DeckSummary = {
  id: string;
  name: string;
  slug: string;
  game: string;
  visibility: DeckVisibility;
  imageLabel: string;
  cardCount: number;
  uniqueCards: number;
  maxCards: number;
  maxCopiesPerCard: number;
  updatedAt: string;
};

export type DeckStats = {
  cardCount: number;
  uniqueCards: number;
  typeBreakdown: Array<{ label: string; count: number }>;
  categoryBreakdown: Array<{ label: string; count: number }>;
  curveBreakdown: Array<{ label: string; count: number }>;
  averageCostMinor: number;
  warnings: string[];
  completionPercent: number;
  missingCardsFromCollection: Array<{ productId: string; productName: string; missingQuantity: number }>;
};

export type DeckDetail = DeckSummary & {
  notes: string | null;
  cards: DeckCard[];
  stats: DeckStats;
};

export type ReleaseProduct = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  game: string;
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
  supplierName: string;
  imageLabel: string;
};

export type ReleaseSummary = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  game: string;
  categorySlug: string;
  categoryName: string;
  releaseDate: string;
  expectedDispatchAt: string | null;
  expectedArrivalAt: string | null;
  announcementText: string | null;
  releaseNotes: string | null;
  visible: boolean;
  featuredOnHomepage: boolean;
  supplierName: string;
  productCount: number;
  preorderProductCount: number;
  comingSoonProductCount: number;
  lowAllocationCount: number;
  products: ReleaseProduct[];
};

export type ReleaseCalendarEntry = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  game: string;
  categorySlug: string;
  categoryName: string;
  releaseDate: string;
  expectedDispatchAt: string | null;
  expectedArrivalAt: string | null;
  announcementText: string | null;
  featuredOnHomepage: boolean;
  visible: boolean;
  productCount: number;
  releaseStatusCounts: Record<ProductReleaseStatus, number>;
  products: ReleaseProduct[];
};

export type NotificationSubscription = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  preference: NotificationPreference;
  createdAt: string;
  updatedAt: string;
};
