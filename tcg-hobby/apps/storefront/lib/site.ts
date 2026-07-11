export type StorefrontMode = 'storefront' | 'coming-soon';

const defaultSiteUrl = 'http://localhost:3000';

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? defaultSiteUrl;

  try {
    return new URL(value).origin;
  } catch {
    return defaultSiteUrl;
  }
}

export function getStorefrontMode(): StorefrontMode {
  return process.env.TCG_HOBBY_STOREFRONT_MODE === 'coming-soon' ? 'coming-soon' : 'storefront';
}

export function isComingSoonMode() {
  return getStorefrontMode() === 'coming-soon';
}

export const siteName = 'TCG Hobby';
export const siteDescription =
  'Premium trading card launches, sealed product drops, collector tools, and player-ready TCG releases.';
export const launchDescription =
  'TCG Hobby is preparing a premium trading card launch experience for sealed product drops, preorders, releases, and opening updates.';
