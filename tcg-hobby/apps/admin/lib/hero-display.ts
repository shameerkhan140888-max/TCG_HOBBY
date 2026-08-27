import type { HeroDisplayMode, HeroImageSource } from '@capital-hobby/database';

export function getRecommendedHeroDisplayMode(
  imageWidth: number | null | undefined,
  imageHeight: number | null | undefined,
): HeroDisplayMode {
  if (!imageWidth || !imageHeight) return 'FULL_BLEED';
  return imageWidth < imageHeight ? 'CONTAINED' : 'FULL_BLEED';
}

export function resolveHeroPreviewImage(input: {
  imageSource: HeroImageSource;
  customImageUrl?: string | null;
  customImageAlt?: string | null;
  selectedImage?: { url: string; altText: string } | null;
  productImage?: { url: string | null; altText: string } | null;
}) {
  if (input.imageSource === 'CUSTOM') {
    const customUrl = input.selectedImage?.url || input.customImageUrl?.trim();
    if (customUrl) {
      return {
        url: customUrl,
        alt: input.selectedImage?.altText || input.customImageAlt?.trim() || input.productImage?.altText || 'Hero preview',
        fallbackUsed: false,
      };
    }
  }
  return {
    url: input.productImage?.url || '',
    alt: input.productImage?.altText || 'Hero preview',
    fallbackUsed: input.imageSource === 'CUSTOM',
  };
}
