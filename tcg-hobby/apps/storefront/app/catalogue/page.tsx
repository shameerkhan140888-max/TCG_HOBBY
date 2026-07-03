import { Button, Container, EmptyState, Input, Pagination, ProductCard } from '@tcg-hobby/ui';
import { getCatalogueProducts } from '@tcg-hobby/database';
import type { CatalogueSort } from '@tcg-hobby/types';

type SearchParamsValue = Record<string, string | string[] | undefined>;

const pageSize = 4;

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function asSort(value: string | undefined): CatalogueSort {
  if (value === 'price-asc' || value === 'price-desc' || value === 'newest') {
    return value;
  }

  return 'featured';
}

function createHref(baseParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(baseParams);
  if (page <= 1) {
    params.delete('page');
  } else {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/catalogue?${query}` : '/catalogue';
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams?: SearchParamsValue | Promise<SearchParamsValue>;
}) {
  const params = (await Promise.resolve(searchParams ?? {})) ?? {};
  const search = asString(params.q);
  const category = asString(params.category);
  const sort = asSort(asString(params.sort));
  const page = Math.max(Number(asString(params.page) || '1') || 1, 1);

  const data = await getCatalogueProducts({
    search,
    category,
    sort,
    page,
    pageSize,
  });

  const baseParams = new URLSearchParams();
  if (search) baseParams.set('q', search);
  if (category) baseParams.set('category', category);
  if (sort !== 'featured') baseParams.set('sort', sort);

  return (
    <main className="min-h-screen bg-surface-ink text-neutral-50">
      <section className="border-b border-surface-line bg-surface-base/80">
        <Container className="py-8 sm:py-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Catalogue</p>
            <h1 className="text-3xl font-black sm:text-4xl">Browse products with search and filters</h1>
            <p className="max-w-3xl text-sm leading-6 text-neutral-400">
              Search the seeded commerce catalogue, switch categories, sort results, and page through the current stock assortment.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[1fr_220px_140px]">
          <Input name="q" defaultValue={search} placeholder="Search cards, sealed product, accessories, or events" />
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

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={category ? 'outline' : 'primary'}>
            <a href={createHref(baseParams, 1)}>All</a>
          </Button>
          {data.categories.map((item) => (
            <Button key={item.slug} asChild size="sm" variant={category === item.slug ? 'primary' : 'outline'}>
              <a href={createHref(new URLSearchParams({ ...Object.fromEntries(baseParams.entries()), category: item.slug }), 1)}>{item.name}</a>
            </Button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">
              {data.pagination.totalItems} products found{search ? ` for "${search}"` : ''}
            </p>
            {category ? <p className="mt-1 text-sm text-neutral-500">Filtered by category: {category}</p> : null}
          </div>
          <Button asChild variant="ghost">
            <a href="/catalogue">Reset filters</a>
          </Button>
        </div>

        {data.products.length ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} href={`/catalogue/${product.slug}`} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination meta={data.pagination} hrefForPage={(nextPage) => createHref(baseParams, nextPage)} />
            </div>
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No products match those filters"
              description="Try a different search term or open another category. The seeded catalogue has plenty more to browse."
              action={
                <Button asChild>
                  <a href="/catalogue">Clear search</a>
                </Button>
              }
            />
          </div>
        )}
      </Container>
    </main>
  );
}
