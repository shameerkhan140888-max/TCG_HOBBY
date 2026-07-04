import { notFound } from 'next/navigation';
import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, PageHeader, StatusBadge } from '@tcg-hobby/ui';
import { getAdminSupplierById } from '@tcg-hobby/database';
import { SupplierForm } from '../../../../components/supplier-form';

export const dynamic = 'force-dynamic';

type ParamsValue = { id: string };

function supplierState(supplier: NonNullable<Awaited<ReturnType<typeof getAdminSupplierById>>>) {
  return {
    fieldErrors: {},
    values: {
      supplierId: supplier.id,
      name: supplier.name,
      slug: supplier.slug,
      contactName: supplier.contactName ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      website: supplier.website ?? '',
      addressLine1: supplier.addressLine1 ?? '',
      addressLine2: supplier.addressLine2 ?? '',
      city: supplier.city ?? '',
      region: supplier.region ?? '',
      postalCode: supplier.postalCode ?? '',
      country: supplier.country,
      active: supplier.active,
      preferred: supplier.preferred,
      internalNotes: supplier.internalNotes ?? '',
    },
  };
}

export default async function SupplierDetailPage({ params }: { params: Promise<ParamsValue> }) {
  const { id } = await params;
  const supplier = await getAdminSupplierById(id);

  if (!supplier) {
    notFound();
  }

  const state = supplierState(supplier);

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Suppliers"
          title={supplier.name}
          description={supplier.slug}
          actions={
            <Button asChild variant="outline">
              <a href="/admin/suppliers">Back</a>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Status</p>
              <StatusBadge tone={supplier.preferred ? 'accent' : supplier.active ? 'success' : 'neutral'}>
                {supplier.preferred ? 'Preferred' : supplier.active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Contact</p>
              <p className="text-sm text-neutral-50">{supplier.contactName ?? 'No contact'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Products supplied</p>
              <p className="text-2xl font-black text-neutral-50">{supplier.products.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Country</p>
              <p className="text-2xl font-black text-neutral-50">{supplier.country}</p>
            </CardContent>
          </Card>
        </div>

        <SupplierForm state={state} submitLabel="Save supplier" />

        <AdminTable columns={['Product', 'SKU', 'Cost', 'Lead time', 'Active']}>
          <tbody className="divide-y divide-surface-line bg-surface-base">
            {supplier.products.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4 text-neutral-50">{item.productName}</td>
                <td className="px-4 py-4 text-neutral-300">{item.supplierSku}</td>
                <td className="px-4 py-4 text-neutral-300">GBP {(item.costMinor / 100).toFixed(2)}</td>
                <td className="px-4 py-4 text-neutral-300">{item.leadTimeDays} days</td>
                <td className="px-4 py-4 text-neutral-300">{item.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </Container>
    </Section>
  );
}
