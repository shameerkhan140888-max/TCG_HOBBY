import { getCatalogueProducts, getCustomerDeckById } from '@tcg-hobby/database';
import { Button, Card, CardContent, Container, EmptyState, Input, PageShell, Pagination, ProductCard, Section, DeckHeader, ProgressBar } from '@tcg-hobby/ui';
import type { CatalogueSort } from '@tcg-hobby/types';
import { requireCustomerSession } from '../../../lib/auth';
import { SiteHeader } from '../../../components/site-header';
import { addDeckCardAction, removeDeckCardAction, updateDeckCardQuantityAction, updateDeckDetailsAction } from '../../../lib/deck-actions';

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

function createHref(deckId: string, params: { search: string; category: string; sort: CatalogueSort; page: number }) {
  const query = new URLSearchParams();

  if (params.search) query.set('q', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort !== 'featured') query.set('sort', params.sort);
  if (params.page > 1) query.set('page', String(params.page));

  const queryString = query.toString();
  return queryString ? `/decks/${deckId}?${queryString}` : `/decks/${deckId}`;
}

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsValue>;
}) {
  const session = await requireCustomerSession('/decks');
  const { id } = await params;
  const queryParams = (await searchParams) ?? {};
  const search = asString(queryParams.q);
  const category = asString(queryParams.category) || 'singles';
  const sort = asSort(asString(queryParams.sort));
  const page = Math.max(Number(asString(queryParams.page) || '1') || 1, 1);
  const currentHref = createHref(id, { search, category, sort, page });

  const [deck, catalogue] = await Promise.all([
    getCustomerDeckById(session.user.id, id),
    getCatalogueProducts({
      search,
      category,
      sort,
      page,
      pageSize,
    }),
  ]);

  if (!deck) {
    return (
      <PageShell>
        <SiteHeader />
        <main className="min-h-screen bg-surface-ink text-neutral-50">
          <Container className="py-16">
            <EmptyState
              title="Deck not found"
              description="That deck could not be loaded for this account."
              action={
                <Button asChild>
                  <a href="/decks">Back to decks</a>
                </Button>
              }
            />
          </Container>
        </main>
      </PageShell>
    );
  }

  const missingFromCollection = deck.stats.missingCardsFromCollection;

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="space-y-6">
            <DeckHeader
              deck={deck}
              actionSlot={
                <>
                  <Button asChild variant="outline">
                    <a href="/decks">All decks</a>
                  </Button>
                  <Button asChild>
                    <a href="/decks/new">New deck</a>
                  </Button>
                </>
              }
            />
          </Container>
        </Section>

        <Container className="space-y-10 py-10">
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Deck health</p>
                  <h2 className="mt-2 text-2xl font-bold">Build status</h2>
                </div>
                <ProgressBar value={deck.cardCount} max={deck.maxCards} label="Completion" />
                <div className="space-y-3 text-sm text-neutral-300">
                  {deck.stats.warnings.length ? (
                    deck.stats.warnings.map((warning) => (
                      <p key={warning} className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                        {warning}
                      </p>
                    ))
                  ) : (
                    <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
                      This deck is within the current build rules.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Deck maths</p>
                  <h2 className="mt-2 text-2xl font-bold">Curve and breakdown</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Card count', value: String(deck.stats.cardCount) },
                    { label: 'Unique cards', value: String(deck.stats.uniqueCards) },
                    { label: 'Average cost', value: `GBP ${(deck.stats.averageCostMinor / 100).toFixed(2)}` },
                    { label: 'Completion', value: `${deck.stats.completionPercent}%` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-neutral-50">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {deck.stats.curveBreakdown.map((bucket) => (
                    <div key={bucket.label} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">{bucket.label}</p>
                      <p className="mt-1 text-lg font-semibold text-neutral-50">{bucket.count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Deck settings</p>
                  <h2 className="mt-2 text-2xl font-bold">Rename and refine</h2>
                </div>
                <form action={updateDeckDetailsAction} className="space-y-4">
                  <input type="hidden" name="deckId" value={deck.id} />
                  <input type="hidden" name="returnTo" value={currentHref} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-neutral-300">Name</span>
                      <Input name="name" defaultValue={deck.name} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-neutral-300">Game</span>
                      <Input name="game" defaultValue={deck.game} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-neutral-300">Visibility</span>
                      <select
                        name="visibility"
                        defaultValue={deck.visibility}
                        className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-neutral-300">Image label</span>
                      <Input name="imageLabel" defaultValue={deck.imageLabel} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-neutral-300">Max cards</span>
                      <Input name="maxCards" type="number" min={1} defaultValue={deck.maxCards} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-neutral-300">Duplicate limit</span>
                      <Input name="maxCopiesPerCard" type="number" min={1} defaultValue={deck.maxCopiesPerCard} />
                    </label>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-sm text-neutral-300">Notes</span>
                    <Input name="notes" defaultValue={deck.notes ?? ''} />
                  </label>
                  <Button type="submit">Save deck</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Missing cards</p>
                  <h2 className="mt-2 text-2xl font-bold">Collection gaps</h2>
                </div>
                <div className="space-y-3">
                  {missingFromCollection.length ? (
                    missingFromCollection.map((item) => (
                      <div key={item.productId} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-50">{item.productName}</p>
                            <p className="text-sm text-neutral-400">Missing {item.missingQuantity} copies</p>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <a href="/collection/import">Import</a>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-400">Everything in this deck is already represented in the collection.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Current cards</p>
              <h2 className="mt-2 text-2xl font-bold">Deck list</h2>
            </div>
            <div className="grid gap-4">
              {deck.cards.length ? (
                deck.cards.map((card) => (
                  <Card key={card.id}>
                    <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-neutral-50">{card.productName}</p>
                        <p className="text-sm text-neutral-400">{card.game}</p>
                        <p className="text-sm text-neutral-500">{card.categoryName}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <form action={updateDeckCardQuantityAction} className="flex items-center gap-2">
                          <input type="hidden" name="deckId" value={deck.id} />
                          <input type="hidden" name="productId" value={card.productId} />
                          <input type="hidden" name="returnTo" value={currentHref} />
                          <label className="sr-only" htmlFor={`deck-card-qty-${card.id}`}>
                            Quantity
                          </label>
                          <Input
                            id={`deck-card-qty-${card.id}`}
                            name="quantity"
                            type="number"
                            min={0}
                            defaultValue={card.quantity}
                            className="w-24"
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            Save
                          </Button>
                        </form>
                        <form action={removeDeckCardAction}>
                          <input type="hidden" name="deckId" value={deck.id} />
                          <input type="hidden" name="productId" value={card.productId} />
                          <input type="hidden" name="returnTo" value={currentHref} />
                          <Button type="submit" size="sm" variant="outline">
                            Remove
                          </Button>
                        </form>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">Line total</p>
                          <p className="text-sm font-semibold text-accent-soft">GBP {(card.lineTotalMinor / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="This deck is empty"
                  description="Search the catalogue below and add cards one by one to build the list."
                  action={
                    <Button asChild>
                      <a href="#catalogue-search">Search catalogue</a>
                    </Button>
                  }
                />
              )}
            </div>
          </section>

          <section id="catalogue-search" className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Catalogue search</p>
              <h2 className="mt-2 text-2xl font-bold">Add cards to the deck</h2>
            </div>
            <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[1fr_220px_140px]">
              <Input name="q" defaultValue={search} placeholder="Search catalogue cards" />
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
                <a href={createHref(id, { search, category: '', sort, page: 1 })}>All</a>
              </Button>
              <Button asChild size="sm" variant={category === 'singles' ? 'primary' : 'outline'}>
                <a href={createHref(id, { search, category: 'singles', sort, page: 1 })}>Singles</a>
              </Button>
            </div>

            {catalogue.products.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {catalogue.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    href={`/catalogue/${product.slug}`}
                    actionSlot={
                      <form action={addDeckCardAction} className="flex items-center gap-2">
                        <input type="hidden" name="deckId" value={deck.id} />
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="quantity" value="1" />
                        <input type="hidden" name="returnTo" value={currentHref} />
                        <Button type="submit" size="sm">
                          Add
                        </Button>
                      </form>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No catalogue results"
                description="Try another search term to find cards you want to add."
                action={
                  <Button asChild>
                    <a href={createHref(id, { search: '', category, sort, page: 1 })}>Reset search</a>
                  </Button>
                }
              />
            )}

            <Pagination meta={catalogue.pagination} hrefForPage={(nextPage) => createHref(id, { search, category, sort, page: nextPage })} />
          </section>
        </Container>
      </main>
    </PageShell>
  );
}
