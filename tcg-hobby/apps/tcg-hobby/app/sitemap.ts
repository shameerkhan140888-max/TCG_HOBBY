import type { MetadataRoute } from 'next';
import { getSiteUrl, isComingSoonMode } from '../lib/site';

const commerceRoutes = [
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

const launchRoutes = [
  '/',
  '/coming-soon',
  '/about',
  '/contact',
  '/shipping',
  '/returns',
  '/privacy',
  '/terms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const routes = isComingSoonMode() ? launchRoutes : commerceRoutes;

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
