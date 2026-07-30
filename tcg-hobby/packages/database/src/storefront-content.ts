import { prisma } from './client';
import { FREE_STANDARD_DELIVERY_THRESHOLD_MINOR } from './commerce';
import { resolveProductCardImage, resolveProductImageUrl } from './product-image-resolution';
import { getStorefrontPublicProductWhere } from './product-visibility';
import { buildStorefrontProductPath } from '@tcg-hobby/utils';

export const STOREFRONT_BANNER_ICONS = ['DELIVERY', 'PARCEL', 'ANNOUNCEMENT', 'OFFER', 'INFORMATION'] as const;
export type StorefrontBannerIcon = (typeof STOREFRONT_BANNER_ICONS)[number];
export const HERO_DISPLAY_MODES = ['FULL_BLEED', 'CONTAINED'] as const;
export type HeroDisplayMode = (typeof HERO_DISPLAY_MODES)[number];
export const HERO_FOCAL_POINTS = ['LEFT', 'CENTER', 'RIGHT'] as const;
export type HeroFocalPoint = (typeof HERO_FOCAL_POINTS)[number];
export const HERO_OVERLAY_STRENGTHS = ['LIGHT', 'BALANCED', 'STRONG'] as const;
export type HeroOverlayStrength = (typeof HERO_OVERLAY_STRENGTHS)[number];
export const HERO_IMAGE_SOURCES = ['PRODUCT', 'CUSTOM'] as const;
export type HeroImageSource = (typeof HERO_IMAGE_SOURCES)[number];

export const SHOP_LANDING_DEFAULTS = {
  shop: {
    heading: 'Find your next TCG favourite',
    supportingText: 'Search sealed products, accessories and new releases from across our growing catalogue.',
  },
  pokemon: {
    heading: 'Explore Pokémon TCG',
    supportingText: 'Discover booster packs, boxes, collections, accessories and the latest Pokémon TCG releases.',
  },
  'magic-the-gathering': {
    heading: 'Explore Magic: The Gathering',
    supportingText: 'Discover sealed Magic products, accessories and new releases for collectors and players.',
  },
  'one-piece': {
    heading: 'Explore One Piece Card Game',
    supportingText: 'Browse sealed One Piece Card Game products, accessories and upcoming releases.',
  },
  'disney-lorcana': {
    heading: 'Explore Disney Lorcana',
    supportingText: 'Browse Disney Lorcana sealed products, accessories and the latest releases.',
  },
  yugioh: {
    heading: 'Explore Yu-Gi-Oh!',
    supportingText: 'Discover Yu-Gi-Oh! sealed products, accessories and new releases.',
  },
  accessories: {
    heading: 'Trading card accessories',
    supportingText: 'Protect, organise and play with sleeves, binders, storage, deck boxes and more.',
  },
} as const;

export type ShopLandingScope = keyof typeof SHOP_LANDING_DEFAULTS;

export type StorefrontBannerInput = {
  label?: string | null;
  icon?: StorefrontBannerIcon | null;
  message: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  sortOrder?: number;
};

export type HomepageHeroPlacementInput = {
  productId: string;
  headline: string;
  supportingText: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSource?: HeroImageSource;
  selectedProductImageId?: string | null;
  displayMode?: HeroDisplayMode;
  focalPoint?: HeroFocalPoint;
  overlayStrength?: HeroOverlayStrength;
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  sortOrder?: number;
};

export type HeroPlacementProductOption = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  storefrontPath: string;
  imageUrl: string | null;
  imageAlt: string;
  imageWidth: number | null;
  imageHeight: number | null;
  images: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    altText: string;
    isPrimary: boolean;
    sortOrder: number;
    width: number | null;
    height: number | null;
  }>;
};

export type ManagedHomepageHeroImageInput = {
  placementId: string;
  url: string;
  thumbnailUrl: string;
  storageKey: string;
  altText: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
  uploadedById: string;
};

export type ShopLandingPageInput = {
  scopeKey: ShopLandingScope;
  heading: string;
  supportingText: string;
  seoTitle?: string | null;
  metaDescription?: string | null;
  active: boolean;
  featuredProductId?: string | null;
  heroImageUrl?: string | null;
};

