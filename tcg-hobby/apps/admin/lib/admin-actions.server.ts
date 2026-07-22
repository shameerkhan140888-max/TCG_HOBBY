'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  adjustProductStock,
  archiveAdminProduct,
  createAdminProduct,
  createAdminProductRecommendation,
  createAdminSupplier,
  createCatalogueMasterDataRecord,
  createProductCsvImportPlan,
  deleteAdminProductRecommendation,
  executeProductCsvImport,
  setProductPublication,
  setCatalogueMasterDataActive,
  updateAdminProduct,
  updateAdminProductRecommendation,
  updateCatalogueMasterDataRecord,
  updateAdminSupplier,
  updateProductMerchandisingSettings,
  ProductRecommendationType,
  type CatalogueMasterDataKind,
} from '@tcg-hobby/database';
import {
  buildProductValues,
  buildStockAdjustmentValues,
  buildSupplierValues,
  type FieldErrors,
  type ProductFormState,
  type ProductCsvImportFormState,
  type StockAdjustmentFormState,
  type SupplierFormState,
} from './admin-form-state';
import { requireAdminRole, requireAdminSession } from './auth.server';

const RECOMMENDATION_TYPES = Object.values(ProductRecommendationType);

function asString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on' || value === '1';
}

function parseWholeNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && String(parsed) === value.trim() ? parsed : null;
}

function parseOptionalWholeNumber(value: string): number | null {
  if (!value.trim()) return null;
  return parseWholeNumber(value);
}

function parseOptionalDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validateManagedUrl(value: string) {
  if (!value.trim()) return true;
  if (value.startsWith('/')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

type ParsedGalleryImage = {
  url: string;
  altText: string;
  imageType: string;
  lineNumber: number;
};

function parseGalleryImages(value: string): ParsedGalleryImage[] {
  return value
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((item) => item.line)
    .map(({ line, lineNumber }) => {
      const [url = '', altText = '', imageType = 'gallery'] = line.split('|').map((part) => part.trim());
      return { url, altText, imageType: imageType || 'gallery', lineNumber };
    });
}

function parseRecommendationType(value: string): ProductRecommendationType | null {
  return RECOMMENDATION_TYPES.includes(value as ProductRecommendationType) ? (value as ProductRecommendationType) : null;
}

function redirectToProductMerchandising(productId: string, status: 'saved' | 'created' | 'updated' | 'deleted' | 'error', message?: string): never {
  const params = new URLSearchParams({ merchandisingStatus: status });
  if (message) {
    params.set('merchandisingMessage', message);
  }
  redirect(`/admin/products/${productId}?${params.toString()}#merchandising`);
}

function revalidateMerchandising(productId: string, productSlug?: string): void {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  if (productSlug) {
    revalidatePath(`/catalogue/${productSlug}`);
  }
}

function revalidateProductVisibility(productId: string, productSlug?: string): void {
  revalidatePath('/catalogue');
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/');
  if (productSlug) {
    revalidatePath(`/catalogue/${productSlug}`);
  }
}

export async function saveProductAction(_state: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdminSession();
  const values = buildProductValues(formData);
  const fieldErrors: FieldErrors = {};

  if (!values.name) fieldErrors.name = 'Enter a product name.';
  if (!values.sku) fieldErrors.sku = 'Enter a SKU.';
  if (!values.gameId) fieldErrors.gameId = 'Choose a game.';
  if (!values.productTypeId) fieldErrors.productTypeId = 'Choose a product type.';
  if (!values.languageId) fieldErrors.languageId = 'Choose a language.';
  if (!values.description) fieldErrors.description = 'Enter a short description.';
  if (!values.longDescription) fieldErrors.longDescription = 'Enter a detailed description.';
  if (!values.categoryId) fieldErrors.categoryId = 'Choose a category.';
  if (!values.supplierId) fieldErrors.supplierId = 'Choose a supplier.';
  const priceMinor = parseWholeNumber(values.priceMinor);
  const rrpMinor = parseOptionalWholeNumber(values.rrpMinor);
  const salePriceMinor = parseOptionalWholeNumber(values.salePriceMinor);
  const vatRate = parseWholeNumber(values.vatRate);
  const costMinor = parseWholeNumber(values.costMinor);
  const landedCostMinor = parseOptionalWholeNumber(values.landedCostMinor);
  const stockOnHand = parseWholeNumber(values.stockOnHand);
  const reorderPoint = parseWholeNumber(values.reorderPoint);
  const reorderQuantity = parseWholeNumber(values.reorderQuantity);
  const incomingQuantity = parseWholeNumber(values.incomingQuantity);
  const customerPurchaseLimit = parseOptionalWholeNumber(values.customerPurchaseLimit);
  const minimumOrderQuantity = parseWholeNumber(values.minimumOrderQuantity);
  const packQuantity = parseOptionalWholeNumber(values.packQuantity);
  const supplierLeadTimeDays = parseWholeNumber(values.supplierLeadTimeDays);
  const saleStartsAt = parseOptionalDate(values.saleStartsAt);
  const saleEndsAt = parseOptionalDate(values.saleEndsAt);
  const galleryImages = parseGalleryImages(values.galleryImagesText);

  if (priceMinor === null || priceMinor < 0) {
    fieldErrors.priceMinor = 'Enter a valid price in pence.';
  }
  if (rrpMinor !== null && rrpMinor < 0) fieldErrors.rrpMinor = 'Enter a valid RRP in pence, or leave it blank.';
  if (salePriceMinor !== null && salePriceMinor < 0) fieldErrors.salePriceMinor = 'Enter a valid sale price in pence, or leave it blank.';
  if (vatRate === null || vatRate < 0 || vatRate > 100) fieldErrors.vatRate = 'Enter a VAT rate between 0 and 100.';
  if (costMinor === null || costMinor < 0) {
    fieldErrors.costMinor = 'Enter a valid cost in pence.';
  }
  if (landedCostMinor !== null && landedCostMinor < 0) fieldErrors.landedCostMinor = 'Enter a valid landed cost in pence, or leave it blank.';
  if (stockOnHand === null || stockOnHand < 0) fieldErrors.stockOnHand = 'Enter current stock in whole units.';
  if (reorderPoint === null || reorderPoint < 0) fieldErrors.reorderPoint = 'Enter a reorder point.';
  if (reorderQuantity === null || reorderQuantity < 0) fieldErrors.reorderQuantity = 'Enter a reorder quantity.';
  if (incomingQuantity === null || incomingQuantity < 0) fieldErrors.incomingQuantity = 'Enter incoming stock in whole units.';
  if (customerPurchaseLimit !== null && customerPurchaseLimit < 1) {
    fieldErrors.customerPurchaseLimit = 'Enter a purchase limit of at least 1, or leave it blank.';
  }
  if (minimumOrderQuantity === null || minimumOrderQuantity < 1) fieldErrors.minimumOrderQuantity = 'Enter a minimum order quantity of at least 1.';
  if (packQuantity !== null && packQuantity < 1) fieldErrors.packQuantity = 'Enter a pack quantity of at least 1, or leave it blank.';
  if (supplierLeadTimeDays === null || supplierLeadTimeDays < 0) fieldErrors.supplierLeadTimeDays = 'Enter a supplier lead time of zero days or more.';
  if (values.saleStartsAt && !saleStartsAt) fieldErrors.saleStartsAt = 'Enter a valid sale start date.';
  if (values.saleEndsAt && !saleEndsAt) fieldErrors.saleEndsAt = 'Enter a valid sale end date.';
  if (saleStartsAt && saleEndsAt && saleStartsAt >= saleEndsAt) fieldErrors.saleEndsAt = 'Sale end must be after the start date.';
  if (values.primaryImageUrl && !validateManagedUrl(values.primaryImageUrl)) fieldErrors.primaryImageUrl = 'Enter a relative path or a valid image URL.';
  if (values.primaryImageUrl && !values.primaryImageAlt) fieldErrors.primaryImageAlt = 'Enter meaningful alt text for the primary image.';
  if (values.ogImageUrl && !validateManagedUrl(values.ogImageUrl)) fieldErrors.ogImageUrl = 'Enter a relative path or a valid Open Graph image URL.';
  if (values.canonicalUrl && !validateManagedUrl(values.canonicalUrl)) fieldErrors.canonicalUrl = 'Enter a valid canonical URL.';
  if (values.supplierProductUrl && !validateManagedUrl(values.supplierProductUrl)) fieldErrors.supplierProductUrl = 'Enter a valid supplier product URL.';
  const invalidGalleryImage = galleryImages.find((image) => !image.url || !validateManagedUrl(image.url) || !image.altText);
  if (invalidGalleryImage) {
    fieldErrors.galleryImagesText = `Gallery image line ${invalidGalleryImage.lineNumber} must include a valid image URL and meaningful alt text.`;
  }

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, values };
  }

  const input: Parameters<typeof createAdminProduct>[0] = {
    name: values.name,
    sku: values.sku,
    barcode: values.barcode || null,
    brand: values.brand || null,
    game: values.gameId,
    productType: values.productType || null,
    language: values.language || null,
    gameId: values.gameId || null,
    brandId: values.brandId || null,
    productTypeId: values.productTypeId || null,
    languageId: values.languageId || null,
    setId: values.setId || null,
    description: values.description,
    longDescription: values.longDescription,
    condition: values.condition,
    categoryId: values.categoryId,
    supplierId: values.supplierId,
    priceMinor: priceMinor ?? 0,
    rrpMinor,
    salePriceMinor,
    saleStartsAt,
    saleEndsAt,
    vatRate: vatRate ?? 20,
    costMinor: costMinor ?? 0,
    landedCostMinor,
    supplierSku: values.supplierSku || values.sku,
    supplierProductUrl: values.supplierProductUrl || null,
    minimumOrderQuantity: minimumOrderQuantity ?? 1,
    packQuantity,
    supplierLeadTimeDays: supplierLeadTimeDays ?? 7,
    stockOnHand: stockOnHand ?? 0,
    reorderPoint: reorderPoint ?? 0,
    reorderQuantity: reorderQuantity ?? 0,
    incomingQuantity: incomingQuantity ?? 0,
    locationCode: values.locationCode || 'MAIN',
    imageLabel: values.imageLabel || values.name,
    featured: values.featured,
    published: values.published,
    hideWhenOutOfStock: values.hideWhenOutOfStock,
    customerPurchaseLimit,
    availabilityMessage: values.availabilityMessage,
    primaryImageAlt: values.primaryImageAlt || values.imageLabel || values.name,
    galleryImages: galleryImages.map(({ lineNumber: _lineNumber, ...image }) => image),
    seoTitle: values.seoTitle || null,
    metaDescription: values.metaDescription || null,
    canonicalUrl: values.canonicalUrl || null,
    ogImageUrl: values.ogImageUrl || null,
    noindex: values.noindex,
  };

  if (values.slug) input.slug = values.slug;
  if (values.setName) input.setName = values.setName;
  if (values.primaryImageUrl) input.primaryImageUrl = values.primaryImageUrl;

  let saved: Awaited<ReturnType<typeof createAdminProduct>>;

  try {
    saved = values.productId ? await updateAdminProduct(values.productId, input) : await createAdminProduct(input);

    if (!saved) {
      return {
        fieldErrors: {},
        formError: 'The product could not be saved.',
        values,
      };
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save product.';
    if (message.includes('SKU')) {
      return { fieldErrors: { sku: message }, formError: 'Product could not be saved. Review the highlighted fields below.', values };
    }
    if (message.includes('slug')) {
      return { fieldErrors: { slug: message }, formError: 'Product could not be saved. Review the highlighted fields below.', values };
    }
    if (message.includes('barcode')) {
      return { fieldErrors: { barcode: message }, formError: 'Product could not be saved. Review the highlighted fields below.', values };
    }
    return {
      fieldErrors: {},
      formError: message,
      values,
    };
  }

  revalidateProductVisibility(saved.id, saved.slug);
  redirect(`/admin/products/${saved.id}?productStatus=${values.productId ? 'updated' : 'created'}`);
}

function parseCatalogueKind(value: string): Exclude<CatalogueMasterDataKind, 'categories'> {
  if (value === 'games' || value === 'brands' || value === 'product-types' || value === 'languages' || value === 'sets') {
    return value;
  }
  throw new Error('Unsupported catalogue setting type.');
}

export async function previewProductCsvImportAction(
  _state: ProductCsvImportFormState,
  formData: FormData,
): Promise<ProductCsvImportFormState> {
  await requireAdminSession();
  const csvText = asString(formData.get('csvText'));
  if (!csvText.trim()) {
    return {
      fieldErrors: { csvText: 'Paste a product CSV before previewing.' },
      csvText,
    };
  }

  try {
    const plan = await createProductCsvImportPlan(csvText);
    return {
      fieldErrors: {},
      csvText,
      plan,
      formSuccess: plan.summary.errorRows
        ? `Preview complete. Fix ${plan.summary.errorRows} row error(s) before importing.`
        : `Preview complete. ${plan.summary.readyRows} row(s) ready to import.`,
    };
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to preview CSV import.',
      csvText,
    };
  }
}

