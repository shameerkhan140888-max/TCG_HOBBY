import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { ironSprueBrand } from '../lib/brand';
import { shouldNoindexStorefrontHost } from '../lib/staging-access';

export function robotsForHost(hostname: string): MetadataRoute.Robots {
  if (shouldNoindexStorefrontHost(hostname)) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account',
        '/admin',
        '/api',
        '/basket',
        '/checkout',
        '/dev',
        '/login',
        '/register',
        '/reset-password',
        '/forgot-password',
        '/typography-showcase',
        '/wishlist',
      ],
    }],
    sitemap: `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const host = headerStore.get('host')?.split(':')[0] || 'localhost';
  return robotsForHost(host);
}
