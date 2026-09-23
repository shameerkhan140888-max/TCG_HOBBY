import type { MetadataRoute } from 'next';
import { ironSprueBrand } from '../lib/brand';

export default function robots(): MetadataRoute.Robots {
  if (process.env.STOREFRONT_ACCESS_MODE === 'protected') {
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
