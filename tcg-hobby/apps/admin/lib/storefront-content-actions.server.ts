'use server';

import {
  HERO_DISPLAY_MODES,
  HERO_FOCAL_POINTS,
  HERO_IMAGE_SOURCES,
  HERO_OVERLAY_STRENGTHS,
  isSafeStorefrontHref,
  isSafeStorefrontMediaUrl,
  saveHomepageHeroPlacement,
  saveShopLandingPage,
  saveStorefrontBanner,
  type ShopLandingScope,
  type StorefrontBannerIcon,
  type HeroDisplayMode,
  type HeroFocalPoint,
  type HeroImageSource,
  type HeroOverlayStrength,
} from '@capital-hobby/database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminRole } from './auth.server';

function optionalDate(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid schedule date and time.');
  return date;
}

export type HeroPlacementFormValues = {
  id: string;
  productId: string;
  headline: string;
  supportingText: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
  imageSource: HeroImageSource;
  selectedProductImageId: string;
  displayMode: HeroDisplayMode;
  focalPoint: HeroFocalPoint;
  overlayStrength: HeroOverlayStrength;
  startsAt: string;
  endsAt: string;
  sortOrder: string;
  active: boolean;
};

export type HeroPlacementFormState = {
  fieldErrors: Partial<Record<keyof HeroPlacementFormValues, string>>;
  formError?: string;
  values: HeroPlacementFormValues;
};

function optionalFormDate(value: string, field: 'startsAt' | 'endsAt', fieldErrors: HeroPlacementFormState['fieldErrors']) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    fieldErrors[field] = 'Enter a valid date and time.';
    return null;
  }
  return date;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function refreshStorefront() {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/shop/[game]', 'page');
  revalidatePath('/admin/storefront');
}

export async function saveStorefrontBannerAction(formData: FormData) {
  await requireAdminRole('/admin/storefront');
  const id = text(formData, 'id') || null;
  await saveStorefrontBanner(id, {
    label: text(formData, 'label'),
    icon: (text(formData, 'icon') || null) as StorefrontBannerIcon | null,
    message: text(formData, 'message'),
    ctaLabel: text(formData, 'ctaLabel'),
    ctaHref: text(formData, 'ctaHref'),
    active: formData.get('active') === 'true',
    startsAt: optionalDate(formData.get('startsAt')),
    endsAt: optionalDate(formData.get('endsAt')),
    sortOrder: Math.max(Number.parseInt(text(formData, 'sortOrder') || '0', 10) || 0, 0),
  });
  refreshStorefront();
  redirect('/admin/storefront?saved=banner');
}

