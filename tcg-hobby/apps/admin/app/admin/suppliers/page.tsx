import { Button, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, EmptyTableState, PageHeader, SearchToolbar, StatusBadge } from '@tcg-hobby/ui';
import { getAdminSuppliers } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function buildHref(current: Record<string, string>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/admin/suppliers?${query}` : '/admin/suppliers';
}

export default async function AdminSuppliersPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.search);
  const sort = asString(params.sort) as 'name-asc' | 'name-desc' | 'recent' | '';
  const page = Number.parseInt(asString(params.page) || '1', 10);
  const data = await getAdminSuppliers({ search, sort: sort || 'name-asc', page: Number.isFinite(page) ? page : 1, pageSize: 20 });
  const current = { search, sort: sort || 'name-asc' };

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Suppliers"
          title="Supplier management"
          description="Maintain supplier contacts, preference state, notes, and supplied product relationships."
          actions={
            <Button asChild>
              <a href="/admin/suppliers/new">New supplier</a>
            </Button>
          }
        />

        <SearchToolbar searchValue={search} searchPlaceholder="Search supplier name, contact, or email">
          <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
            Sort
            <select name="sort" defaultValue={sort || 'name-asc'} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="recent">Recently added</option>
            </select>
          </label>
        </SearchToolbar>

        {data.suppliers.length ? (
          <AdminTable columns={['Supplier', 'Contact', 'Status', 'Products', 'Actions']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{supplier.name}</div>
                    <div className="text-xs text-neutral-500">{supplier.slug}</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div>{supplier.contactName ?? 'No contact'}</div>
                    <div className="text-xs text-neutral-500">{supplier.email ?? 'No email'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={supplier.preferred ? 'accent' : supplier.active ? 'success' : 'neutral'}>
                        {supplier.preferred ? 'Preferred' : supplier.active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{supplier.productCount}</td>
                  <td className="px-4 py-4">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/admin/suppliers/${supplier.id}`}>Open</a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <EmptyTableState
            title="No suppliers found"
            description="Try another search or create the first supplier record."
            action={
              <Button asChild variant="outline">
                <a href="/admin/suppliers/new">Create supplier</a>
              </Button>
            }
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-400">
          <p>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            {data.pagination.hasPreviousPage ? (
              <Button asChild variant="outline" size="sm">
                <a href={buildHref(current, { page: String(data.pagination.page - 1) })}>Previous</a>
              </Button>
            ) : null}
            {data.pagination.hasNextPage ? (
              <Button asChild variant="outline" size="sm">
                <a href={buildHref(current, { page: String(data.pagination.page + 1) })}>Next</a>
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
