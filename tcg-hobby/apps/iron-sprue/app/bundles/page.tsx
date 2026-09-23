import type { Metadata } from 'next';
import { CatalogueListing } from '../../components/catalogue-listing';
import { ironSprueBrand } from '../../lib/brand';

export const dynamic = 'force-dynamic';
const canonicalUrl = `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/bundles`;

export const metadata: Metadata = {
  title: 'Bundle savings',
  description: 'Shop Iron Sprue bundle savings across selected display builds, kits and practical bench additions.',
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: 'Bundle savings | Iron Sprue',
    description: 'Shop selected Iron Sprue bundle savings for display builds and bench additions.',
    url: canonicalUrl,
    type: 'website',
  },
};

export default async function BundlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CatalogueListing
      eyebrow="Bundle savings"
      lead="Current Iron Sprue bundle savings across kits, display builds and practical bench additions."
      searchParams={{ ...(await searchParams), bundles: 'true' }}
      title="Bundle savings"
    />
  );
}
