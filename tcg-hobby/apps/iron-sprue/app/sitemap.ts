import type { MetadataRoute } from 'next';
import launchProducts from '../data/launch-products.json';
import { getIronSprueStorefrontProducts } from '../lib/admin-storefront-controls';
import { ironSprueBrand } from '../lib/brand';
import { type IronSprueProduct } from '../lib/catalogue';

const products = launchProducts as IronSprueProduct[];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.STOREFRONT_ACCESS_MODE === 'protected') return [];
  const storefrontProducts = await getIronSprueStorefrontProducts(products);

  return [
    { url: ironSprueBrand.siteUrl, lastModified: new Date() },
    { url: `${ironSprueBrand.siteUrl}/shop`, lastModified: new Date() },
    { url: `${ironSprueBrand.siteUrl}/brands`, lastModified: new Date() },
    { url: `${ironSprueBrand.siteUrl}/about`, lastModified: new Date() },
    { url: `${ironSprueBrand.siteUrl}/delivery`, lastModified: new Date() },
    { url: `${ironSprueBrand.siteUrl}/returns`, lastModified: new Date() },
    ...storefrontProducts
      .filter((product) => product.storeCode === 'IRON_SPRUE')
      .map((product) => ({
        url: `${ironSprueBrand.siteUrl}/products/${product.slug}`,
        lastModified: new Date(),
      })),
  ];
}
