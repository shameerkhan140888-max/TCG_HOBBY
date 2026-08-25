'use server';

import {
  cancelIronSprueOrderForMerchant,
  adjustIronSprueStock,
  createIronSprueAdminMediaAsset,
  createIronSprueManualOrder,
  processIronSprueOrderReturn,
  receiveIronSprueStock,
  resolveIronSprueCustomerOrderRequest,
  sendIronSprueCancellationEmail,
  sendIronSprueDispatchEmail,
  sendIronSprueOrderConfirmationEmail,
  publishIronSprueAdminProduct,
  publishIronSprueAdminProducts,
  reconcileIronSprueR2ProductMedia,
  setIronSprueProductPublicationState,
  isIronSprueAdminFulfilmentState,
  updateIronSprueAdminBrandControls,
  updateIronSprueAdminCategoryControls,
  updateIronSprueAdminContentReviewStatus,
  updateIronSprueAdminMediaApproval,
  updateIronSprueAdminOrderFulfilmentStatus,
  updateIronSprueAdminOrderNotes,
  updateIronSprueAdminProductFlags,
  upsertIronSprueDiscountCode,
  upsertIronSprueAdminHero,
  upsertIronSprueAdminHomepagePlacement,
  upsertIronSprueAdminSpecialOffer,
  upsertIronSprueAdminTypographySettings,
} from '@tcg-hobby/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireIronSprueAdminSession } from './auth.server';
import { assertIronSprueR2ObjectExists, listIronSprueR2Objects, uploadIronSprueAdminImage } from './iron-sprue-media-storage.server';

function boolFromForm(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true' || value === '1';
}

function stringFromForm(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}

