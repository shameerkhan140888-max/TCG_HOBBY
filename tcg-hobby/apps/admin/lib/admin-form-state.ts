import type { ProductCondition } from '@tcg-hobby/types';
import type { ProductCsvImportPlan, ProductCsvImportResult } from '@tcg-hobby/database';

export type FieldErrors = Record<string, string>;

export type ProductFormValues = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  brand: string;
  game: string;
  setName: string;
  productType: string;
  language: string;
  description: string;
  longDescription: string;
  condition: string;
  categoryId: string;
  supplierId: string;
  priceMinor: string;
  rrpMinor: string;
  salePriceMinor: string;
  saleStartsAt: string;
  saleEndsAt: string;
  vatRate: string;
  costMinor: string;
  landedCostMinor: string;
  supplierSku: string;
  supplierProductUrl: string;
  minimumOrderQuantity: string;
  packQuantity: string;
  supplierLeadTimeDays: string;
  stockOnHand: string;
  reservedStock: string;
  availableStock: string;
  reorderPoint: string;
  reorderQuantity: string;
  incomingQuantity: string;
  locationCode: string;
  imageLabel: string;
  primaryImageUrl: string;
  primaryImageAlt: string;
  galleryImagesText: string;
  customerPurchaseLimit: string;
  availabilityMessage: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  noindex: boolean;
  featured: boolean;
  published: boolean;
  hideWhenOutOfStock: boolean;
};

export type ProductFormState = {
  fieldErrors: FieldErrors;
  formError?: string;
  values: ProductFormValues;
};

export type SupplierFormValues = {
  supplierId: string;
  name: string;
  slug: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  active: boolean;
  preferred: boolean;
  internalNotes: string;
};

export type SupplierFormState = {
  fieldErrors: FieldErrors;
  formError?: string;
  values: SupplierFormValues;
};

export type StockAdjustmentFormValues = {
  productId: string;
  delta: string;
  reason: string;
  performedBy: string;
};

export type StockAdjustmentFormState = {
  fieldErrors: FieldErrors;
  formError?: string;
  values: StockAdjustmentFormValues;
};

export type ProductCsvImportFormState = {
  fieldErrors: FieldErrors;
  formError?: string;
  formSuccess?: string;
  csvText: string;
  plan?: ProductCsvImportPlan;
  result?: ProductCsvImportResult;
};

export const emptyProductFormValues: ProductFormValues = {
  productId: '',
  name: '',
  slug: '',
  sku: '',
  barcode: '',
  brand: '',
  game: '',
  setName: '',
  productType: '',
  language: '',
  description: '',
  longDescription: '',
  condition: 'SEALED',
  categoryId: '',
  supplierId: '',
  priceMinor: '',
  rrpMinor: '',
  salePriceMinor: '',
  saleStartsAt: '',
  saleEndsAt: '',
  vatRate: '20',
  costMinor: '',
  landedCostMinor: '',
  supplierSku: '',
  supplierProductUrl: '',
  minimumOrderQuantity: '1',
  packQuantity: '',
  supplierLeadTimeDays: '7',
  stockOnHand: '0',
  reservedStock: '0',
  availableStock: '0',
  reorderPoint: '0',
  reorderQuantity: '0',
  incomingQuantity: '0',
  locationCode: 'MAIN',
  imageLabel: '',
  primaryImageUrl: '',
  primaryImageAlt: '',
  galleryImagesText: '',
  customerPurchaseLimit: '',
  availabilityMessage: '',
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogImageUrl: '',
  noindex: false,
  featured: false,
  published: true,
  hideWhenOutOfStock: false,
};

export const emptySupplierFormValues: SupplierFormValues = {
  supplierId: '',
  name: '',
  slug: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'GB',
  active: true,
  preferred: false,
  internalNotes: '',
};

export const emptyStockAdjustmentFormValues: StockAdjustmentFormValues = {
  productId: '',
  delta: '0',
  reason: '',
  performedBy: 'Operations Desk',
};

export const emptyProductCsvImportFormState: ProductCsvImportFormState = {
  fieldErrors: {},
  csvText: '',
};

export function getString(formData: FormData, name: string, fallback = '') {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : fallback;
}

export function getBoolean(formData: FormData, name: string, fallback = false) {
  const value = formData.get(name);
  if (typeof value !== 'string') {
    return fallback;
  }

  return value === 'true' || value === 'on' || value === '1';
}

