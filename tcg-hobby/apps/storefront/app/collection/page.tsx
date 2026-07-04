import { Button, Container, EmptyCollection, PageShell, ProgressBar, Section, CollectionCard, CollectionStats } from '@tcg-hobby/ui';
import { getCustomerCollectionDashboard, getCustomerCollectionItems } from '@tcg-hobby/database';
import { requireCustomerSession } from '../../lib/auth';
import { removeCollectionItemAction, updateCollectionItemQuantityAction } from '../../lib/collection-actions';
import { SiteHeader } from '../../components/site-header';

export const dynamic = 'force-dynamic';

export default async function CollectionPage() {
  const session = await requireCustomerSession('/collection');
  const [dashboard, items] = await Promise.all([
    getCustomerCollectionDashboard(session.user.id),
    getCustomerCollectionItems(session.user.id),
  ]);

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Collection manager</p>
                <h1 className="text-3xl font-black sm:text-4xl">Keep your collection organised and ready to build.</h1>
                <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                  Track what you own, how many copies you have, and the key details collectors care about without attaching a market value.
                </p>
              </div>
              <Button asChild>
                <a href="/collection/import">Import from catalogue</a>
              </Button>
            </div>
            <CollectionStats summary={dashboard.summary} deckCount={dashboard.deckCount} collectionCount={dashboard.collectionCount} />
          </Container>
        </Section>

        <Container className="space-y-10 py-10">
          {items.length ? (
            <>
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent">Recently added</p>
                    <h2 className="mt-2 text-2xl font-bold">Newest additions</h2>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {dashboard.summary.recentAdditions.map((item) => (
                    <CollectionCard
                      key={item.id}
                      item={item}
                      actionSlot={
                        <>
                          <form action={updateCollectionItemQuantityAction} className="flex items-center gap-2">
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="returnTo" value="/collection" />
                            <label className="sr-only" htmlFor={`collection-item-qty-${item.id}`}>
                              Quantity
                            </label>
                            <input
                              id={`collection-item-qty-${item.id}`}
                              name="quantity"
                              type="number"
                              min={0}
                              defaultValue={item.ownedQuantity}
                              className="h-10 w-24 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
                            />
                            <Button size="sm" type="submit" variant="secondary">
                              Save
                            </Button>
                          </form>
                          <form action={removeCollectionItemAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="returnTo" value="/collection" />
                            <Button size="sm" variant="outline" type="submit">
                              Remove
                            </Button>
                          </form>
                        </>
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent">Largest sets</p>
                    <h2 className="mt-2 text-2xl font-bold">Most represented groups</h2>
                  </div>
                  <div className="space-y-4">
                    {dashboard.largestSets.map((set) => (
                      <div key={set.label} className="rounded-lg border border-surface-line bg-surface-base p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-neutral-50">{set.label}</p>
                            <p className="text-sm text-neutral-400">{set.cardsOwned} cards owned</p>
                          </div>
                          <span className="text-sm font-semibold text-accent-soft">{set.cardsOwned}</span>
                        </div>
                        <ProgressBar value={set.cardsOwned} max={dashboard.summary.cardsOwned || 1} className="mt-3" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent">Wishlists</p>
                    <h2 className="mt-2 text-2xl font-bold">Overlap and gaps</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-surface-line bg-surface-base p-4">
                      <p className="text-sm font-semibold text-neutral-50">Wishlist overlap</p>
                      <div className="mt-3 space-y-2 text-sm text-neutral-300">
                        {dashboard.wishlistOverlap.length ? (
                          dashboard.wishlistOverlap.map((item) => <p key={item.id}>{item.productName}</p>)
                        ) : (
                          <p className="text-neutral-500">No overlap yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-surface-line bg-surface-base p-4">
                      <p className="text-sm font-semibold text-neutral-50">Missing cards from wishlist</p>
                      <div className="mt-3 space-y-2 text-sm text-neutral-300">
                        {dashboard.missingCards.length ? (
                          dashboard.missingCards.map((item) => <p key={item.id}>{item.name}</p>)
                        ) : (
                          <p className="text-neutral-500">Nothing missing from your saved wishlist.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">All items</p>
                  <h2 className="mt-2 text-2xl font-bold">Collection inventory</h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {items.map((item) => (
                    <CollectionCard
                      key={item.id}
                      item={item}
                      actionSlot={
                        <>
                          <form action={updateCollectionItemQuantityAction} className="flex items-center gap-2">
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="returnTo" value="/collection" />
                            <label className="sr-only" htmlFor={`collection-item-qty-all-${item.id}`}>
                              Quantity
                            </label>
                            <input
                              id={`collection-item-qty-all-${item.id}`}
                              name="quantity"
                              type="number"
                              min={0}
                              defaultValue={item.ownedQuantity}
                              className="h-10 w-24 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
                            />
                            <Button size="sm" type="submit" variant="secondary">
                              Save
                            </Button>
                          </form>
                          <form action={removeCollectionItemAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <input type="hidden" name="returnTo" value="/collection" />
                            <Button size="sm" variant="outline" type="submit">
                              Remove
                            </Button>
                          </form>
                        </>
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Recently viewed</p>
                  <h2 className="mt-2 text-2xl font-bold">Most recent browsing activity</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {dashboard.recentlyViewed.map((item) => (
                    <div key={item.id} className="rounded-lg border border-surface-line bg-surface-base p-4">
                      <p className="text-sm font-semibold text-neutral-50">{item.name}</p>
                      <p className="mt-1 text-sm text-neutral-400">{item.game}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">{item.categoryName}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <EmptyCollection
              title="Your collection is empty"
              description="Start by importing a few cards from the catalogue. You can adjust quantities and card details as you go."
              action={
                <Button asChild>
                  <a href="/collection/import">Import cards</a>
                </Button>
              }
            />
          )}
        </Container>
      </main>
    </PageShell>
  );
}
