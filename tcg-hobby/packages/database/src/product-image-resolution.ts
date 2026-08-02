import { existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

export type ProductImageSource = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  storageKey?: string | null;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
  deletionState?: string | null;
};

function localPublicImageExists(url: string): boolean {
  if (!url.startsWith('/')) return false;
  const relativePath = url.replace(/^\/+/, '').split('/').filter(Boolean);
  let current = resolve(process.cwd());

  while (true) {
    for (const publicRoot of [join(current, 'public'), join(current, 'apps', 'tcg-hobby', 'public')]) {
      const target = resolve(publicRoot, ...relativePath);
      if ((target === publicRoot || target.startsWith(`${publicRoot}${sep}`)) && existsSync(target)) {
        return true;
      }
    }
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

export function resolveProductImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return localPublicImageExists(url) ? url : null;
}

export function orderActiveProductImages<T extends ProductImageSource>(images: readonly T[] = []): T[] {
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

export function resolveOrderLineImage<T extends ProductImageSource>(
  snapshot: { imageUrl?: string | null; imageAlt?: string | null; imageStorageKey?: string | null },
  productImages: readonly T[],
): { url: string | null; altText: string | null; storageKey: string | null } {
  const snapshotUrl = resolveProductImageUrl(snapshot.imageUrl);
  if (snapshotUrl) {
    return {
      url: snapshotUrl,
      altText: snapshot.imageAlt?.trim() || null,
      storageKey: snapshot.imageStorageKey?.trim() || null,
    };
  }

  const current = resolveProductCardImage(productImages);
  return {
    url: current.url,
    altText: snapshot.imageAlt?.trim() || current.image?.altText || null,
    storageKey: snapshot.imageStorageKey?.trim() || current.image?.storageKey || null,
  };
}