export function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function buildProductValues(formData: FormData): ProductFormValues {
  return {
    productId: getString(formData, 'productId'),
    name: getString(formData, 'name'),
    slug: getString(formData, 'slug'),
    sku: getString(formData, 'sku'),
    barcode: getString(formData, 'barcode'),
    brand: getString(formData, 'brand'),
    game: getString(formData, 'game'),
    setName: getString(formData, 'setName'),
    productType: getString(formData, 'productType'),
    language: getString(formData, 'language'),
    description: getString(formData, 'description'),
    longDescription: getString(formData, 'longDescription'),
    condition: getString(formData, 'condition', 'SEALED'),
    categoryId: getString(formData, 'categoryId'),
    supplierId: getString(formData, 'supplierId'),
    priceMinor: getString(formData, 'priceMinor'),
    rrpMinor: getString(formData, 'rrpMinor'),
    salePriceMinor: getString(formData, 'salePriceMinor'),
    saleStartsAt: getString(formData, 'saleStartsAt'),
    saleEndsAt: getString(formData, 'saleEndsAt'),
    vatRate: getString(formData, 'vatRate', '20'),
    costMinor: getString(formData, 'costMinor'),
    landedCostMinor: getString(formData, 'landedCostMinor'),
    supplierSku: getString(formData, 'supplierSku'),
    supplierProductUrl: getString(formData, 'supplierProductUrl'),
    minimumOrderQuantity: getString(formData, 'minimumOrderQuantity', '1'),
    packQuantity: getString(formData, 'packQuantity'),
    supplierLeadTimeDays: getString(formData, 'supplierLeadTimeDays', '7'),
    stockOnHand: getString(formData, 'stockOnHand', '0'),
    reservedStock: getString(formData, 'reservedStock', '0'),
    availableStock: getString(formData, 'availableStock', '0'),
    reorderPoint: getString(formData, 'reorderPoint', '0'),
    reorderQuantity: getString(formData, 'reorderQuantity', '0'),
    incomingQuantity: getString(formData, 'incomingQuantity', '0'),
    locationCode: getString(formData, 'locationCode', 'MAIN'),
    imageLabel: getString(formData, 'imageLabel'),
    primaryImageUrl: getString(formData, 'primaryImageUrl'),
    primaryImageAlt: getString(formData, 'primaryImageAlt'),
    galleryImagesText: getString(formData, 'galleryImagesText'),
    customerPurchaseLimit: getString(formData, 'customerPurchaseLimit'),
    availabilityMessage: getString(formData, 'availabilityMessage'),
    seoTitle: getString(formData, 'seoTitle'),
    metaDescription: getString(formData, 'metaDescription'),
    canonicalUrl: getString(formData, 'canonicalUrl'),
    ogImageUrl: getString(formData, 'ogImageUrl'),
    noindex: getBoolean(formData, 'noindex'),
    featured: getBoolean(formData, 'featured'),
    published: getBoolean(formData, 'published', true),
    hideWhenOutOfStock: getBoolean(formData, 'hideWhenOutOfStock'),
  };
}

export function buildSupplierValues(formData: FormData): SupplierFormValues {
  return {
    supplierId: getString(formData, 'supplierId'),
    name: getString(formData, 'name'),
    slug: getString(formData, 'slug'),
    contactName: getString(formData, 'contactName'),
    email: getString(formData, 'email'),
    phone: getString(formData, 'phone'),
    website: getString(formData, 'website'),
    addressLine1: getString(formData, 'addressLine1'),
    addressLine2: getString(formData, 'addressLine2'),
    city: getString(formData, 'city'),
    region: getString(formData, 'region'),
    postalCode: getString(formData, 'postalCode'),
    country: getString(formData, 'country', 'GB'),
    active: getBoolean(formData, 'active', true),
    preferred: getBoolean(formData, 'preferred'),
    internalNotes: getString(formData, 'internalNotes'),
  };
}

export function buildStockAdjustmentValues(formData: FormData): StockAdjustmentFormValues {
  return {
    productId: getString(formData, 'productId'),
    delta: getString(formData, 'delta'),
    reason: getString(formData, 'reason'),
    performedBy: getString(formData, 'performedBy', 'Operations Desk'),
  };
}

export type AdminFormCondition = ProductCondition | string;
