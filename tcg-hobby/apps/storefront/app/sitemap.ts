import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const routes = [
  '/',
  '/catalogue',
  '/coming-soon',
  '/releases',
  '/buylist',
  '/about',
  '/contact',
  '/returns',
  '/shipping',
  '/privacy',
  '/terms',
  '/collection',
  '/collection/insights',
  '/decks',
  '/watchlist',
  '/login',
  '/register',
  '/cart',
  '/checkout',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
