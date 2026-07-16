import type { ProductCondition } from '@tcg-hobby/types';

export type FieldErrors = Record<string, string>;

export type ProductFormValues = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  game: string;
  setName: string;
  description: string;
  longDescription: string;
  condition: string;
  categoryId: string;
  supplierId: string;
  priceMinor: string;
  costMinor: string;
  stockOnHand: string;
  reservedStock: string;
  reorderPoint: string;
  locationCode: string;
  imageLabel: string;
  primaryImageUrl: string;
  galleryImageUrl: string;
  customerPurchaseLimit: string;
  availabilityMessage: string;
  featured: boolean;
  published: boolean;
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

export const emptyProductFormValues: ProductFormValues = {
  productId: '',
  name: '',
  slug: '',
  sku: '',
  game: '',
  setName: '',
  description: '',
  longDescription: '',
  condition: 'SEALED',
  categoryId: '',
  supplierId: '',
  priceMinor: '',
  costMinor: '',
  stockOnHand: '0',
  reservedStock: '0',
  reorderPoint: '0',
  locationCode: 'MAIN',
  imageLabel: '',
  primaryImageUrl: '',
  galleryImageUrl: '',
  customerPurchaseLimit: '',
  availabilityMessage: '',
  featured: false,
  published: true,
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
    game: getString(formData, 'game'),
    setName: getString(formData, 'setName'),
    description: getString(formData, 'description'),
    longDescription: getString(formData, 'longDescription'),
    condition: getString(formData, 'condition', 'SEALED'),
    categoryId: getString(formData, 'categoryId'),
    supplierId: getString(formData, 'supplierId'),
    priceMinor: getString(formData, 'priceMinor'),
    costMinor: getString(formData, 'costMinor'),
    stockOnHand: getString(formData, 'stockOnHand', '0'),
    reservedStock: getString(formData, 'reservedStock', '0'),
    reorderPoint: getString(formData, 'reorderPoint', '0'),
    locationCode: getString(formData, 'locationCode', 'MAIN'),
    imageLabel: getString(formData, 'imageLabel'),
    primaryImageUrl: getString(formData, 'primaryImageUrl'),
    galleryImageUrl: getString(formData, 'galleryImageUrl'),
    customerPurchaseLimit: getString(formData, 'customerPurchaseLimit'),
    availabilityMessage: getString(formData, 'availabilityMessage'),
    featured: getBoolean(formData, 'featured'),
    published: getBoolean(formData, 'published', true),
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
