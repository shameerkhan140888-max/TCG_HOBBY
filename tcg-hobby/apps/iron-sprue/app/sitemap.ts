import type { MetadataRoute } from 'next';
import launchProducts from '../data/launch-products.json';
import { getIronSprueStorefrontProducts } from '../lib/admin-storefront-controls';
import { ironSprueBrand } from '../lib/brand';
import { type IronSprueProduct } from '../lib/catalogue';
import { categoryNavigation, slugForCategory } from '../lib/storefront';

const products = launchProducts as IronSprueProduct[];
const siteUrl = ironSprueBrand.siteUrl.replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.STOREFRONT_ACCESS_MODE === 'protected') return [];
  const storefrontProducts = await getIronSprueStorefrontProducts(products);
  const categoryUrls = categoryNavigation.map((item) => `${siteUrl}/shop/${slugForCategory(item.label)}`);
  const productUrls = storefrontProducts
    .filter((product) => product.storeCode === 'IRON_SPRUE')
    .map((product) => `${siteUrl}/products/${product.slug}`);

  return Array.from(new Set([
    siteUrl,
    `${siteUrl}/shop`,
    `${siteUrl}/bundles`,
    `${siteUrl}/brands`,
    ...categoryUrls,
    ...productUrls,
    `${siteUrl}/about`,
    `${siteUrl}/delivery`,
    `${siteUrl}/returns`,
    `${siteUrl}/contact`,
    `${siteUrl}/privacy`,
    `${siteUrl}/terms`,
    `${siteUrl}/cookies`,
  ])).map((url) => ({ url }));
}
