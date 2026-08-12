import { CatalogueListing } from '../../components/catalogue-listing';

export const dynamic = 'force-dynamic';

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogueListing searchParams={await searchParams} />;
}