export async function executeProductCsvImportAction(
  _state: ProductCsvImportFormState,
  formData: FormData,
): Promise<ProductCsvImportFormState> {
  await requireAdminSession();
  const csvText = asString(formData.get('csvText'));
  if (!csvText.trim()) {
    return {
      fieldErrors: { csvText: 'Paste a product CSV before importing.' },
      csvText,
    };
  }

  try {
    const result = await executeProductCsvImport(csvText, { performedBy: 'Admin CSV Import' });
    const plan = await createProductCsvImportPlan(csvText);
    revalidatePath('/admin/products');
    revalidatePath('/catalogue');
    revalidatePath('/');
    result.reportRows.forEach((row) => revalidatePath(`/catalogue/${row.slug}`));

    return {
      fieldErrors: {},
      csvText,
      plan,
      result,
      formSuccess: `Import complete. ${result.creates} product(s) created and ${result.updates} product(s) updated.`,
    };
  } catch (error) {
    return {
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Unable to import CSV.',
      csvText,
    };
  }
}

export async function productCsvImportAction(
  state: ProductCsvImportFormState,
  formData: FormData,
): Promise<ProductCsvImportFormState> {
  await requireAdminSession();
  return asString(formData.get('intent')) === 'import'
    ? executeProductCsvImportAction(state, formData)
    : previewProductCsvImportAction(state, formData);
}

