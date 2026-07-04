import { notFound } from 'next/navigation';
import { Container, PageHeader, DataCard } from '@tcg-hobby/ui';
import { getAdminProducts, getCatalogueCategories } from '@tcg-hobby/database';
import { ReleaseForm } from '../../../../components/release-form';
import { getCurrentAdminRelease, updateReleaseAction } from '../../../../lib/releases';

export const dynamic = 'force-dynamic';

type ParamsValue = { id: string };

export default async function ReleaseDetailPage({ params }: { params: Promise<ParamsValue> }) {
  const { id } = await params;
  const [release, categories, products] = await Promise.all([
    getCurrentAdminRelease(id),
    getCatalogueCategories(),
    getAdminProducts({ search: '', category: '', page: 1, pageSize: 48 }).then((result) => result.products),
  ]);

  if (!release) {
    notFound();
  }

  return (
    <section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Releases"
          title={release.name}
          description="Read and update the release metadata that powers the customer launch surfaces."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataCard title="Brand" value={release.brand} detail={release.game} />
          <DataCard title="Products" value={String(release.productCount)} detail="Linked release products" />
          <DataCard title="Launch" value={new Date(release.releaseDate).toLocaleDateString('en-GB')} detail={release.featuredOnHomepage ? 'Homepage featured' : 'Not featured'} />
          <DataCard title="Visibility" value={release.visible ? 'Visible' : 'Hidden'} detail={release.preorderProductCount > 0 ? 'Pre-order open' : 'Coming soon'} />
        </div>

        <ReleaseForm action={updateReleaseAction} submitLabel="Save release" release={release} categories={categories} products={products} />
      </Container>
    </section>
  );
}
