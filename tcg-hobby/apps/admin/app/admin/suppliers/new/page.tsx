import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { SupplierForm } from '../../../../components/supplier-form';

export const dynamic = 'force-dynamic';

export default function NewSupplierPage() {
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Suppliers" title="New supplier" description="Capture the supplier record before connecting product supply lines." />
        <SupplierForm submitLabel="Create supplier" />
      </Container>
    </Section>
  );
}