export async function saveCatalogueMasterDataAction(formData: FormData): Promise<void> {
  await requireAdminRole();
  const kind = parseCatalogueKind(asString(formData.get('kind')));
  const id = asString(formData.get('id'));
  const name = asString(formData.get('name'));
  const slug = asString(formData.get('slug'));
  const code = asString(formData.get('code'));
  const group = asString(formData.get('group'));
  const website = asString(formData.get('website'));
  const gameId = asString(formData.get('gameId'));
  const sortOrder = parseOptionalWholeNumber(asString(formData.get('sortOrder'))) ?? 0;
  const active = asBoolean(formData.get('active'));
  const input = {
    name,
    slug,
    code,
    group: group || null,
    website: website || null,
    gameId: gameId || null,
    sortOrder,
    active,
  };

  if (id) {
    await updateCatalogueMasterDataRecord(kind, id, input);
  } else {
    await createCatalogueMasterDataRecord(kind, input);
  }

  revalidatePath('/admin/catalogue');
  revalidatePath(`/admin/catalogue/${kind}`);
  revalidatePath('/admin/products');
}

export async function toggleCatalogueMasterDataAction(formData: FormData): Promise<void> {
  await requireAdminRole();
  const kind = parseCatalogueKind(asString(formData.get('kind')));
  const id = asString(formData.get('id'));
  if (!id) throw new Error('Missing catalogue record ID.');

  await setCatalogueMasterDataActive(kind, id, asBoolean(formData.get('active')));
  revalidatePath('/admin/catalogue');
  revalidatePath(`/admin/catalogue/${kind}`);
  revalidatePath('/admin/products');
}

export async function archiveProductAction(formData: FormData) {
  await requireAdminRole();
  const productId = formData.get('productId');
  if (typeof productId !== 'string' || !productId) {
    redirect('/admin/products');
  }

  await archiveAdminProduct(productId);
  redirect(`/admin/products/${productId}`);
}

export async function toggleProductPublicationAction(formData: FormData) {
  await requireAdminRole();
  const productId = formData.get('productId');
  const publishedValue = formData.get('published');
  const published = typeof publishedValue === 'string' ? publishedValue === 'true' || publishedValue === 'on' || publishedValue === '1' : true;

  if (typeof productId !== 'string' || !productId) {
    redirect('/admin/products');
  }

  await setProductPublication(productId, published);
  revalidateProductVisibility(productId);
  redirect(`/admin/products/${productId}`);
}