export async function saveHomepageHeroPlacementAction(
  _previousState: HeroPlacementFormState,
  formData: FormData,
): Promise<HeroPlacementFormState> {
  await requireAdminRole('/admin/storefront');
  const values: HeroPlacementFormValues = {
    id: text(formData, 'id'),
    productId: text(formData, 'productId'),
    headline: text(formData, 'headline'),
    supportingText: text(formData, 'supportingText'),
    ctaLabel: text(formData, 'ctaLabel'),
    ctaHref: text(formData, 'ctaHref'),
    imageUrl: text(formData, 'imageUrl'),
    imageAlt: text(formData, 'imageAlt'),
    imageSource: (text(formData, 'imageSource') || 'PRODUCT') as HeroImageSource,
    selectedProductImageId: text(formData, 'selectedProductImageId'),
    displayMode: text(formData, 'displayMode') as HeroDisplayMode,
    focalPoint: text(formData, 'focalPoint') as HeroFocalPoint,
    overlayStrength: text(formData, 'overlayStrength') as HeroOverlayStrength,
    startsAt: text(formData, 'startsAt'),
    endsAt: text(formData, 'endsAt'),
    sortOrder: text(formData, 'sortOrder') || '0',
    active: formData.get('active') === 'true',
  };
  const fieldErrors: HeroPlacementFormState['fieldErrors'] = {};
  if (!values.productId) fieldErrors.productId = 'Choose a product.';
  if (!values.headline) fieldErrors.headline = 'Enter a hero headline.';
  if (values.headline.length > 90) fieldErrors.headline = 'Keep the hero headline to 90 characters or fewer.';
  if (!values.supportingText) fieldErrors.supportingText = 'Enter supporting text.';
  if (values.supportingText.length > 180) fieldErrors.supportingText = 'Keep hero supporting text to 180 characters or fewer.';
  if (!values.ctaLabel) fieldErrors.ctaLabel = 'Enter a CTA label.';
  if (!values.ctaHref || !isSafeStorefrontHref(values.ctaHref)) {
    fieldErrors.ctaHref = 'Enter an internal storefront path, such as /catalogue/product-slug.';
  }
  if (!HERO_IMAGE_SOURCES.includes(values.imageSource)) {
    fieldErrors.imageSource = 'Choose a hero image source.';
  }
  if (values.imageSource === 'CUSTOM' && !isSafeStorefrontMediaUrl(values.imageUrl)) {
    fieldErrors.imageUrl = 'Use an internal path or a secure HTTPS image URL.';
  }
  if (!HERO_DISPLAY_MODES.includes(values.displayMode)) {
    fieldErrors.displayMode = 'Choose a hero display mode.';
  }
  if (!HERO_FOCAL_POINTS.includes(values.focalPoint)) {
    fieldErrors.focalPoint = 'Choose an image focal point.';
  }
  if (!HERO_OVERLAY_STRENGTHS.includes(values.overlayStrength)) {
    fieldErrors.overlayStrength = 'Choose an overlay strength.';
  }
  const startsAt = optionalFormDate(values.startsAt, 'startsAt', fieldErrors);
  const endsAt = optionalFormDate(values.endsAt, 'endsAt', fieldErrors);
  if (startsAt && endsAt && startsAt >= endsAt) {
    fieldErrors.endsAt = 'The end time must be after the start time.';
  }
  const parsedSortOrder = Number.parseInt(values.sortOrder, 10);
  if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
    fieldErrors.sortOrder = 'Enter a display order of zero or more.';
  }

  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
      formError: 'Hero placement could not be saved. Review the highlighted fields below.',
      values,
    };
  }

  try {
    await saveHomepageHeroPlacement(values.id || null, {
      productId: values.productId,
      headline: values.headline,
      supportingText: values.supportingText,
      ctaLabel: values.ctaLabel,
      ctaHref: values.ctaHref,
      imageUrl: values.imageUrl,
      imageAlt: values.imageAlt,
      imageSource: values.imageSource,
      selectedProductImageId: values.selectedProductImageId || null,
      displayMode: values.displayMode,
      focalPoint: values.focalPoint,
      overlayStrength: values.overlayStrength,
      active: values.active,
      startsAt,
      endsAt,
      sortOrder: parsedSortOrder,
    });
  } catch {
    return {
      fieldErrors: {},
      formError: 'Hero placement could not be saved. Confirm the selected product and try again.',
      values,
    };
  }
  refreshStorefront();
  redirect('/admin/storefront?saved=hero');
}

export async function saveShopLandingPageAction(formData: FormData) {
  await requireAdminRole('/admin/storefront');
  await saveShopLandingPage({
    scopeKey: text(formData, 'scopeKey') as ShopLandingScope,
    heading: text(formData, 'heading'),
    supportingText: text(formData, 'supportingText'),
    seoTitle: text(formData, 'seoTitle'),
    metaDescription: text(formData, 'metaDescription'),
    active: formData.get('active') === 'true',
    featuredProductId: text(formData, 'featuredProductId'),
    heroImageUrl: text(formData, 'heroImageUrl'),
  });
  refreshStorefront();
  redirect(`/admin/storefront?scope=${encodeURIComponent(text(formData, 'scopeKey'))}&saved=landing`);
}
