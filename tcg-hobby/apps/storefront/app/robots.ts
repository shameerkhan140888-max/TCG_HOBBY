import type { MetadataRoute } from 'next';
import { getSiteUrl, isComingSoonMode } from '../lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (isComingSoonMode()) {
    return {
      rules: [
        {
          userAgent: '*',
          allow: ['/', '/coming-soon', '/about', '/contact', '/privacy', '/terms', '/shipping', '/returns'],
          disallow: ['/account', '/cart', '/checkout', '/catalogue', '/collection', '/decks', '/watchlist', '/buylist'],
        },
      ],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
