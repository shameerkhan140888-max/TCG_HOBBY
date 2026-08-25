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

const IRON_SPRUE_MEDIA_ROUTE_PREFIX = '/media/iron-sprue/';
const IRON_SPRUE_MEDIA_PUBLIC_HOSTS = new Set(['media.ironsprue.co.uk']);

function encodedStorageKeyPath(storageKey: string) {
  return storageKey.split('/').map(encodeURIComponent).join('/');
}

export function ironSprueMediaProxyPath(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) return raw;
  if (raw.startsWith('r2://')) {
    const key = raw.slice('r2://'.length).replace(/^\/+/, '');
    return key ? `${IRON_SPRUE_MEDIA_ROUTE_PREFIX}${encodedStorageKeyPath(key)}` : null;
  }

  try {
    const parsed = new URL(raw);
    if (!IRON_SPRUE_MEDIA_PUBLIC_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    const key = parsed.pathname.replace(/^\/+/, '');
    return key ? `${IRON_SPRUE_MEDIA_ROUTE_PREFIX}${key}` : null;
  } catch {
    return null;
  }
}

export function resolveIronSprueStorefrontMediaUrl(value: string | null | undefined, storefrontBaseUrl?: string | null) {
  const proxyPath = ironSprueMediaProxyPath(value);
  if (!proxyPath) return value?.trim() || null;
  const base = storefrontBaseUrl?.trim().replace(/\/+$/, '');
  return base ? new URL(proxyPath, base).toString() : proxyPath;
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
