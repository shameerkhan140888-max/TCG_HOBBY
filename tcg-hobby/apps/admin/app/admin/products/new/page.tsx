import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getAdminProducts, getCatalogueMasterDataOptions } from '@tcg-hobby/database';
import { ProductForm } from '../../../../components/product-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const [options, masterData] = await Promise.all([
    getAdminProducts({ page: 1, pageSize: 1, sort: 'newest' }),
    getCatalogueMasterDataOptions(),
  ]);

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue" title="New product" description="Create a publishable catalogue record with stock and supplier links." />
        <ProductForm
          categories={options.categories.map((item) => ({ id: item.id, label: item.name }))}
          suppliers={options.suppliers.map((item) => ({ id: item.id, label: item.name }))}
          games={masterData.games.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          brands={masterData.brands.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          productTypes={masterData.productTypes.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          languages={masterData.languages.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          sets={masterData.sets.map((item) => ({ id: item.id, label: item.name, active: item.active, gameId: item.gameId }))}
          submitLabel="Create product"
        />
      </Container>
    </Section>
  );
}
