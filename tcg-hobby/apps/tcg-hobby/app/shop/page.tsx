import type { Metadata } from 'next';
import { getPublicShopLandingPage } from '@capital-hobby/database/storefront';
import { CataloguePageView } from '../catalogue/page';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicShopLandingPage('shop').catch(() => null);
  return {
    title: content?.seoTitle || 'Shop Trading Cards | TCG Hobby',
    description: content?.metaDescription || content?.supportingText,
    alternates: { canonical: '/shop' },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const content = await getPublicShopLandingPage('shop').catch(() => null);
  const copy = content
    ? { title: content.heading, description: content.supportingText }
    : {};
  return (
    <CataloguePageView
      searchParams={searchParams}
      basePath="/shop"
      {...copy}
    />
  );
}
