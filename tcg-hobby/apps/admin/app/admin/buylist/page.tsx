import { Button, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, EmptyTableState, PageHeader, SearchToolbar } from '@tcg-hobby/ui';
import { BuylistStatusBadge, PriceBadge } from '@tcg-hobby/ui';
import { getAdminBuylists } from '@tcg-hobby/database';

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
  return query ? `/admin/buylist?${query}` : '/admin/buylist';
}

export default async function AdminBuylistPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.search);
  const status = asString(params.status);
  const page = Number.parseInt(asString(params.page) || '1', 10);
  const selectedStatus =
    status === 'SUBMITTED' || status === 'RECEIVED' || status === 'UNDER_REVIEW' || status === 'APPROVED' || status === 'REJECTED' || status === 'PAID'
      ? status
      : 'ALL';
  const data = await getAdminBuylists({ search, status: selectedStatus, page: Number.isFinite(page) ? page : 1, pageSize: 20 });
  const current = { search, status };

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Buylist"
          title="Buylist submissions"
          description="Review customer trade-ins, inspect payout estimates, and move submissions through the intake workflow."
        />

        <SearchToolbar searchValue={search} searchPlaceholder="Search buylist number, customer, or notes">
          <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
            Status
            <select
              name="status"
              defaultValue={status}
              className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RECEIVED">Received</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
          </label>
        </SearchToolbar>

        {data.buylists.length ? (
          <AdminTable columns={['Buylist', 'Customer', 'Status', 'Estimated', 'Offered', 'Submitted', 'Actions']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.buylists.map((buylist) => (
                <tr key={buylist.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{buylist.buylistNumber}</div>
                    <div className="text-xs text-neutral-500">{buylist.itemCount} items</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div>{buylist.customerName}</div>
                    <div className="text-xs text-neutral-500">{buylist.customerEmail}</div>
                  </td>
                  <td className="px-4 py-4">
                    <BuylistStatusBadge status={buylist.status} />
                  </td>
                  <td className="px-4 py-4">
                    <PriceBadge label="Estimated" amountMinor={buylist.estimatedPayoutMinor} tone="accent" />
                  </td>
                  <td className="px-4 py-4">
                    <PriceBadge label="Offered" amountMinor={buylist.offeredPayoutMinor} tone="neutral" />
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    {buylist.submittedAt ? buylist.submittedAt.toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/admin/buylist/${buylist.id}`}>Open</a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <EmptyTableState
            title="No buylist submissions found"
            description="Try a different search term or status filter."
            action={
              <Button asChild variant="outline">
                <a href="/admin/buylist">Reset filters</a>
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
