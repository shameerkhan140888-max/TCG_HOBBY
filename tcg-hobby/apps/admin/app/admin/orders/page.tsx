import { Button, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, EmptyTableState, PageHeader, SearchToolbar, StatusBadge } from '@tcg-hobby/ui';
import { getAdminOrders } from '@tcg-hobby/database';

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
  return query ? `/admin/orders?${query}` : '/admin/orders';
}

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.search);
  const status = asString(params.status);
  const paymentStatus = asString(params.paymentStatus);
  const page = Number.parseInt(asString(params.page) || '1', 10);
  const data = await getAdminOrders({ search, status, paymentStatus, page: Number.isFinite(page) ? page : 1, pageSize: 20 });
  const current = { search, status, paymentStatus };

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Orders" title="Order management" description="Search and inspect customer orders without editing commerce state." />

        <SearchToolbar searchValue={search} searchPlaceholder="Search order number or customer">
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Status
              <select name="status" defaultValue={status} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_PAYMENT">Pending payment</option>
                <option value="PAID">Paid</option>
                <option value="FULFILLING">Fulfilling</option>
                <option value="SHIPPED">Shipped</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Payment
              <select name="paymentStatus" defaultValue={paymentStatus} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All payment states</option>
                <option value="REQUIRES_PAYMENT">Requires payment</option>
                <option value="PROCESSING">Processing</option>
                <option value="SUCCEEDED">Succeeded</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELED">Canceled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </label>
          </div>
        </SearchToolbar>

        {data.orders.length ? (
          <AdminTable columns={['Order', 'Customer', 'Status', 'Payment', 'Total', 'Created', 'Actions']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.orders.map((order) => (
                <tr key={order.orderNumber} className="align-top">
                  <td className="px-4 py-4 font-semibold text-neutral-50">{order.orderNumber}</td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div>{order.customerName}</div>
                    <div className="text-xs text-neutral-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge tone="neutral">{order.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={order.paymentStatus === 'SUCCEEDED' ? 'success' : order.paymentStatus === 'FAILED' ? 'warning' : 'neutral'}>
                      {order.paymentStatus}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 font-semibold text-accent-soft">{formatMoney(order.totalMinor)}</td>
                  <td className="px-4 py-4 text-neutral-300">{order.createdAt.toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-4">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/admin/orders/${order.orderNumber}`}>View order</a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <EmptyTableState
            title="No orders found"
            description="Try a different search or clear the filters."
            action={
              <Button asChild variant="outline">
                <a href="/admin/orders">Reset filters</a>
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
