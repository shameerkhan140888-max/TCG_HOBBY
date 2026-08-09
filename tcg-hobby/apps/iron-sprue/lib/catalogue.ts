export type IronSprueProduct = {
  line?: number;
  sourceRow?: number;
  storeCode?: 'IRON_SPRUE' | 'TCG_HOBBY';
  sku: string;
  supplierSku?: string;
  manufacturerReference?: string;
  barcode?: string;
  slug: string;
  name: string;
  sourceTitle?: string;
  customerTitle?: string;
  brand: string;
  category: string;
  productType: string;
  orderQuantity?: number;
  expectedQuantity?: number;
  receivedQuantity?: number;
  missingQuantity?: number;
  damagedQuantity?: number;
  availableQuantity?: number;
  priceMinor?: number;
  retailPriceMinor?: number;
  compareAtPriceMinor?: number | null;
  vatRate?: number;
  tradePriceExVatMinor?: number;
  tradePriceIncVatMinor?: number;
  invoiceUnitCostExVatMinor?: number;
  supplierUnitCostMinor?: number;
  sellingPriceExVatMinor?: number;
  grossProfitUnitMinor?: number;
  grossMarginPercent?: number;
  belowMarginThreshold?: boolean;
  totalStockCostExVatMinor?: number;
  projectedRevenueIncVatMinor?: number;
  projectedGrossProfitExVatMinor?: number;
  stockQuantity: number;
  reservedQuantity?: number;
  shortDescription: string;
  description?: string;
  features?: string[];
  specifications?: Record<string, unknown>;
  seoTitle?: string;
  metaDescription?: string;
  searchKeywords?: string[];
  imageUrl?: string;
  imageReferences?: string[];
  sourceMediaLinks?: Array<{
    url: string;
    sourceType: string;
    permissionBasis: string;
  }>;
  scale?: string;
  skillLevel?: string;
  assemblyRequired?: string;
  glueRequired?: boolean;
  paintRequired?: boolean;
  launchRole?: string;
  merchandisingRole?: string;
  reorderLevel?: number;
  benchmarkRetailer?: string | null;
  benchmarkUrl?: string | null;
  supplierAssetReference?: string | null;
  assetContentStatus?: string | null;
  purchaseNotes?: string | null;
  validationWarnings?: string[];
  publicationState?: string;
  published?: boolean;
};

export const launchCatalogueStatus = {
  source: 'Iron Sprue updated sales prices and margins workbook',
  availableInRepository: true,
  genuineSkuCount: 81,
  stockUnits: 256,
  blocker: null,
} as const;

export const featuredWorkshopInterests = [
  {
    title: 'Architectural builds',
    description: 'Clean bench projects with display-ready structure and patient assembly.',
    href: '/shop?category=architectural-models',
  },
  {
    title: 'Japanese model kits',
    description: 'Curated kits for builders who care about fit, finish and shelf presence.',
    href: '/shop?brand=Aoshima',
  },
  {
    title: '3D puzzles and vases',
    description: 'Precision-fit display pieces for giftable and weekend builds.',
    href: '/shop?brand=Pintoo',
  },
  {
    title: 'Workshop essentials',
    description: 'Tools and add-ons selected for reliable first-pass assembly.',
    href: '/shop?category=workshop-essentials',
  },
] as const;

export const sampleRangeCards = [
  { brand: 'Aoshima', title: 'Scale kits', href: '/shop?brand=Aoshima' },
  { brand: 'CubicFun', title: 'Architecture models', href: '/shop?brand=CubicFun' },
  { brand: 'Pintoo', title: '3D puzzle objects', href: '/shop?brand=Pintoo' },
  { brand: 'Deluxe Materials', title: 'Adhesives and finishing', href: '/shop?brand=Deluxe%20Materials' },
  { brand: 'Expo Tools', title: 'Bench tools and abrasives', href: '/shop?brand=Expo%20Tools' },
] as const;

export type IronSprueBrandRecord = {
  name: string;
  slug: string;
  href: string;
  productCount: number;
  displayOrder: number;
  active: boolean;
  approvalStatus: 'TEXT_APPROVED' | 'LOGO_APPROVED' | 'NEEDS_REVIEW';
  logoUrl?: string;
  altText: string;
};

const launchBrandOrder = new Map([
  ['Aoshima', 10],
  ['CubicFun', 20],
  ['Deluxe Materials', 30],
  ['Expo Tools', 40],
  ['OcCre Creations', 50],
  ['Pintoo', 60],
  ['Tasma', 70],
]);

export function brandSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function deriveBrandsWeStock(products: IronSprueProduct[]): IronSprueBrandRecord[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (product.storeCode !== 'IRON_SPRUE') continue;
    if (product.published === false) continue;
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, productCount]) => productCount > 0)
    .map(([name, productCount]) => ({
      name,
      slug: brandSlug(name),
      href: `/shop?brand=${encodeURIComponent(name)}`,
      productCount,
      displayOrder: launchBrandOrder.get(name) ?? 999,
      active: true,
      approvalStatus: 'TEXT_APPROVED' as const,
      altText: name,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function productPriceMinor(product: IronSprueProduct) {
  return product.retailPriceMinor ?? product.priceMinor ?? 0;
}

export function filterIronSprueProducts(products: IronSprueProduct[], query: { brand?: string | undefined; category?: string | undefined; search?: string | undefined }) {
  const brand = query.brand?.trim().toLowerCase();
  const category = query.category?.trim().toLowerCase();
  const search = query.search?.trim().toLowerCase();

  return products.filter((product) => {
    if (brand && product.brand.toLowerCase() !== brand) return false;
    if (category && product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') !== category) return false;
    if (search) {
      const haystack = `${product.name} ${product.brand} ${product.category} ${product.productType}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