export function isSafeStorefrontHref(value: string | null | undefined) {
  return !value || (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}

export function isSafeStorefrontMediaUrl(value: string | null | undefined) {
  if (!value) return true;
  if (isSafeStorefrontHref(value)) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateSchedule(startsAt?: Date | null, endsAt?: Date | null) {
  if (startsAt && endsAt && startsAt >= endsAt) {
    throw new Error('The end time must be after the start time.');
  }
}

export async function getActiveStorefrontBanner(now = new Date(), db = prisma) {
  const banner = await db.storefrontBanner.findFirst({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
  });

  if (banner) return banner;
  const configuredBannerCount = await db.storefrontBanner.count();
  if (configuredBannerCount > 0) return null;

  return {
    id: 'shipping-threshold-default',
    label: null,
    icon: 'DELIVERY',
    message: `Free standard delivery on orders over £${FREE_STANDARD_DELIVERY_THRESHOLD_MINOR / 100}`,
    ctaLabel: null,
    ctaHref: null,
    active: true,
    startsAt: null,
    endsAt: null,
    sortOrder: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export function getStorefrontBanners(db = prisma) {
  return db.storefrontBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }] });
}

export async function saveStorefrontBanner(id: string | null, input: StorefrontBannerInput, db = prisma) {
  if (!input.message.trim()) throw new Error('Banner message is required.');
  if (!isSafeStorefrontHref(input.ctaHref)) throw new Error('Banner links must be internal storefront paths.');
  if (input.ctaHref && !input.ctaLabel?.trim()) throw new Error('A CTA label is required when a link is supplied.');
  if (input.icon && !STOREFRONT_BANNER_ICONS.includes(input.icon)) throw new Error('Choose a supported banner icon.');
  validateSchedule(input.startsAt, input.endsAt);

  const data = {
    label: input.label?.trim() || null,
    icon: input.icon ?? null,
    message: input.message.trim(),
    ctaLabel: input.ctaLabel?.trim() || null,
    ctaHref: input.ctaHref?.trim() || null,
    active: input.active,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    sortOrder: Math.max(input.sortOrder ?? 0, 0),
  };
  return id
    ? db.storefrontBanner.update({ where: { id }, data })
    : db.storefrontBanner.create({ data });
}

