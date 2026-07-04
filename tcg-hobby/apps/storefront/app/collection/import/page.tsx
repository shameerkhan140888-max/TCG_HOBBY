import { Button, Container, EmptyState, Input, PageShell, Pagination, Section } from '@tcg-hobby/ui';
import { getCatalogueCategories, getCatalogueProducts } from '@tcg-hobby/database';
import type { CatalogueSort } from '@tcg-hobby/types';
import { requireCustomerSession } from '../../../lib/auth';
import { SiteHeader } from '../../../components/site-header';
import { CollectionImportForm } from '../../../components/collection-forms';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

const pageSize = 4;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function asSort(value: string | undefined): CatalogueSort {
  if (value === 'price-asc' || value === 'price-desc' || value === 'newest') {
    return value;
  }

  return 'featured';
}

function createHref(params: { search: string; category: string; sort: CatalogueSort; page: number }) {
  const query = new URLSearchParams();

  if (params.search) query.set('q', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort !== 'featured') query.set('sort', params.sort);
  if (params.page > 1) query.set('page', String(params.page));

  const queryString = query.toString();
  return queryString ? `/collection/import?${queryString}` : '/collection/import';
}

export default async function CollectionImportPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const session = await requireCustomerSession('/collection/import');
  const params = (await searchParams) ?? {};
  const search = asString(params.q);
  const category = asString(params.category);
  const sort = asSort(asString(params.sort));
  const page = Math.max(Number(asString(params.page) || '1') || 1, 1);
  const currentHref = createHref({ search, category, sort, page });

  const [categories, data] = await Promise.all([
    getCatalogueCategories(),
    getCatalogueProducts({
      search,
      category,
      sort,
      page,
      pageSize,
    }),
  ]);

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Collection import</p>
            <h1 className="text-3xl font-black sm:text-4xl">Add catalogue products to your collection.</h1>
            <p className="max-w-3xl text-sm leading-6 text-neutral-400">
              Search the catalogue, choose the copy you own, and record the details that matter for your binder and deck box.
            </p>
          </Container>
        </Section>

        <Container className="space-y-6 py-8">
          <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[1fr_220px_140px]">
            <Input name="q" defaultValue={search} placeholder="Search singles, sealed, accessories, or events" />
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
            >
              <option value="featured">Featured first</option>
              <option value="newest">Newest first</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
            </select>
            <Button type="submit">Search</Button>
            <input type="hidden" name="category" value={category} />
          </form>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant={category ? 'outline' : 'primary'}>
              <a href={createHref({ search, category: '', sort, page: 1 })}>All</a>
            </Button>
            {categories.map((item) => (
              <Button key={item.slug} asChild size="sm" variant={category === item.slug ? 'primary' : 'outline'}>
                <a href={createHref({ search, category: item.slug, sort, page: 1 })}>{item.name}</a>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-400">
              {data.pagination.totalItems} catalogue items ready for collection import
            </p>
            <Button asChild variant="ghost">
              <a href="/collection">Back to collection</a>
            </Button>
          </div>

          {data.products.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.products.map((product) => (
                <div key={product.id} className="rounded-lg border border-surface-line bg-surface-base p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-neutral-400">{product.game}</p>
                      <h2 className="mt-1 text-xl font-bold text-neutral-50">{product.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{product.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Category</p>
                      <p className="mt-1 font-semibold text-neutral-50">{product.categoryName}</p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <CollectionImportForm productId={product.id} returnTo={currentHref} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No catalogue items match your filters"
              description="Try a different search or switch category to find a card you own."
              action={
                <Button asChild>
                  <a href="/collection/import">Reset filters</a>
                </Button>
              }
            />
          )}

          <Pagination meta={data.pagination} hrefForPage={(nextPage) => createHref({ search, category, sort, page: nextPage })} />
        </Container>
      </main>
    </PageShell>
  );
}
