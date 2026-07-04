'use server';

import { redirect } from 'next/navigation';
import {
  adjustProductStock,
  archiveAdminProduct,
  createAdminProduct,
  createAdminSupplier,
  setProductPublication,
  updateAdminProduct,
  updateAdminSupplier,
} from '@tcg-hobby/database';
import {
  buildProductValues,
  buildStockAdjustmentValues,
  buildSupplierValues,
  type FieldErrors,
  type ProductFormState,
  type StockAdjustmentFormState,
  type SupplierFormState,
} from './admin-form-state';

export async function saveProductAction(_state: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const values = buildProductValues(formData);
  const fieldErrors: FieldErrors = {};

  if (!values.name) fieldErrors.name = 'Enter a product name.';
  if (!values.sku) fieldErrors.sku = 'Enter a SKU.';
  if (!values.game) fieldErrors.game = 'Enter the game or brand.';
  if (!values.description) fieldErrors.description = 'Enter a short description.';
  if (!values.longDescription) fieldErrors.longDescription = 'Enter a detailed description.';
  if (!values.categoryId) fieldErrors.categoryId = 'Choose a category.';
  if (!values.supplierId) fieldErrors.supplierId = 'Choose a supplier.';
  if (!values.priceMinor || Number.isNaN(Number.parseInt(values.priceMinor, 10)) || Number.parseInt(values.priceMinor, 10) < 0) {
    fieldErrors.priceMinor = 'Enter a valid price in pence.';
  }
  if (!values.costMinor || Number.isNaN(Number.parseInt(values.costMinor, 10)) || Number.parseInt(values.costMinor, 10) < 0) {
    fieldErrors.costMinor = 'Enter a valid cost in pence.';
  }
  if (Number.isNaN(Number.parseInt(values.stockOnHand, 10)) || Number.parseInt(values.stockOnHand, 10) < 0) fieldErrors.stockOnHand = 'Enter current stock in whole units.';
  if (Number.isNaN(Number.parseInt(values.reservedStock, 10)) || Number.parseInt(values.reservedStock, 10) < 0) fieldErrors.reservedStock = 'Enter reserved stock in whole units.';
  if (Number.isNaN(Number.parseInt(values.reorderPoint, 10)) || Number.parseInt(values.reorderPoint, 10) < 0) fieldErrors.reorderPoint = 'Enter a reorder point.';

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, values };
  }

  const input: Parameters<typeof createAdminProduct>[0] = {
    name: values.name,
    sku: values.sku,
    game: values.game,
    description: values.description,
    longDescription: values.longDescription,
    condition: values.condition,
    categoryId: values.categoryId,
    supplierId: values.supplierId,
    priceMinor: Number.parseInt(values.priceMinor, 10),
    costMinor: Number.parseInt(values.costMinor, 10),
    stockOnHand: Number.parseInt(values.stockOnHand, 10),
    reservedStock: Number.parseInt(values.reservedStock, 10),
    reorderPoint: Number.parseInt(values.reorderPoint, 10),
    locationCode: values.locationCode || 'MAIN',
    imageLabel: values.imageLabel || values.name,
    featured: values.featured,
    published: values.published,
  };

  if (values.slug) input.slug = values.slug;
  if (values.setName) input.setName = values.setName;
  if (values.primaryImageUrl) input.primaryImageUrl = values.primaryImageUrl;
  if (values.galleryImageUrl) input.galleryImageUrl = values.galleryImageUrl;

  try {
    const saved = values.productId ? await updateAdminProduct(values.productId, input) : await createAdminProduct(input);

    if (!saved) {
      return {
        fieldErrors: {},
        formError: 'The product could not be saved.',
        values,
      };
    }

    redirect(`/admin/products/${saved.id}`);
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to save product.',
      values,
    };
  }
}

export async function archiveProductAction(formData: FormData) {
  const productId = formData.get('productId');
  if (typeof productId !== 'string' || !productId) {
    redirect('/admin/products');
  }

  await archiveAdminProduct(productId);
  redirect(`/admin/products/${productId}`);
}

export async function toggleProductPublicationAction(formData: FormData) {
  const productId = formData.get('productId');
  const publishedValue = formData.get('published');
  const published = typeof publishedValue === 'string' ? publishedValue === 'true' || publishedValue === 'on' || publishedValue === '1' : true;

  if (typeof productId !== 'string' || !productId) {
    redirect('/admin/products');
  }

  await setProductPublication(productId, published);
  redirect(`/admin/products/${productId}`);
}

export async function saveSupplierAction(_state: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  const values = buildSupplierValues(formData);
  const fieldErrors: FieldErrors = {};

  if (!values.name) fieldErrors.name = 'Enter a supplier name.';

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, values };
  }

  const input: Parameters<typeof createAdminSupplier>[0] = {
    name: values.name,
    country: values.country,
    active: values.active,
    preferred: values.preferred,
  };

  if (values.slug) input.slug = values.slug;
  if (values.contactName) input.contactName = values.contactName;
  if (values.email) input.email = values.email;
  if (values.phone) input.phone = values.phone;
  if (values.website) input.website = values.website;
  if (values.addressLine1) input.addressLine1 = values.addressLine1;
  if (values.addressLine2) input.addressLine2 = values.addressLine2;
  if (values.city) input.city = values.city;
  if (values.region) input.region = values.region;
  if (values.postalCode) input.postalCode = values.postalCode;
  if (values.internalNotes) input.internalNotes = values.internalNotes;

  try {
    const saved = values.supplierId ? await updateAdminSupplier(values.supplierId, input) : await createAdminSupplier(input);

    if (!saved) {
      return {
        fieldErrors: {},
        formError: 'The supplier could not be saved.',
        values,
      };
    }

    redirect(`/admin/suppliers/${saved.id}`);
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to save supplier.',
      values,
    };
  }
}

export async function adjustStockAction(_state: StockAdjustmentFormState, formData: FormData): Promise<StockAdjustmentFormState> {
  const values = buildStockAdjustmentValues(formData);
  const fieldErrors: FieldErrors = {};

  if (!values.productId) fieldErrors.productId = 'Choose a product.';
  if (!values.reason) fieldErrors.reason = 'Enter a reason for the adjustment.';
  if (!values.delta || Number.isNaN(Number.parseInt(values.delta, 10)) || Number.parseInt(values.delta, 10) === 0) {
    fieldErrors.delta = 'Enter a non-zero whole number adjustment.';
  }

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, values };
  }

  try {
    await adjustProductStock(values.productId, Number.parseInt(values.delta, 10), values.reason, values.performedBy);
    redirect('/admin/inventory');
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to adjust stock.',
      values,
    };
  }
}
