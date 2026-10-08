const DEFAULT_PRODUCTION_ALLOWED_ORIGINS = [
  'https://ironsprue.co.uk',
  'https://www.ironsprue.co.uk',
  'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev',
  'https://tcg-hobby.co.uk',
  'https://www.tcg-hobby.co.uk',
  'https://admin.capitalhobbygroup.co.uk',
] as const;

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

export function resolveAllowedCorsOrigins(value: string | undefined, nodeEnv = process.env.NODE_ENV): string[] {
  const configuredOrigins = parseAllowedOrigins(value);
  if (configuredOrigins.length > 0 || nodeEnv !== 'production') {
    return configuredOrigins;
  }

  return [...DEFAULT_PRODUCTION_ALLOWED_ORIGINS];
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
  options: { allowAnyWhenUnconfigured?: boolean } = {},
): boolean {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return Boolean(options.allowAnyWhenUnconfigured);

  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && allowedOrigins.includes(normalizedOrigin));
}

function normalizeOrigin(origin: string): string | null {
  const trimmed = origin.trim().replace(/\/$/, '');
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