export async function saveProductMerchandisingSettingsAction(formData: FormData) {
  await requireAdminSession();
  const productId = asString(formData.get('productId'));
  const productSlug = asString(formData.get('productSlug'));
  const recommendationWeight = parseWholeNumber(asString(formData.get('recommendationWeight')));

  if (!productId) {
    redirect('/admin/products');
  }
  if (recommendationWeight === null) {
    redirectToProductMerchandising(productId, 'error', 'Enter a whole-number recommendation weight.');
  }

  try {
    await updateProductMerchandisingSettings(productId, {
      recommendationWeight,
      isAccessory: asBoolean(formData.get('isAccessory')),
      isStaffPick: asBoolean(formData.get('isStaffPick')),
      isBestSeller: asBoolean(formData.get('isBestSeller')),
      isNewArrival: asBoolean(formData.get('isNewArrival')),
    });
    revalidateMerchandising(productId, productSlug);
    redirectToProductMerchandising(productId, 'saved');
  } catch (error) {
    redirectToProductMerchandising(productId, 'error', error instanceof Error ? error.message : 'Unable to save merchandising settings.');
  }
}

export async function addProductRecommendationAction(formData: FormData) {
  await requireAdminSession();
  const sourceProductId = asString(formData.get('sourceProductId'));
  const sourceProductSlug = asString(formData.get('sourceProductSlug'));
  const recommendedProductId = asString(formData.get('recommendedProductId'));
  const relationshipType = parseRecommendationType(asString(formData.get('relationshipType')));
  const priority = parseWholeNumber(asString(formData.get('priority')));

  if (!sourceProductId) {
    redirect('/admin/products');
  }
  if (!recommendedProductId) {
    redirectToProductMerchandising(sourceProductId, 'error', 'Choose a product to recommend.');
  }
  if (!relationshipType) {
    redirectToProductMerchandising(sourceProductId, 'error', 'Choose a valid relationship type.');
  }
  if (priority === null) {
    redirectToProductMerchandising(sourceProductId, 'error', 'Enter a whole-number priority.');
  }

  try {
    await createAdminProductRecommendation({
      sourceProductId,
      recommendedProductId,
      relationshipType,
      priority,
      active: asBoolean(formData.get('active')),
    });
    revalidateMerchandising(sourceProductId, sourceProductSlug);
    redirectToProductMerchandising(sourceProductId, 'created');
  } catch (error) {
    redirectToProductMerchandising(sourceProductId, 'error', error instanceof Error ? error.message : 'Unable to create recommendation.');
  }
}

export async function updateProductRecommendationAction(formData: FormData) {
  await requireAdminSession();
  const productId = asString(formData.get('productId'));
  const productSlug = asString(formData.get('productSlug'));
  const recommendationId = asString(formData.get('recommendationId'));
  const relationshipType = parseRecommendationType(asString(formData.get('relationshipType')));
  const priority = parseWholeNumber(asString(formData.get('priority')));

  if (!productId) {
    redirect('/admin/products');
  }
  if (!recommendationId) {
    redirectToProductMerchandising(productId, 'error', 'Recommendation not found.');
  }
  if (!relationshipType) {
    redirectToProductMerchandising(productId, 'error', 'Choose a valid relationship type.');
  }
  if (priority === null) {
    redirectToProductMerchandising(productId, 'error', 'Enter a whole-number priority.');
  }

  try {
    await updateAdminProductRecommendation(recommendationId, {
      relationshipType,
      priority,
      active: asBoolean(formData.get('active')),
    });
    revalidateMerchandising(productId, productSlug);
    redirectToProductMerchandising(productId, 'updated');
  } catch (error) {
    redirectToProductMerchandising(productId, 'error', error instanceof Error ? error.message : 'Unable to update recommendation.');
  }
}

export async function deleteProductRecommendationAction(formData: FormData) {
  await requireAdminSession();
  const productId = asString(formData.get('productId'));
  const productSlug = asString(formData.get('productSlug'));
  const recommendationId = asString(formData.get('recommendationId'));

  if (!productId) {
    redirect('/admin/products');
  }
  if (!recommendationId) {
    redirectToProductMerchandising(productId, 'error', 'Recommendation not found.');
  }

  try {
    await deleteAdminProductRecommendation(recommendationId);
    revalidateMerchandising(productId, productSlug);
    redirectToProductMerchandising(productId, 'deleted');
  } catch (error) {
    redirectToProductMerchandising(productId, 'error', error instanceof Error ? error.message : 'Unable to delete recommendation.');
  }
}

export async function saveSupplierAction(_state: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  await requireAdminRole();
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
  await requireAdminSession();
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
