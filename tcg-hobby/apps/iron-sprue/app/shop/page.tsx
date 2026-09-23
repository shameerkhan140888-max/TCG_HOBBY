import type { Metadata } from 'next';
import { CatalogueListing } from '../../components/catalogue-listing';
import { ironSprueBrand } from '../../lib/brand';

export const dynamic = 'force-dynamic';

function hasIndexableQuery(searchParams: Record<string, string | string[] | undefined>) {
  return Object.values(searchParams).some((value) => (
    Array.isArray(value) ? value.some(Boolean) : Boolean(value)
  ));
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const hasQuery = hasIndexableQuery(resolvedSearchParams);
  return {
    title: hasQuery ? 'Filtered model kits and hobby products' : 'Shop model kits, 3D puzzles and hobby tools',
    description: 'Browse Iron Sprue model kits, 3D puzzle builds, tools, adhesives and finishing products stocked for UK hobby builders.',
    alternates: { canonical: `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/shop` },
    robots: hasQuery ? { index: false, follow: true } : undefined,
    openGraph: {
      title: 'Shop model kits, 3D puzzles and hobby tools',
      description: 'Browse the Iron Sprue range of kits, builds and workshop essentials.',
      url: `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/shop`,
      type: 'website',
    },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogueListing searchParams={await searchParams} />;
}
