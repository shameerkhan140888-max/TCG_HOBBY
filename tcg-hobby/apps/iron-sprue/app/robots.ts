import type { MetadataRoute } from 'next';
import { ironSprueBrand } from '../lib/brand';

export default function robots(): MetadataRoute.Robots {
  if (process.env.STOREFRONT_ACCESS_MODE !== 'public') {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${ironSprueBrand.siteUrl}/sitemap.xml`,
  };
}
