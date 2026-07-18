import { buildStorefrontProductPath } from '@tcg-hobby/utils';

const defaultStorefrontUrl = process.env.NODE_ENV === 'production' ? 'https://tcg-hobby.co.uk' : 'http://localhost:3000';

export function getStorefrontUrl(): string {
  const value = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? process.env.STOREFRONT_URL ?? defaultStorefrontUrl;

  try {
    return new URL(value).origin;
  } catch {
    return defaultStorefrontUrl;
  }
}

export function buildStorefrontProductPreviewUrl(slug: string): string {
  return new URL(buildStorefrontProductPath(slug), getStorefrontUrl()).toString();
}
