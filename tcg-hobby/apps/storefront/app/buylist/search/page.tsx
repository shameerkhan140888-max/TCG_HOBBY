import { Badge, Button, Card, CardContent, Container, EmptyState, Input, PageShell, Pagination, Section } from '@tcg-hobby/ui';
import { BuylistStatusBadge, PriceBadge } from '@tcg-hobby/ui';
import { getCatalogueCategories, getBuylistSearchProducts } from '@tcg-hobby/database';
import { getCurrentCustomerBuylistDraft } from '../../../lib/buylist';
import { AddToBuylistButton } from '../../../components/buylist-actions';
import { SiteHeader } from '../../../components/site-header';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function createHref(params: { search: string; category: string; page: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.page > 1) query.set('page', String(params.page));
  const qs = query.toString();
  return qs ? `/buylist/search?${qs}` : '/buylist/search';
}

export default async function BuylistSearchPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.search);
  const category = asString(params.category);
  const page = Number.parseInt(asString(params.page) || '1', 10);

  const [categories, results, draft] = await Promise.all([
    getCatalogueCategories(),
    getBuylistSearchProducts({ search, category, page: Number.isFinite(page) ? page : 1, pageSize: 8 }),
    getCurrentCustomerBuylistDraft(),
  ]);

  const draftCounts = new Map(draft?.items.map((item) => [item.productId, item.quantity] as const) ?? []);
  const currentHref = createHref({ search, category, page: Number.isFinite(page) ? page : 1 });

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-12">
          <Container className="space-y-6">
            <div className="space-y-3">
              <Badge variant="accent">Buylist search</Badge>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Find cards eligible for trade-in</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Search for cards and sealed product we&apos;re currently buying, then add the quantities you want to submit.
              </p>
            </div>

            <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-ink p-4 lg:grid-cols-[1fr_240px_140px]">
              <Input name="search" defaultValue={search} placeholder="Search SKU, card name, set, or category" />
              <select
                name="category"
                defaultValue={category}
                className="h-10 w-full rounded-md border border-surface-line bg-surface-base px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
              <Button type="submit">Search</Button>
            </form>
          </Container>
        </Section>

        <Container className="space-y-8 py-10">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant={category ? 'outline' : 'primary'}>
              <a href={createHref({ search, category: '', page: 1 })}>All</a>
            </Button>
            {categories.map((item) => (
              <Button key={item.slug} asChild size="sm" variant={category === item.slug ? 'primary' : 'outline'}>
                <a href={createHref({ search, category: item.slug, page: 1 })}>{item.name}</a>
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-400">
            <p>
              {results.pagination.totalItems} eligible items{search ? ` for "${search}"` : ''}
            </p>
            <p>
              Draft items: {draft?.items.reduce((count, item) => count + item.quantity, 0) ?? 0}{' '}
              <BuylistStatusBadge status={draft?.status ?? 'DRAFT'} />
            </p>
          </div>

          {results.products.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {results.products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="space-y-4">
                      <div className="aspect-[5/4] rounded-lg border border-surface-line bg-[linear-gradient(135deg,#28160f,#111113_55%,#2a2419)] p-4">
                        <div className="flex h-full flex-col justify-between">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="accent">Buylist</Badge>
                            <Badge variant={product.inStock ? 'success' : 'warning'}>{product.inStock ? 'Available' : 'Low stock'}</Badge>
                          </div>
                          <div className="self-start rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
                            {product.imageLabel}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-400">{product.game}</p>
                        <h2 className="text-lg font-bold text-neutral-50">{product.name}</h2>
                        <p className="text-sm leading-6 text-neutral-400">{product.description}</p>
                      </div>
                      <div className="space-y-2">
                        <PriceBadge label="Buy price" amountMinor={product.buyMinor} tone="accent" />
                        <p className="text-xs uppercase tracking-wide text-neutral-500">{product.buyPriceLabel}</p>
                        <p className="text-xs uppercase tracking-wide text-neutral-500">Source: {product.priceSource}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">In draft: {draftCounts.get(product.id) ?? 0}</p>
                        <AddToBuylistButton productId={product.id} returnTo={currentHref} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Pagination meta={results.pagination} hrefForPage={(nextPage) => createHref({ search, category, page: nextPage })} />
            </>
          ) : (
            <EmptyState
              title="No eligible items found"
              description="Try a different search term or category. Some products are not available for buylist submission."
              action={
                <Button asChild>
                  <a href="/buylist/search">Clear filters</a>
                </Button>
              }
            />
          )}
        </Container>
      </main>
    </PageShell>
  );
}
