import { Button, Container, EmptyTableState, PageHeader, SearchToolbar, StatusBadge, AdminTable, Section } from '@tcg-hobby/ui';
import { getCurrentAdminReleases } from '../../../lib/releases';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function createHref(params: { search: string; page: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('q', params.search);
  if (params.page > 1) query.set('page', String(params.page));
  const queryString = query.toString();
  return queryString ? `/admin/releases?${queryString}` : '/admin/releases';
}

export default async function AdminReleasesPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.q);
  const page = Math.max(Number(asString(params.page) || '1') || 1, 1);
  const data = await getCurrentAdminReleases({ search, page, pageSize: 12 });

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Releases"
          title="Admin release management"
          description="Manage preorder windows, launch notes, supplier timing, and homepage featuring."
          actions={
            <Button asChild>
              <a href="/admin/releases/new">New release</a>
            </Button>
          }
        />

        <SearchToolbar searchName="q" searchValue={search} searchPlaceholder="Search release name, brand, or notes">
          <input type="hidden" name="page" value="1" />
        </SearchToolbar>

        {data.releases.length ? (
          <>
            <AdminTable columns={['Release', 'Launch', 'Products', 'Status', 'Visibility']}>
              <tbody className="divide-y divide-surface-line bg-surface-base">
                {data.releases.map((release) => (
                  <tr key={release.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-neutral-50">
                        <a href={`/admin/releases/${release.id}`}>{release.name}</a>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {release.brand} . {release.game}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-neutral-300">{new Date(release.releaseDate).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-4 text-neutral-300">{release.productCount}</td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={release.featuredOnHomepage ? 'accent' : release.preorderProductCount > 0 ? 'warning' : 'neutral'}>
                        {release.preorderProductCount > 0 ? 'Preorder' : 'Coming soon'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={release.visible ? 'success' : 'neutral'}>{release.visible ? 'Visible' : 'Hidden'}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-400">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                {data.pagination.hasPreviousPage ? (
                  <Button asChild variant="outline">
                    <a href={createHref({ search, page: data.pagination.page - 1 })}>Previous</a>
                  </Button>
                ) : null}
                {data.pagination.hasNextPage ? (
                  <Button asChild variant="outline">
                    <a href={createHref({ search, page: data.pagination.page + 1 })}>Next</a>
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <EmptyTableState
            title="No releases yet"
            description="Create the first launch release to populate the coming soon hub and calendar."
            action={
              <Button asChild>
                <a href="/admin/releases/new">New release</a>
              </Button>
            }
          />
        )}
      </Container>
    </Section>
  );
}