function optionalNumberFromForm(value: FormDataEntryValue | null) {
  const raw = stringFromForm(value).trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalMoneyMinorFromForm(value: FormDataEntryValue | null) {
  const parsed = optionalNumberFromForm(value);
  return parsed == null ? undefined : Math.round(parsed * 100);
}

function optionalDateFromForm(value: FormDataEntryValue | null) {
  const raw = stringFromForm(value).trim();
  if (!raw) return undefined;
  const parsed = new Date(`${raw}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function fileFromForm(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

async function requireIronSprueActor() {
  const session = await requireIronSprueAdminSession('/iron-sprue-admin', '/iron-sprue-admin/login');
  return session.user;
}

function adminStatusPath(section: string, key: 'saved' | 'error', message: string) {
  return `/iron-sprue-admin/${section}?${key}=${encodeURIComponent(message)}`;
}

function adminReturnPath(formData: FormData, fallbackSection: string, key: 'saved' | 'error', message: string) {
  const raw = String(formData.get('returnTo') ?? '').trim();
  const separator = raw.includes('?') ? '&' : '?';
  if (raw.startsWith('/iron-sprue-admin') && !raw.startsWith('//')) {
    return `${raw}${separator}${key}=${encodeURIComponent(message)}`;
  }
  return adminStatusPath(fallbackSection, key, message);
}

function actionError(error: unknown) {
  return error instanceof Error ? error.message : 'Action failed.';
}

function revalidateIronSprueStorefront() {
  revalidatePath('/', 'layout');
  revalidatePath('/shop');
}

export async function updateIronSprueMediaApprovalAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const mediaId = String(formData.get('mediaId') ?? '');
  const nextState = String(formData.get('approvalState') ?? '');
  try {
    if (!mediaId) throw new Error('mediaId is required.');
    if (!['APPROVED', 'REJECTED', 'REVIEW_REQUIRED'].includes(nextState)) throw new Error('Invalid media approval state.');
    await updateIronSprueAdminMediaApproval(mediaId, nextState as 'APPROVED' | 'REJECTED' | 'REVIEW_REQUIRED', actor);
  } catch (error) {
    redirect(adminReturnPath(formData, 'media', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidatePath('/iron-sprue-admin/media');
  revalidateIronSprueStorefront();
  redirect(adminReturnPath(formData, 'media', 'saved', 'Media approval saved.'));
}

export async function bulkApproveIronSprueMediaAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const mediaIds = formData.getAll('mediaId').map((value) => String(value)).filter(Boolean);
  const bulkAction = String(formData.get('bulkAction') ?? 'APPROVED');
  try {
    if (!mediaIds.length) throw new Error('Select at least one media record.');
    if (!['APPROVED', 'REVIEW_REQUIRED', 'REJECTED'].includes(bulkAction)) throw new Error('Invalid media bulk action.');
    await Promise.all(mediaIds.map((mediaId) => updateIronSprueAdminMediaApproval(
      mediaId,
      bulkAction as 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED',
      actor,
    )));
  } catch (error) {
    redirect(adminStatusPath('media', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/media');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('media', 'saved', `${mediaIds.length} media record${mediaIds.length === 1 ? '' : 's'} updated.`));
}

export async function updateIronSprueContentReviewAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const reviewId = String(formData.get('reviewId') ?? '');
  const nextStatus = String(formData.get('status') ?? '');
  try {
    if (!reviewId) throw new Error('reviewId is required.');
    if (!['APPROVED', 'REJECTED', 'CONFLICT', 'PENDING'].includes(nextStatus)) throw new Error('Invalid content review status.');
    await updateIronSprueAdminContentReviewStatus(reviewId, nextStatus as 'APPROVED' | 'REJECTED' | 'CONFLICT' | 'PENDING', actor);
  } catch (error) {
    redirect(adminReturnPath(formData, 'content-review', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidatePath('/iron-sprue-admin/content-review');
  revalidateIronSprueStorefront();
  redirect(adminReturnPath(formData, 'content-review', 'saved', 'Content review saved.'));
}

export async function approveIronSprueProductReviewAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productSku = stringFromForm(formData.get('productSku'));
  const reviewId = stringFromForm(formData.get('reviewId'));
  const mediaId = stringFromForm(formData.get('mediaId'));
  try {
    if (reviewId) {
      await updateIronSprueAdminContentReviewStatus(reviewId, 'APPROVED', actor);
    } else if (mediaId) {
      await updateIronSprueAdminMediaApproval(mediaId, 'APPROVED', actor);
    } else {
      throw new Error('Select a review or media item to approve.');
    }
  } catch (error) {
    redirect(adminStatusPath('products', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidatePath('/iron-sprue-admin/media');
  revalidatePath('/iron-sprue-admin/content-review');
  revalidateIronSprueStorefront();
  const query = productSku ? `?q=${encodeURIComponent(productSku)}&saved=${encodeURIComponent('Review approval saved.')}` : `?saved=${encodeURIComponent('Review approval saved.')}`;
  redirect(`/iron-sprue-admin/products${query}`);
}

export async function bulkApproveIronSprueContentReviewsAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const reviewIds = formData.getAll('reviewId').map((value) => String(value)).filter(Boolean);
  const bulkAction = String(formData.get('bulkAction') ?? 'APPROVED');
  try {
    if (!reviewIds.length) throw new Error('Select at least one content review.');
    if (!['APPROVED', 'PENDING', 'CONFLICT', 'REJECTED'].includes(bulkAction)) throw new Error('Invalid content review bulk action.');
    await Promise.all(reviewIds.map((reviewId) => updateIronSprueAdminContentReviewStatus(
      reviewId,
      bulkAction as 'APPROVED' | 'REJECTED' | 'CONFLICT' | 'PENDING',
      actor,
    )));
  } catch (error) {
    redirect(adminStatusPath('content-review', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/content-review');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('content-review', 'saved', `${reviewIds.length} content review${reviewIds.length === 1 ? '' : 's'} updated.`));
}

export async function updateIronSprueProductFlagsAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = String(formData.get('productId') ?? '');
  try {
    if (!productId) throw new Error('productId is required.');
    await updateIronSprueAdminProductFlags(
      productId,
      {
        featured: boolFromForm(formData.get('featured')),
        newArrival: boolFromForm(formData.get('newArrival')),
        comingSoon: boolFromForm(formData.get('comingSoon')),
        specialOffer: boolFromForm(formData.get('specialOffer')),
        hideWhenOutOfStock: boolFromForm(formData.get('hideWhenOutOfStock')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('products', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('products', 'saved', 'Product flags saved.'));
}

export async function updateIronSpruePublicationStateAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = String(formData.get('productId') ?? '');
  const publicationState = String(formData.get('publicationState') ?? '');
  try {
    if (!productId) throw new Error('productId is required.');
    await setIronSprueProductPublicationState(
      productId,
      publicationState as 'DRAFT' | 'CONTENT_PENDING' | 'MEDIA_PENDING' | 'REVIEW_REQUIRED' | 'READY_TO_PUBLISH' | 'READY' | 'PUBLISHED' | 'ARCHIVED',
      actor,
    );
  } catch (error) {
    redirect(adminReturnPath(formData, 'products', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidateIronSprueStorefront();
  redirect(adminReturnPath(formData, 'products', 'saved', 'Publication state saved.'));
}

export async function publishIronSprueProductAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = String(formData.get('productId') ?? '');
  try {
    if (!productId) throw new Error('productId is required.');
    await publishIronSprueAdminProduct(productId, actor);
  } catch (error) {
    redirect(adminReturnPath(formData, 'products', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidateIronSprueStorefront();
  redirect(adminReturnPath(formData, 'products', 'saved', 'Product published.'));
}

export async function bulkPublishIronSprueProductsAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productIds = formData.getAll('productId').map((value) => String(value)).filter(Boolean);
  try {
    await publishIronSprueAdminProducts(productIds, actor);
  } catch (error) {
    redirect(adminStatusPath('products', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('products', 'saved', `${productIds.length} product${productIds.length === 1 ? '' : 's'} published.`));
}

export async function uploadIronSprueProductMediaAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = stringFromForm(formData.get('productId'));
  const sku = stringFromForm(formData.get('sku')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const role = stringFromForm(formData.get('role'));
  const altText = stringFromForm(formData.get('altText'));
  const file = fileFromForm(formData.get('image'));
  try {
    if (!productId) throw new Error('productId is required.');
    if (!sku) throw new Error('sku is required.');
    if (!['catalogue-primary', 'workshop-photography', 'manufacturer-original', 'completed-result'].includes(role)) {
      throw new Error('Unsupported Iron Sprue media role.');
    }
    if (!file) throw new Error('Select a media image to upload.');
    const uploaded = await uploadIronSprueAdminImage({
      file,
      keyPrefix: `products/${sku}/${role}`,
      altText,
      maxWidth: role === 'workshop-photography' ? 2400 : 1800,
      maxHeight: role === 'workshop-photography' ? 1600 : 1800,
    });
    await createIronSprueAdminMediaAsset(
      {
        productId,
        role,
        storageKey: uploaded.key,
        url: uploaded.url,
        altText: uploaded.altText,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
        width: uploaded.width,
        height: uploaded.height,
        approvalState: 'REVIEW_REQUIRED',
        isPrimary: false,
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('media', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/media');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('media', 'saved', 'Media upload saved for review.'));
}

export async function attachIronSprueExistingR2MediaAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = stringFromForm(formData.get('productId'));
  const role = stringFromForm(formData.get('role'));
  const storageKey = stringFromForm(formData.get('storageKey')).trim();
  const altText = stringFromForm(formData.get('altText'));
  try {
    if (!productId) throw new Error('productId is required.');
    if (!storageKey) throw new Error('Select an existing R2 image.');
    if (!['catalogue-primary', 'workshop-photography', 'manufacturer-original', 'completed-result'].includes(role)) {
      throw new Error('Unsupported Iron Sprue media role.');
    }
    if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(storageKey)) {
      throw new Error('Only existing R2 image objects can be attached for media review.');
    }
    await assertIronSprueR2ObjectExists(storageKey);
    await createIronSprueAdminMediaAsset(
      {
        productId,
        role,
        storageKey,
        url: `r2://${storageKey}`,
        altText,
        mimeType: storageKey.toLowerCase().endsWith('.webp')
          ? 'image/webp'
          : storageKey.toLowerCase().endsWith('.png')
            ? 'image/png'
            : storageKey.toLowerCase().endsWith('.gif')
              ? 'image/gif'
              : storageKey.toLowerCase().endsWith('.avif')
                ? 'image/avif'
                : 'image/jpeg',
        approvalState: 'REVIEW_REQUIRED',
        isPrimary: false,
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('media', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/media');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('media', 'saved', 'Existing R2 media attached for review.'));
}

export async function reconcileIronSprueExistingR2MediaAction() {
  const actor = await requireIronSprueActor();
  try {
    const [productObjects, archiveProductObjects] = await Promise.all([
      listIronSprueR2Objects('products/', 1000),
      listIronSprueR2Objects('archive/products/', 1000),
    ]);
    const objects = [...productObjects, ...archiveProductObjects];
    const result = await reconcileIronSprueR2ProductMedia(objects.map((object) => ({
      key: object.key,
      size: object.size,
      updatedAt: object.updatedAt,
    })), actor);
    const issues = result.ambiguous.length + result.unmatched.length;
    const issueText = issues ? ` ${issues} object${issues === 1 ? '' : 's'} need review.` : '';
    revalidatePath('/iron-sprue-admin');
    revalidatePath('/iron-sprue-admin/products');
    revalidatePath('/iron-sprue-admin/media');
    revalidateIronSprueStorefront();
    redirect(adminStatusPath('products', 'saved', `Reconciled ${result.upsertedMedia} R2 media object${result.upsertedMedia === 1 ? '' : 's'} across ${result.affectedProducts} product${result.affectedProducts === 1 ? '' : 's'}.${issueText}`));
  } catch (error) {
    redirect(adminStatusPath('products', 'error', actionError(error)));
  }
}

export async function saveIronSprueHomepagePlacementAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  try {
    await upsertIronSprueAdminHomepagePlacement(
      {
        id: stringFromForm(formData.get('id')),
        placementKey: stringFromForm(formData.get('placementKey')),
        title: stringFromForm(formData.get('title')),
        ctaLabel: stringFromForm(formData.get('ctaLabel')),
        ctaHref: stringFromForm(formData.get('ctaHref')),
        imageUrl: stringFromForm(formData.get('imageUrl')),
        active: boolFromForm(formData.get('active')),
        sortOrder: optionalNumberFromForm(formData.get('sortOrder')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('homepage', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/homepage');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('homepage', 'saved', 'Homepage placement saved.'));
}

export async function saveIronSprueFeaturedProductPlacementAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productSlugs = formData.getAll('productSlug')
    .map((value) => stringFromForm(value).trim())
    .filter(Boolean);
  const productTitle = stringFromForm(formData.get('productTitle')).trim();
  const existingId = stringFromForm(formData.get('id'));
  const baseSortOrder = optionalNumberFromForm(formData.get('sortOrder')) ?? 0;
  try {
    if (!productSlugs.length) throw new Error('Select a product for this featured slot.');
    for (const [index, productSlug] of productSlugs.entries()) {
      await upsertIronSprueAdminHomepagePlacement(
        {
          id: existingId && index === 0 ? existingId : '',
          placementKey: `featured-product:${productSlug}`,
          title: productTitle || productSlug,
          ctaLabel: 'View product',
          ctaHref: `/products/${productSlug}`,
          imageUrl: index === 0 ? stringFromForm(formData.get('imageUrl')) : '',
          active: boolFromForm(formData.get('active')),
          sortOrder: baseSortOrder + index,
        },
        actor,
      );
    }
  } catch (error) {
    redirect(adminStatusPath('homepage', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/homepage');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('homepage', 'saved', 'Featured product controls saved.'));
}

export async function saveIronSprueHomepageProductSectionAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productSlugs = formData.getAll('productSlug')
    .map((value) => stringFromForm(value).trim())
    .filter(Boolean);
  const sectionKey = stringFromForm(formData.get('sectionKey')).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const sectionHeading = stringFromForm(formData.get('sectionHeading')).trim();
  const existingId = stringFromForm(formData.get('id'));
  const baseSortOrder = optionalNumberFromForm(formData.get('sortOrder')) ?? 0;
  try {
    if (!sectionKey) throw new Error('Enter a section key.');
    if (!sectionHeading) throw new Error('Enter a section heading.');
    if (!productSlugs.length) throw new Error('Select at least one product for this section.');
    for (const [index, productSlug] of productSlugs.entries()) {
      await upsertIronSprueAdminHomepagePlacement(
        {
          id: existingId && index === 0 ? existingId : '',
          placementKey: `product-section:${sectionKey}:${productSlug}`,
          title: sectionHeading,
          ctaLabel: stringFromForm(formData.get('ctaLabel')),
          ctaHref: stringFromForm(formData.get('ctaHref')),
          imageUrl: index === 0 ? stringFromForm(formData.get('imageUrl')) : '',
          active: boolFromForm(formData.get('active')),
          sortOrder: baseSortOrder + index,
        },
        actor,
      );
    }
  } catch (error) {
    redirect(adminStatusPath('homepage', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/homepage');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('homepage', 'saved', 'Homepage product section saved.'));
}

export async function updateIronSprueBrandControlsAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const brandId = stringFromForm(formData.get('brandId'));
  try {
    if (!brandId) throw new Error('brandId is required.');
    await updateIronSprueAdminBrandControls(
      brandId,
      {
        active: boolFromForm(formData.get('active')),
        featured: boolFromForm(formData.get('featured')),
        sortOrder: optionalNumberFromForm(formData.get('sortOrder')) ?? 0,
        logoUrl: stringFromForm(formData.get('logoUrl')),
        logoAltText: stringFromForm(formData.get('logoAltText')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('homepage', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/brands');
  revalidatePath('/iron-sprue-admin/homepage');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('homepage', 'saved', 'Brand carousel controls saved.'));
}

export async function updateIronSprueCategoryControlsAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const categoryId = stringFromForm(formData.get('categoryId'));
  try {
    if (!categoryId) throw new Error('categoryId is required.');
    const sortOrder = optionalNumberFromForm(formData.get('sortOrder'));
    await updateIronSprueAdminCategoryControls(
      categoryId,
      {
        active: boolFromForm(formData.get('active')),
        ...(sortOrder == null ? {} : { sortOrder }),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('categories', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/categories');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('categories', 'saved', 'Category visibility saved.'));
}

export async function saveIronSprueHeroAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const uploadedFile = fileFromForm(formData.get('image'));
  const existingR2Key = stringFromForm(formData.get('existingR2Key')).trim();
  const productSlug = stringFromForm(formData.get('productSlug')).trim();
  let imageUrl = stringFromForm(formData.get('imageUrl'));
  let ctaHref = stringFromForm(formData.get('ctaHref'));
  try {
    if (uploadedFile) {
      const uploaded = await uploadIronSprueAdminImage({
        file: uploadedFile,
        keyPrefix: 'marketing/heroes/admin',
        altText: stringFromForm(formData.get('headline')),
        maxWidth: 2560,
        maxHeight: 1440,
      });
      imageUrl = uploaded.url;
    } else if (existingR2Key) {
      await assertIronSprueR2ObjectExists(existingR2Key);
      imageUrl = `r2://${existingR2Key}`;
    }
    await upsertIronSprueAdminHero(
      {
        id: stringFromForm(formData.get('id')),
        headline: stringFromForm(formData.get('headline')),
        strapline: stringFromForm(formData.get('strapline')),
        ctaLabel: stringFromForm(formData.get('ctaLabel')),
        ctaHref: productSlug ? `/products/${productSlug}` : ctaHref,
        imageUrl,
        merchandisingBadge: stringFromForm(formData.get('merchandisingBadge')),
        active: boolFromForm(formData.get('active')),
        sortOrder: optionalNumberFromForm(formData.get('sortOrder')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('heroes', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/heroes');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('heroes', 'saved', 'Hero controls saved.'));
}

export async function saveIronSprueTypographySettingsAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  try {
    await upsertIronSprueAdminTypographySettings(
      {
        headingFamily: stringFromForm(formData.get('headingFamily')),
        bodyFamily: stringFromForm(formData.get('bodyFamily')),
        headingWeight: stringFromForm(formData.get('headingWeight')),
        bodyWeight: stringFromForm(formData.get('bodyWeight')),
        headingScale: stringFromForm(formData.get('headingScale')),
        bodyScale: stringFromForm(formData.get('bodyScale')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('homepage', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/homepage');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('homepage', 'saved', 'Typography controls saved.'));
}

export async function saveIronSprueSpecialOfferAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  try {
    await upsertIronSprueAdminSpecialOffer(
      {
        id: stringFromForm(formData.get('id')),
        productId: stringFromForm(formData.get('productId')),
        title: stringFromForm(formData.get('title')),
        badge: stringFromForm(formData.get('badge')),
        normalPriceMinor: optionalNumberFromForm(formData.get('normalPriceMinor')),
        offerPriceMinor: optionalNumberFromForm(formData.get('offerPriceMinor')),
        ctaLabel: stringFromForm(formData.get('ctaLabel')),
        ctaHref: stringFromForm(formData.get('ctaHref')),
        active: boolFromForm(formData.get('active')),
        sortOrder: optionalNumberFromForm(formData.get('sortOrder')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('special-offers', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/special-offers');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('special-offers', 'saved', 'Special offer saved.'));
}

export async function saveIronSprueDiscountCodeAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const discountType = stringFromForm(formData.get('discountType')) || 'PERCENT';
  try {
    await upsertIronSprueDiscountCode(
      {
        id: stringFromForm(formData.get('id')),
        code: stringFromForm(formData.get('code')),
        enabled: boolFromForm(formData.get('enabled')),
        discountType,
        amount: discountType === 'FIXED' ? optionalMoneyMinorFromForm(formData.get('amount')) : optionalNumberFromForm(formData.get('amount')),
        expiresAt: optionalDateFromForm(formData.get('expiresAt')),
        minimumSpendMinor: optionalMoneyMinorFromForm(formData.get('minimumSpendMinor')),
        oneUsePerCustomer: boolFromForm(formData.get('oneUsePerCustomer')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('special-offers', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/special-offers');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('special-offers', 'saved', 'Discount code saved.'));
}

export async function updateIronSprueOrderFulfilmentAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const orderId = stringFromForm(formData.get('orderId'));
  const fulfilmentStatus = stringFromForm(formData.get('fulfilmentStatus'));
  try {
    if (!orderId) throw new Error('orderId is required.');
    if (!isIronSprueAdminFulfilmentState(fulfilmentStatus)) throw new Error('Invalid fulfilment status.');
    await updateIronSprueAdminOrderFulfilmentStatus(orderId, fulfilmentStatus, actor, {
      trackingCarrier: stringFromForm(formData.get('trackingCarrier')),
      trackingNumber: stringFromForm(formData.get('trackingNumber')),
      trackingUrl: stringFromForm(formData.get('trackingUrl')),
    });
    if (fulfilmentStatus === 'SHIPPED') {
      const emailResult = await sendIronSprueDispatchEmail(orderId);
      if (emailResult.outcome === 'provider_unconfigured' || emailResult.outcome === 'failed') {
        console.warn('iron_sprue_dispatch_email_not_sent', { orderId, outcome: emailResult.outcome });
      }
    }
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/orders');
  redirect(adminStatusPath('orders', 'saved', 'Order fulfilment saved.'));
}

export async function cancelIronSprueOrderAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const orderId = stringFromForm(formData.get('orderId'));
  const reason = stringFromForm(formData.get('reason')).trim();
  const confirmed = boolFromForm(formData.get('confirmCancellation'));
  try {
    if (!orderId) throw new Error('orderId is required.');
    if (!confirmed) throw new Error('Confirm the cancellation before continuing.');
    await cancelIronSprueOrderForMerchant({
      orderId,
      actorId: actor.email ?? actor.id ?? 'iron-sprue-admin',
      reason: reason || 'Merchant cancellation',
      environment: process.env.NODE_ENV === 'production' ? 'live' : 'test',
    });
    const emailResult = await sendIronSprueCancellationEmail(orderId);
    if (emailResult.outcome === 'provider_unconfigured' || emailResult.outcome === 'failed') {
      console.warn('iron_sprue_cancellation_email_not_sent', { orderId, outcome: emailResult.outcome });
    }
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/orders');
  revalidatePath('/iron-sprue-admin/inventory');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('orders', 'saved', 'Order cancellation saved.'));
}

export async function saveIronSprueOrderNotesAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const orderId = stringFromForm(formData.get('orderId'));
  const notes = stringFromForm(formData.get('internalNotes'));
  try {
    if (!orderId) throw new Error('orderId is required.');
    await updateIronSprueAdminOrderNotes(orderId, notes, actor);
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/orders');
  redirect(adminStatusPath('orders', 'saved', 'Order notes saved.'));
}

export async function createIronSprueManualOrderAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  try {
    const lines = [0, 1, 2].map((index) => ({
      productId: stringFromForm(formData.get(`productId:${index}`)),
      quantity: Math.trunc(optionalNumberFromForm(formData.get(`quantity:${index}`)) ?? 0),
      unitPriceMinor: optionalMoneyMinorFromForm(formData.get(`unitPrice:${index}`)) ?? null,
    })).filter((line) => line.productId && line.quantity > 0);
    const placedAtRaw = stringFromForm(formData.get('placedAt')).trim();
    const placedAt = placedAtRaw ? new Date(placedAtRaw) : undefined;
    await createIronSprueManualOrder(
      {
        userId: stringFromForm(formData.get('userId')),
        sourceChannel: stringFromForm(formData.get('sourceChannel')),
        paymentMethodLabel: stringFromForm(formData.get('paymentMethodLabel')),
        externalReference: stringFromForm(formData.get('externalReference')),
        ...(placedAt ? { placedAt } : {}),
        shippingMinor: optionalMoneyMinorFromForm(formData.get('shippingMinor')) ?? 0,
        shippingMethodName: stringFromForm(formData.get('shippingMethodName')),
        shippingFullName: stringFromForm(formData.get('shippingFullName')),
        shippingEmail: stringFromForm(formData.get('shippingEmail')),
        shippingLine1: stringFromForm(formData.get('shippingLine1')),
        shippingLine2: stringFromForm(formData.get('shippingLine2')),
        shippingCity: stringFromForm(formData.get('shippingCity')),
        shippingRegion: stringFromForm(formData.get('shippingRegion')),
        shippingPostalCode: stringFromForm(formData.get('shippingPostalCode')),
        shippingCountry: stringFromForm(formData.get('shippingCountry')),
        lines,
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/orders');
  revalidatePath('/iron-sprue-admin/inventory');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('orders', 'saved', 'Manual order created and stock allocated.'));
}

export async function resolveIronSprueCustomerRequestAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const requestId = stringFromForm(formData.get('requestId'));
  const status = stringFromForm(formData.get('status')).toUpperCase();
  try {
    if (!requestId) throw new Error('requestId is required.');
    if (!['RESOLVED', 'DECLINED'].includes(status)) throw new Error('Invalid request status.');
    await resolveIronSprueCustomerOrderRequest(
      {
        requestId,
        status: status as 'RESOLVED' | 'DECLINED',
        adminNotes: stringFromForm(formData.get('adminNotes')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/orders');
  redirect(adminStatusPath('orders', 'saved', 'Customer request updated.'));
}

export async function processIronSprueReturnAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const orderId = stringFromForm(formData.get('orderId'));
  const refundAmountMinor = optionalMoneyMinorFromForm(formData.get('refundAmount'));
  try {
    if (!orderId) throw new Error('orderId is required.');
    const lines = [...formData.entries()]
      .filter(([key]) => key.startsWith('returnQuantity:'))
      .map(([key, value]) => {
        const orderItemId = key.slice('returnQuantity:'.length);
        return {
          orderItemId,
          quantity: Math.trunc(Number(stringFromForm(value)) || 0),
          restock: boolFromForm(formData.get(`returnRestock:${orderItemId}`)),
        };
      })
      .filter((line) => line.quantity > 0);
    await processIronSprueOrderReturn(
      {
        orderId,
        reference: stringFromForm(formData.get('reference')),
        notes: stringFromForm(formData.get('notes')),
        condition: stringFromForm(formData.get('condition')),
        refundAmountMinor: refundAmountMinor ?? null,
        lines,
        environment: process.env.NODE_ENV === 'production' ? 'live' : 'test',
      },
      actor,
    );
    const emailResult = await sendIronSprueCancellationEmail(orderId);
    if (emailResult.outcome === 'provider_unconfigured' || emailResult.outcome === 'failed') {
      console.warn('iron_sprue_return_email_not_sent', { orderId, outcome: emailResult.outcome });
    }
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/orders');
  revalidatePath('/iron-sprue-admin/inventory');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('orders', 'saved', 'Return/refund processed.'));
}

export async function resendIronSprueOrderEmailAction(formData: FormData) {
  await requireIronSprueActor();
  const orderId = stringFromForm(formData.get('orderId'));
  const purpose = stringFromForm(formData.get('purpose'));
  try {
    if (!orderId) throw new Error('orderId is required.');
    let result;
    if (purpose === 'confirmation') {
      result = await sendIronSprueOrderConfirmationEmail(orderId);
    } else if (purpose === 'dispatch') {
      result = await sendIronSprueDispatchEmail(orderId);
    } else if (purpose === 'cancellation') {
      result = await sendIronSprueCancellationEmail(orderId);
    } else {
      throw new Error('Unsupported email type.');
    }
    if (result.outcome === 'provider_unconfigured') {
      throw new Error('Iron Sprue email provider is not configured.');
    }
    if (result.outcome === 'failed') {
      throw new Error('Email provider rejected the send request.');
    }
    if (result.outcome !== 'sent' && result.outcome !== 'in_progress') {
      throw new Error(`Email cannot be sent for this order state (${result.outcome}).`);
    }
  } catch (error) {
    redirect(adminStatusPath('orders', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/orders');
  redirect(adminStatusPath('orders', 'saved', 'Transactional email checked/sent.'));
}

export async function receiveIronSprueStockAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = stringFromForm(formData.get('productId'));
  try {
    if (!productId) throw new Error('productId is required.');
    await receiveIronSprueStock(
      productId,
      {
        receivedQuantity: Math.max(0, Math.trunc(optionalNumberFromForm(formData.get('receivedQuantity')) ?? 0)),
        damagedQuantity: Math.max(0, Math.trunc(optionalNumberFromForm(formData.get('damagedQuantity')) ?? 0)),
        missingQuantity: Math.max(0, Math.trunc(optionalNumberFromForm(formData.get('missingQuantity')) ?? 0)),
        batchReference: stringFromForm(formData.get('batchReference')),
        reason: stringFromForm(formData.get('reason')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('inventory', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/inventory');
  revalidatePath('/iron-sprue-admin/goods-received');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('inventory', 'saved', 'Stock receipt saved.'));
}

export async function adjustIronSprueStockAction(formData: FormData) {
  const actor = await requireIronSprueActor();
  const productId = stringFromForm(formData.get('productId'));
  try {
    if (!productId) throw new Error('productId is required.');
    await adjustIronSprueStock(
      productId,
      {
        quantityDelta: Math.trunc(optionalNumberFromForm(formData.get('quantityDelta')) ?? 0),
        movementType: stringFromForm(formData.get('movementType')),
        reason: stringFromForm(formData.get('reason')),
        batchReference: stringFromForm(formData.get('batchReference')),
      },
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('inventory', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin/inventory');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('inventory', 'saved', 'Stock adjustment saved.'));
}
