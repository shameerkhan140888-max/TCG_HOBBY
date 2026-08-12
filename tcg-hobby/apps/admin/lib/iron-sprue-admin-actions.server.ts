'use server';

import {
  createIronSprueAdminMediaAsset,
  setIronSprueProductPublicationState,
  updateIronSprueAdminBrandControls,
  updateIronSprueAdminContentReviewStatus,
  updateIronSprueAdminMediaApproval,
  updateIronSprueAdminProductFlags,
  upsertIronSprueAdminHero,
  upsertIronSprueAdminHomepagePlacement,
  upsertIronSprueAdminSpecialOffer,
} from '@tcg-hobby/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from './auth.server';
import { assertIronSprueR2ObjectExists, uploadIronSprueAdminImage } from './iron-sprue-media-storage.server';

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

function fileFromForm(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

async function requireIronSprueActor() {
  const session = await requireAdminSession('/iron-sprue-admin', '/iron-sprue-admin/login');
  return session.user;
}

function adminStatusPath(section: string, key: 'saved' | 'error', message: string) {
  return `/iron-sprue-admin/${section}?${key}=${encodeURIComponent(message)}`;
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
    redirect(adminStatusPath('media', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/media');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('media', 'saved', 'Media approval saved.'));
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
    redirect(adminStatusPath('content-review', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/content-review');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('content-review', 'saved', 'Content review saved.'));
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
      publicationState as 'DRAFT' | 'CONTENT_PENDING' | 'MEDIA_PENDING' | 'REVIEW_REQUIRED' | 'READY' | 'PUBLISHED' | 'ARCHIVED',
      actor,
    );
  } catch (error) {
    redirect(adminStatusPath('products', 'error', actionError(error)));
  }
  revalidatePath('/iron-sprue-admin');
  revalidatePath('/iron-sprue-admin/products');
  revalidateIronSprueStorefront();
  redirect(adminStatusPath('products', 'saved', 'Publication state saved.'));
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
  const productSlug = stringFromForm(formData.get('productSlug')).trim();
  const productTitle = stringFromForm(formData.get('productTitle')).trim();
  try {
    if (!productSlug) throw new Error('Select a product for this featured slot.');
    await upsertIronSprueAdminHomepagePlacement(
      {
        id: stringFromForm(formData.get('id')),
        placementKey: `featured-product:${productSlug}`,
        title: productTitle || productSlug,
        ctaLabel: 'View product',
        ctaHref: `/products/${productSlug}`,
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
  redirect(adminStatusPath('homepage', 'saved', 'Featured product controls saved.'));
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
