import type { MetadataRoute } from 'next';
import { ironSprueBrand } from '../lib/brand';

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.STOREFRONT_ACCESS_MODE !== 'public') return [];

  return [
    { url: ironSprueBrand.siteUrl, lastModified: new Date() },
    { url: `${ironSprueBrand.siteUrl}/shop`, lastModified: new Date() },
  ];
}
