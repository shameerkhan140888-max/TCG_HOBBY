import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getAdminProducts } from '@tcg-hobby/database';
import { ProductForm } from '../../../../components/product-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const options = await getAdminProducts({ page: 1, pageSize: 1, sort: 'newest' });

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue" title="New product" description="Create a publishable catalogue record with stock and supplier links." />
        <ProductForm
          categories={options.categories.map((item) => ({ id: item.id, label: item.name }))}
          suppliers={options.suppliers.map((item) => ({ id: item.id, label: item.name }))}
          submitLabel="Create product"
        />
      </Container>
    </Section>
  );
}
