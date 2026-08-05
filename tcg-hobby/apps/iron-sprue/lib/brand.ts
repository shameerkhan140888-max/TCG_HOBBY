export const ironSprueBrand = {
  name: 'Iron Sprue',
  legalEntity: 'Capital Hobby Group Ltd',
  instagramHandle: '@iron.sprue',
  instagramUrl: 'https://www.instagram.com/iron.sprue/',
  logoPath: '/brand/iron-sprue-horizontal.svg',
  contactEmail: 'info@ironsprue.co.uk',
  siteUrl: process.env.IRON_SPRUE_SITE_URL ?? process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'https://www.ironsprue.co.uk',
} as const;

export const ironSprueNavigation = [
  { label: 'Shop', href: '/shop' },
  { label: 'Brands', href: '/brands' },
  { label: 'Delivery', href: '/delivery' },
  { label: 'Contact', href: '/contact' },
] as const;
