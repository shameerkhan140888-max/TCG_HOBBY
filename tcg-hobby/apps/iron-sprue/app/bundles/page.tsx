import { CatalogueListing } from '../../components/catalogue-listing';

export const dynamic = 'force-dynamic';

export default async function BundlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CatalogueListing
      eyebrow="Bundle savings"
      lead="Current Iron Sprue bundle savings across kits, display builds and practical bench additions."
      searchParams={{ ...(await searchParams), offers: 'true' }}
      title="Bundle savings"
    />
  );
}
