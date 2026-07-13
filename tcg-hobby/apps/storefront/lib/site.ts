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
export const legalCompanyName = 'Capital Hobby Group Ltd';
export const legalTradingName = 'TCG Hobby';
export const legalCompanyDescription = 'Capital Hobby Group Ltd trading as TCG Hobby.';
export const legalCompanyNumber = '17336948';
export const legalRegisteredOffice = ['4-6 Greatorex Street', 'London', 'United Kingdom', 'E1 5NF'] as const;
export const primaryContactEmail = 'info@tcg-hobby.co.uk';
export const supportEmail = 'support@tcg-hobby.co.uk';
export const siteDescription =
  'Premium trading card launches, sealed product drops, collector tools, and player-ready TCG releases.';
export const launchDescription =
  'TCG Hobby is preparing a premium trading card launch experience for sealed product drops, preorders, releases, and opening updates.';

export type SiteSocialLink = {
  label: 'Instagram' | 'TikTok' | 'X';
  href: string;
};

function getConfiguredUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getSiteSocialLinks(): SiteSocialLink[] {
  const instagramUrl = getConfiguredUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL);
  const tiktokUrl = getConfiguredUrl(process.env.NEXT_PUBLIC_TIKTOK_URL);
  const xUrl = getConfiguredUrl(process.env.NEXT_PUBLIC_X_URL);
  const links: Array<SiteSocialLink | null> = [
    instagramUrl ? { label: 'Instagram', href: instagramUrl } : null,
    tiktokUrl ? { label: 'TikTok', href: tiktokUrl } : null,
    xUrl ? { label: 'X', href: xUrl } : null,
  ];

  return links.filter((link): link is SiteSocialLink => Boolean(link));
}
