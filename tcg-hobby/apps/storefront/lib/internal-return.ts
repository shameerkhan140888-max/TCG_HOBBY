export function resolveInternalReturnTo(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  if (/[\u0000-\u001F\u007F\\]/.test(value)) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://tcg-hobby.local');
    if (parsed.origin !== 'https://tcg-hobby.local') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
