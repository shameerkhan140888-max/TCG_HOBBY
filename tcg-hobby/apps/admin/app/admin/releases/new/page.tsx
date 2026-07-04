import { Container, PageHeader } from '@tcg-hobby/ui';
import { getAdminProducts, getCatalogueCategories } from '@tcg-hobby/database';
import { ReleaseForm } from '../../../../components/release-form';
import { createReleaseAction } from '../../../../lib/releases';

export const dynamic = 'force-dynamic';

export default async function NewReleasePage() {
  const [categories, products] = await Promise.all([
    getCatalogueCategories(),
    getAdminProducts({ search: '', category: '', page: 1, pageSize: 48 }).then((result) => result.products),
  ]);

  return (
    <section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Releases"
          title="Create release"
          description="Create a new preorder or coming soon release and link the relevant products."
        />
        <ReleaseForm action={createReleaseAction} submitLabel="Create release" categories={categories} products={products} />
      </Container>
    </section>
  );
}
