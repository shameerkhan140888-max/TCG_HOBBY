export type IronSprueProduct = {
  line?: number;
  storeCode?: 'IRON_SPRUE';
  sku: string;
  supplierSku?: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  productType: string;
  orderQuantity?: number;
  priceMinor?: number;
  retailPriceMinor?: number;
  compareAtPriceMinor?: number | null;
  vatRate?: number;
  tradePriceExVatMinor?: number;
  tradePriceIncVatMinor?: number;
  stockQuantity: number;
  reservedQuantity?: number;
  shortDescription: string;
  description?: string;
  imageUrl?: string;
  imageReferences?: string[];
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
  published?: boolean;
};

export const launchCatalogueStatus = {
  source: 'Iron Sprue purchase order',
  availableInRepository: true,
  genuineSkuCount: 67,
  stockUnits: 183,
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
  { brand: 'Tasma', title: 'Bench tools and abrasives', href: '/shop?brand=Tasma' },
] as const;

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
