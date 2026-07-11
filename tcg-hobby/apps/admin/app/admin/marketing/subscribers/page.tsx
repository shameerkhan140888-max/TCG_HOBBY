import {
  Button,
  Container,
  Section,
  AdminTable,
  EmptyTableState,
  PageHeader,
  SearchToolbar,
  StatusBadge,
} from '@tcg-hobby/ui';
import {
  MarketingSubscriberStatus,
  getMarketingSubscriberDashboard,
  getMarketingSubscribers,
} from '@tcg-hobby/database';

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
  return query ? `/admin/marketing/subscribers?${query}` : '/admin/marketing/subscribers';
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function getStatusTone(status: MarketingSubscriberStatus) {
  if (status === MarketingSubscriberStatus.ACTIVE) return 'success';
  if (status === MarketingSubscriberStatus.UNSUBSCRIBED) return 'neutral';
  return 'warning';
}

export default async function MarketingSubscribersPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.search);
  const status = asString(params.status) as MarketingSubscriberStatus | 'ALL' | '';
  const tag = asString(params.tag);
  const consent = asString(params.consent) as 'all' | 'yes' | 'no' | '';
  const page = Number.parseInt(asString(params.page) || '1', 10);
  const [dashboard, data] = await Promise.all([
    getMarketingSubscriberDashboard(),
    getMarketingSubscribers({
      search,
      status: status || 'ALL',
      tag,
      consent: consent || 'all',
      page: Number.isFinite(page) ? page : 1,
      pageSize: 25,
    }),
  ]);
  const current = { search, status: status || 'ALL', tag, consent: consent || 'all' };
  const exportParams = new URLSearchParams();
  Object.entries(current).forEach(([key, value]) => {
    if (value && value !== 'ALL' && value !== 'all') {
      exportParams.set(key, value);
    }
  });
  const exportHref = exportParams.toString()
    ? `/admin/marketing/subscribers/export?${exportParams.toString()}`
    : '/admin/marketing/subscribers/export';

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Marketing"
          title="Subscribers"
          description="Manage launch-list and future marketing subscribers from the reusable subscriber record."
          actions={
            <Button asChild variant="outline">
              <a href={exportHref}>Export CSV</a>
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Total', dashboard.metrics.total],
            ['Eligible', dashboard.metrics.eligible],
            ['Unsubscribed', dashboard.metrics.unsubscribed],
            ['Bounced', dashboard.metrics.bounced],
            ['Suppressed', dashboard.metrics.suppressed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-surface-line bg-surface-base p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-neutral-50">{value}</p>
            </div>
          ))}
        </div>

        <SearchToolbar searchValue={search} searchPlaceholder="Search email or first name">
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[620px]">
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Status
              <select name="status" defaultValue={status || 'ALL'} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="ALL">All statuses</option>
                {Object.values(MarketingSubscriberStatus).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Tag
              <select name="tag" defaultValue={tag} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All tags</option>
                {dashboard.tags.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Consent
              <select name="consent" defaultValue={consent || 'all'} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="all">All</option>
                <option value="yes">Consented</option>
                <option value="no">No consent</option>
              </select>
            </label>
          </div>
        </SearchToolbar>

        {data.subscribers.length ? (
          <AdminTable columns={['Subscriber', 'Status', 'Consent', 'Tags', 'Source', 'Last signup', 'Actions']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{subscriber.email}</div>
                    <div className="text-xs text-neutral-500">{subscriber.firstName ?? 'No first name'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={getStatusTone(subscriber.status)}>{subscriber.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{subscriber.marketingConsent ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-md flex-wrap gap-2">
                      {subscriber.tags.map((tagItem) => (
                        <StatusBadge key={tagItem.slug} tone="accent">{tagItem.label}</StatusBadge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{subscriber.source}</td>
                  <td className="px-4 py-4 text-neutral-300">{formatDate(subscriber.lastSignupAt)}</td>
                  <td className="px-4 py-4">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/admin/marketing/subscribers/${subscriber.id}`}>Open</a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <EmptyTableState title="No subscribers found" description="Try another search term, status, consent state, or tag filter." />
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
