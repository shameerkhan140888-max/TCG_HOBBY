import { Container, Section } from '@capital-hobby/ui';
import { PageHeader } from '@capital-hobby/ui';
import { ProductCsvImportForm } from '../../../../components/product-csv-import-form';

export const dynamic = 'force-dynamic';

export default function ProductCsvImportPage() {
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Catalogue"
          title="Product CSV import"
          description="Validate, preview and import launch inventory without direct database editing."
        />

        <ProductCsvImportForm />
      </Container>
    </Section>
  );
}
