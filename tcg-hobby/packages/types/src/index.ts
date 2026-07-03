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
};

export type CatalogueProductDetail = CatalogueProduct & {
  sku: string;
  setName: string | null;
  condition: ProductCondition;
  longDescription: string;
  searchText: string;
  supplierSku: string;
  leadTimeDays: number;
  relatedProductIds: string[];
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  game: string;
  price: Money;
  inStock: boolean;
};

export type ApiHealth = {
  status: 'ok';
  service: 'tcg-hobby-api';
};