export async function getActiveHomepageHeroPlacements(now = new Date(), db = prisma) {
  const placements = await db.homepageHeroPlacement.findMany({
    where: {
      active: true,
      product: getStorefrontPublicProductWhere(),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    include: {
      selectedProductImage: true,
      product: {
        include: {
          inventory: true,
          images: {
            where: { deletionState: 'ACTIVE' },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    take: 12,
  });

  return placements
    .filter(({ product }) => {
      const inventory = product.inventory;
      return Boolean(inventory && inventory.stockOnHand - inventory.reservedStock > 0);
    })
    .slice(0, 3)
    .map((placement) => {
      const image = resolveProductCardImage(placement.product.images);
      const selectedImage = placement.selectedProductImage?.deletionState === 'ACTIVE'
        && placement.selectedProductImage.productId === placement.productId
        ? placement.selectedProductImage
        : null;
      const selectedImageUrl = selectedImage
        ? resolveProductImageUrl(selectedImage.thumbnailUrl) ?? resolveProductImageUrl(selectedImage.url)
        : null;
      const customImageUrl = selectedImageUrl
        ?? (placement.imageDeletionState === 'ACTIVE'
          ? resolveProductImageUrl(placement.imageUrl)
          : null);
      const useCustomImage = (
        placement.imageSource === 'CUSTOM'
        || (!placement.imageSource && Boolean(placement.imageUrl))
      ) && Boolean(customImageUrl);
      return {
        id: placement.id,
        headline: placement.headline,
        supportingText: placement.supportingText,
        ctaLabel: placement.ctaLabel,
        ctaHref: placement.ctaHref,
        imageUrl: useCustomImage ? customImageUrl : image.url,
        imageAlt: useCustomImage
          ? selectedImage?.altText || placement.imageAlt || `${placement.product.name} hero image`
          : image.image?.altText || `${placement.product.name} product image`,
        displayMode: HERO_DISPLAY_MODES.includes(placement.displayMode as HeroDisplayMode)
          ? placement.displayMode as HeroDisplayMode
          : 'FULL_BLEED',
        focalPoint: HERO_FOCAL_POINTS.includes(placement.focalPoint as HeroFocalPoint)
          ? placement.focalPoint as HeroFocalPoint
          : 'CENTER',
        overlayStrength: HERO_OVERLAY_STRENGTHS.includes(placement.overlayStrength as HeroOverlayStrength)
          ? placement.overlayStrength as HeroOverlayStrength
          : 'BALANCED',
        sortOrder: placement.sortOrder,
        product: {
          id: placement.product.id,
          slug: placement.product.slug,
          name: placement.product.name,
          priceMinor: placement.product.salePriceMinor ?? placement.product.priceMinor,
          stockOnHand: placement.product.inventory?.stockOnHand ?? 0,
          reservedStock: placement.product.inventory?.reservedStock ?? 0,
          freeUkStandardShipping: placement.product.freeUkStandardShipping,
          customerPurchaseLimit: placement.product.customerPurchaseLimit,
        },
      };
    });
}

export function getHomepageHeroPlacements(db = prisma) {
  return db.homepageHeroPlacement.findMany({
    include: {
      selectedProductImage: true,
      product: { select: { id: true, name: true, slug: true, published: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
  });
}

export async function getHeroPlacementProductOptions(db = prisma) {
  const products = await db.product.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      published: true,
      images: {
        where: { deletionState: 'ACTIVE' },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: 500,
  });

  return products.map((product): HeroPlacementProductOption => {
    const image = resolveProductCardImage(product.images);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      published: product.published,
      storefrontPath: buildStorefrontProductPath(product.slug),
      imageUrl: image.url,
      imageAlt: image.image?.altText ?? `${product.name} product image`,
      imageWidth: image.image?.width ?? null,
      imageHeight: image.image?.height ?? null,
      images: product.images.flatMap((item) => {
        const url = resolveProductImageUrl(item.thumbnailUrl) ?? resolveProductImageUrl(item.url);
        return url ? [{
          id: item.id,
          url,
          thumbnailUrl: resolveProductImageUrl(item.thumbnailUrl),
          altText: item.altText,
          isPrimary: item.isPrimary,
          sortOrder: item.sortOrder,
          width: item.width,
          height: item.height,
        }] : [];
      }),
    };
  });
}

export async function saveHomepageHeroPlacement(id: string | null, input: HomepageHeroPlacementInput, db = prisma) {
  if (!input.productId) throw new Error('Choose a product.');
  if (!input.headline.trim()) throw new Error('Hero headline is required.');
  if (input.headline.trim().length > 90) throw new Error('Hero headline must be 90 characters or fewer.');
  if (!input.supportingText.trim()) throw new Error('Hero supporting text is required.');
  if (input.supportingText.trim().length > 180) throw new Error('Hero supporting text must be 180 characters or fewer.');
  if (!input.ctaLabel.trim()) throw new Error('Hero CTA label is required.');
  if (!isSafeStorefrontHref(input.ctaHref) || !input.ctaHref) throw new Error('Hero CTA must use an internal storefront path.');
  if (!isSafeStorefrontMediaUrl(input.imageUrl)) throw new Error('Hero images must use an internal path or secure HTTPS URL.');
  if (input.imageSource && !HERO_IMAGE_SOURCES.includes(input.imageSource)) throw new Error('Choose a valid hero image source.');
  if (input.displayMode && !HERO_DISPLAY_MODES.includes(input.displayMode)) throw new Error('Choose a valid hero display mode.');
  if (input.focalPoint && !HERO_FOCAL_POINTS.includes(input.focalPoint)) throw new Error('Choose a valid hero focal point.');
  if (input.overlayStrength && !HERO_OVERLAY_STRENGTHS.includes(input.overlayStrength)) throw new Error('Choose a valid hero overlay strength.');
  validateSchedule(input.startsAt, input.endsAt);

  const imageSource = input.imageSource ?? (input.imageUrl ? 'CUSTOM' : 'PRODUCT');
  const product = await db.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) throw new Error('The selected product does not exist.');
  if (imageSource === 'CUSTOM' && input.selectedProductImageId) {
    const selectedImage = await db.productImage.findFirst({
      where: {
        id: input.selectedProductImageId,
        productId: input.productId,
        deletionState: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!selectedImage) throw new Error('Choose an active image from the selected product.');
  }

  const data = {
    productId: input.productId,
    headline: input.headline.trim(),
    supportingText: input.supportingText.trim(),
    ctaLabel: input.ctaLabel.trim(),
    ctaHref: input.ctaHref.trim(),
    imageSource,
    displayMode: input.displayMode ?? 'FULL_BLEED',
    focalPoint: input.focalPoint ?? 'CENTER',
    overlayStrength: input.overlayStrength ?? 'BALANCED',
    active: input.active,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    sortOrder: Math.max(input.sortOrder ?? 0, 0),
    ...(imageSource === 'CUSTOM'
      ? input.selectedProductImageId
        ? { selectedProductImageId: input.selectedProductImageId }
        : {
            selectedProductImageId: null,
            imageUrl: input.imageUrl?.trim() || null,
            imageAlt: input.imageAlt?.trim() || null,
          }
      : {}),
  };

  return id
    ? db.homepageHeroPlacement.update({ where: { id }, data })
    : db.homepageHeroPlacement.create({
        data: {
          ...data,
          imageUrl: imageSource === 'CUSTOM' ? input.imageUrl?.trim() || null : null,
          imageAlt: imageSource === 'CUSTOM' ? input.imageAlt?.trim() || null : null,
        },
      });
}

export async function setManagedHomepageHeroImage(
  input: ManagedHomepageHeroImageInput,
  db = prisma,
) {
  return db.$transaction(async (tx) => {
    const current = await tx.homepageHeroPlacement.findUnique({
      where: { id: input.placementId },
      select: { id: true, imageStorageKey: true },
    });
    if (!current) throw new Error('Hero placement not found.');
    const placement = await tx.homepageHeroPlacement.update({
      where: { id: input.placementId },
      data: {
        imageSource: 'CUSTOM',
        selectedProductImageId: null,
        imageUrl: input.url,
        imageAlt: input.altText.trim(),
        imageStorageKey: input.storageKey,
        imageThumbnailUrl: input.thumbnailUrl,
        imageWidth: input.width,
        imageHeight: input.height,
        imageMimeType: input.mimeType,
        imageByteSize: input.byteSize,
        imageUploadedAt: new Date(),
        imageUploadedById: input.uploadedById,
        imageDeletionState: 'ACTIVE',
      },
    });
    return { placement, previousStorageKey: current.imageStorageKey };
  });
}

export async function detachHomepageHeroImage(placementId: string, db = prisma) {
  return db.$transaction(async (tx) => {
    const current = await tx.homepageHeroPlacement.findUnique({
      where: { id: placementId },
      select: { id: true, productId: true, imageStorageKey: true },
    });
    if (!current) throw new Error('Hero placement not found.');
    await tx.homepageHeroPlacement.update({
      where: { id: placementId },
      data: {
        imageSource: 'PRODUCT',
        selectedProductImageId: null,
        imageUrl: null,
        imageAlt: null,
        imageStorageKey: null,
        imageThumbnailUrl: null,
        imageWidth: null,
        imageHeight: null,
        imageMimeType: null,
        imageByteSize: null,
        imageUploadedAt: null,
        imageUploadedById: null,
        imageDeletionState: 'ACTIVE',
      },
    });
    return current;
  });
}

export async function recordHomepageHeroImageCleanupFailure(
  productId: string,
  objectKey: string,
  message: string,
  db = prisma,
) {
  await db.productImageCleanup.create({
    data: {
      productId,
      objectKey,
      attempts: 1,
      lastError: message.slice(0, 500),
    },
  });
}

export async function getShopLandingPage(scopeKey: ShopLandingScope, db = prisma) {
  const saved = await db.shopLandingPage.findUnique({ where: { scopeKey } });
  const defaults = SHOP_LANDING_DEFAULTS[scopeKey];
  return saved ?? {
    id: null,
    scopeKey,
    ...defaults,
    seoTitle: null,
    metaDescription: null,
    active: true,
    featuredProductId: null,
    heroImageUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function getPublicShopLandingPage(scopeKey: ShopLandingScope, db = prisma) {
  const content = await getShopLandingPage(scopeKey, db);
  if (!content.id || content.active) return content;
  const defaults = SHOP_LANDING_DEFAULTS[scopeKey];
  return {
    id: null,
    scopeKey,
    ...defaults,
    seoTitle: null,
    metaDescription: null,
    active: true,
    featuredProductId: null,
    heroImageUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}

export function getShopLandingPages(db = prisma) {
  return db.shopLandingPage.findMany({ orderBy: { scopeKey: 'asc' } });
}

export async function saveShopLandingPage(input: ShopLandingPageInput, db = prisma) {
  if (!(input.scopeKey in SHOP_LANDING_DEFAULTS)) throw new Error('Choose a supported shop department.');
  if (!input.heading.trim()) throw new Error('Shop heading is required.');
  if (!input.supportingText.trim()) throw new Error('Shop supporting text is required.');
  if (!isSafeStorefrontMediaUrl(input.heroImageUrl)) throw new Error('Landing images must use an internal path or secure HTTPS URL.');
  if (input.featuredProductId) {
    const product = await db.product.findUnique({ where: { id: input.featuredProductId }, select: { id: true } });
    if (!product) throw new Error('The selected featured product does not exist.');
  }

  return db.shopLandingPage.upsert({
    where: { scopeKey: input.scopeKey },
    create: {
      ...input,
      heading: input.heading.trim(),
      supportingText: input.supportingText.trim(),
      seoTitle: input.seoTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      featuredProductId: input.featuredProductId?.trim() || null,
      heroImageUrl: input.heroImageUrl?.trim() || null,
    },
    update: {
      heading: input.heading.trim(),
      supportingText: input.supportingText.trim(),
      seoTitle: input.seoTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      active: input.active,
      featuredProductId: input.featuredProductId?.trim() || null,
      heroImageUrl: input.heroImageUrl?.trim() || null,
    },
  });
}
