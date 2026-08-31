const IRON_SPRUE_MEDIA_ROUTE_PREFIX = '/media/iron-sprue/';

export const IRON_SPRUE_DISPLAY_MEDIA_WIDTHS = [320, 480, 640, 960, 1400] as const;

export type IronSprueDisplayMediaWidth = (typeof IRON_SPRUE_DISPLAY_MEDIA_WIDTHS)[number];

export function isIronSprueMediaRoute(value: string | null | undefined) {
  return Boolean(value?.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX));
}

export function ironSprueDisplayMediaUrl(value: string | null | undefined, width: IronSprueDisplayMediaWidth) {
  if (!value || !isIronSprueMediaRoute(value)) return value ?? '';
  const [path, query = ''] = value.split('?');
  const params = new URLSearchParams(query);
  params.set('w', String(width));
  return `${path}?${params.toString()}`;
}

export function ironSprueDisplayMediaSrcSet(value: string | null | undefined, widths: readonly IronSprueDisplayMediaWidth[] = IRON_SPRUE_DISPLAY_MEDIA_WIDTHS) {
  if (!value || !isIronSprueMediaRoute(value)) return undefined;
  return widths.map((width) => `${ironSprueDisplayMediaUrl(value, width)} ${width}w`).join(', ');
}
