import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type ProductImageSource = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
  deletionState?: string | null;
};

function localPublicImageExists(url: string): boolean {
  if (!url.startsWith('/')) return false;
  const relativePath = url.replace(/^\/+/, '').replace(/\//g, join('/'));
  return [join(process.cwd(), 'public', relativePath), join(process.cwd(), 'apps', 'storefront', 'public', relativePath)].some((path) => existsSync(path));
}

export function resolveProductImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return localPublicImageExists(url) ? url : null;
}

export function orderActiveProductImages<T extends ProductImageSource>(images: readonly T[]): T[] {
  return images
    .filter((image) => !image.deletionState || image.deletionState === 'ACTIVE')
    .slice()
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

export function selectPrimaryProductImage<T extends ProductImageSource>(images: readonly T[]): T | null {
  return orderActiveProductImages(images)[0] ?? null;
}

export function resolveProductCardImage<T extends ProductImageSource>(images: readonly T[]): { image: T | null; url: string | null } {
  const image = selectPrimaryProductImage(images);
  return { image, url: resolveProductImageUrl(image?.thumbnailUrl) ?? resolveProductImageUrl(image?.url) };
}
