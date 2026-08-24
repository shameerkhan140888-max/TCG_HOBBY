export function resolveIronSpruePublicMediaUrl(asset: { url?: string | null; storageKey?: string | null } | null | undefined): string | null {
  if (!asset) return null;

  const storageKeyFromUrl = asset.url?.trim().startsWith('r2://')
    ? asset.url.trim().slice('r2://'.length).replace(/^\/+/, '')
    : null;
  const storageKey = (storageKeyFromUrl ?? asset.storageKey?.trim().replace(/^\/+/, '') ?? '').trim();

  if (storageKey) {
    const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/');
    const publicBaseUrl = process.env.IRON_SPRUE_R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
    return publicBaseUrl ? `${publicBaseUrl}/${encodedKey}` : `/media/iron-sprue/${encodedKey}`;
  }

  const rawUrl = asset.url?.trim();
  return rawUrl || null;
}

export function isIronSprueDisplayableImageAsset(
  asset: { url?: string | null; storageKey?: string | null; mimeType?: string | null } | null | undefined,
): boolean {
  if (!asset) return false;
  const mimeType = asset.mimeType?.trim().toLowerCase();
  if (mimeType) return mimeType.startsWith('image/');

  const mediaPath = ((asset.url ?? asset.storageKey ?? '').split('?')[0] ?? '').trim().toLowerCase();
  return /\.(avif|gif|jpe?g|png|svg|webp)$/.test(mediaPath);
}

export function inferIronSprueImageMimeType(storageKey: string) {
  const key = storageKey.toLowerCase();
  if (key.endsWith('.avif')) return 'image/avif';
  if (key.endsWith('.gif')) return 'image/gif';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.svg')) return 'image/svg+xml';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
