import { Badge, Button, Card, CardContent, Container, PageShell, ProductCard, Price, Section, WishlistButton } from '@tcg-hobby/ui';
import { AnnouncementBanner, CollectionHealth, InsightCard, MarketValue, NotifyButton, PortfolioCard, ReleaseCard, ReleaseHero, StatTile, TrendBadge } from '@tcg-hobby/ui';
import { getCatalogueHomeData, getComingSoonHubData, getCollectionInsights, getCustomerNotificationSubscriptions, getWatchlist, getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../components/site-header';
import { AddToCartButton } from '../components/cart-actions';
import { getCurrentCustomerSession } from '../lib/auth';
import { toggleWishlistAction } from '../lib/wishlist';
import { toggleNotificationAction } from '../lib/release-actions';
import { isComingSoonMode } from '../lib/site';
import ComingSoonPage from './coming-soon/page';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ subscriberSignup?: string | string[] | undefined }>;
}) {
  if (isComingSoonMode()) {
    return <ComingSoonPage searchParams={searchParams} />;
  }

  const [homeData, session] = await Promise.all([
    getCatalogueHomeData(),
    getCurrentCustomerSession(),
  ]);
  const collectorDataPromise =
    session?.user.role === 'CUSTOMER'
      ? Promise.all([
          getCollectionInsights(session.user.id),
          getWatchlist(session.user.id),
        ])
      : Promise.resolve([null, []] as const);
  const wishlistIds = session?.user.role === 'CUSTOMER' ? await getWishlistProductIds(session.user.id) : [];
  const releaseHub = await getComingSoonHubData();
  const notificationIds =
    session?.user.role === 'CUSTOMER' ? (await getCustomerNotificationSubscriptions(session.user.id)).map((item) => item.productId) : [];
  const [collectorInsights, watchlistItems] = await collectorDataPromise;
  const { featuredProducts } = homeData;
  const heroProduct = featuredProducts.find((product) => !product.releaseStatus || product.releaseStatus === 'RELEASED') ?? featuredProducts[0];
  const returnTo = '/';
  const watchedValue = watchlistItems.reduce((sum, item) => sum + item.currentEstimateMinor, 0);

  return (
    <PageShell>
      <SiteHeader />

      <main>
        <Section className="overflow-hidden border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.18),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_55%,#17120e_100%)] py-14 sm:py-20">
          <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl space-y-7">
              <Badge variant="accent">Premium dark commerce for TCG retailers</Badge>
              <div className="space-y-5">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
                  Cards, sealed product, events, and player tools in one polished storefront.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  Browse featured products, manage wishlists, prepare decks, submit buylists, and register for tournaments with a fast retail experience built for collectors and players.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="/catalogue">Browse catalogue</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/catalogue?category=events">View events</a>
                </Button>
              </div>
            </div>

            {heroProduct ? (
              <Card className="shadow-glow">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] rounded-t-lg bg-[linear-gradient(135deg,#2a1710,#111113_55%,#29251d)] p-5">
                    <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-black/15 p-6">
                      <div className="flex items-center justify-between gap-4">
                        <Badge variant="accent">{heroProduct.featured ? 'Featured' : heroProduct.badge}</Badge>
                        <Badge variant={heroProduct.inStock ? 'success' : 'warning'}>{heroProduct.inStock ? 'In stock' : 'Low stock'}</Badge>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">{heroProduct.imageLabel}</p>
                        <h2 className="max-w-xl text-3xl font-black leading-tight text-neutral-50">{heroProduct.name}</h2>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-300">{heroProduct.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-neutral-400">Price</p>
                      <Price value={heroProduct.price} />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-400">Stock</p>
                      <p className="text-lg font-bold text-neutral-50">{heroProduct.stockOnHand - heroProduct.reservedStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-400">Supplier</p>
                      <p className="text-lg font-bold text-neutral-50">{heroProduct.supplierName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </Container>
        </Section>

        <Section className="border-b border-surface-line bg-surface-base">
          <Container className="space-y-8">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Upcoming releases</p>
                <h2 className="mt-2 text-3xl font-bold">The next launch wave</h2>
              </div>
              <Button asChild variant="outline">
                <a href="/coming-soon">Visit coming soon</a>
              </Button>
            </div>

            {releaseHub.featuredRelease ? (
              <ReleaseHero
                release={releaseHub.featuredRelease}
                actionSlot={
                  <>
                    {session?.user.role === 'CUSTOMER' ? (
                      <NotifyButton
                        productId={releaseHub.featuredRelease.products[0]?.productId ?? ''}
                        subscribed={notificationIds.includes(releaseHub.featuredRelease.products[0]?.productId ?? '')}
                        preference="ALL"
                        action={toggleNotificationAction}
                        returnTo="/"
                      />
                    ) : (
                      <Button asChild variant="secondary">
                        <a href="/login?callbackUrl=%2F">Notify me</a>
                      </Button>
                    )}
                    <Button asChild variant="outline">
                      <a href="/releases">Open calendar</a>
                    </Button>
                  </>
                }
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {releaseHub.trendingUpcoming.slice(0, 3).map((product) => (
                <ReleaseCard
                  key={product.id}
                  release={product}
                  actionSlot={
                    <div className="flex items-center gap-2">
                      {session?.user.role === 'CUSTOMER' ? (
                        <NotifyButton
                          productId={product.productId}
                          subscribed={notificationIds.includes(product.productId)}
                          preference="PREORDER"
                          action={toggleNotificationAction}
                          returnTo="/"
                        />
                      ) : (
                        <Button asChild size="sm" variant="secondary">
                          <a href="/login?callbackUrl=%2F">Notify me</a>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <a href={`/catalogue/${product.productSlug}`}>Open product</a>
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>

            <AnnouncementBanner
              title="Release momentum"
              message="Weekly visits now have a reason to start with the next preorder wave, a live calendar, and release notifications that stay inside the customer account."
              action={
                <Button asChild>
                  <a href="/coming-soon">See what is next</a>
                </Button>
              }
            />
          </Container>
        </Section>

        {session?.user.role === 'CUSTOMER' && collectorInsights ? (
          <Section className="border-t border-surface-line bg-surface-ink">
            <Container className="space-y-8">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Collector dashboard</p>
                  <h2 className="mt-2 text-3xl font-bold">Your collection, watchlist, and deckwork in one glance.</h2>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <a href="/collection/insights">Open insights</a>
                  </Button>
                  <Button asChild>
                    <a href="/watchlist">Open watchlist</a>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Estimated collection value" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(collectorInsights.estimatedValueMinor / 100)} helper="Approximate market values" />
                <StatTile label="Collection health" value={`${collectorInsights.collectionHealthScore}/100`} helper="Collector confidence indicator" />
                <StatTile label="Watchlist value" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(watchedValue / 100)} helper={`${watchlistItems.length} tracked items`} />
                <StatTile label="Deck completion" value={`${collectorInsights.deckCompletionPercent}%`} helper="Across active decks" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <PortfolioCard
                  title="Collection portfolio"
                  currentEstimateMinor={collectorInsights.estimatedValueMinor}
                  previousEstimateMinor={collectorInsights.previousValueMinor}
                  trend={collectorInsights.valueTrendPercent >= 0 ? 'UP' : 'DOWN'}
                  confidenceScore={collectorInsights.collectionHealthScore}
                  actionSlot={
                    <div className="space-y-4">
                      <MarketValue
                        currentEstimateMinor={collectorInsights.estimatedValueMinor}
                        yesterdayMinor={collectorInsights.previousValueMinor}
                        trend={collectorInsights.valueTrendPercent >= 0 ? 'UP' : 'DOWN'}
                        confidenceScore={collectorInsights.collectionHealthScore}
                      />
                    </div>
                  }
                />
                <CollectionHealth score={collectorInsights.collectionHealthScore} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <InsightCard
                  title="Recently tracked cards"
                  description="The items you are watching most closely."
                  actionSlot={
                    <div className="space-y-3">
                      {watchlistItems.slice(0, 4).map((item) => (
                        <div key={item.id} className="rounded-lg border border-surface-line bg-surface-base p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-neutral-50">{item.subjectLabel}</p>
                              <p className="text-sm text-neutral-400">{item.subjectType.replaceAll('_', ' ')}</p>
                            </div>
                            <TrendBadge trend={item.trend} />
                          </div>
                          <div className="mt-2 text-sm text-neutral-400">
                            <span className="text-neutral-50">{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(item.currentEstimateMinor / 100)}</span>
                            {' '}approximate value
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                />
                <AnnouncementBanner
                  title="Continue your hobby flow"
                  message="Pick up where you left off with collection imports, deck edits, or a deeper look at your approximate values."
                  action={
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="outline">
                        <a href="/collection">Continue collection</a>
                      </Button>
                      <Button asChild>
                        <a href="/decks">Resume deck building</a>
                      </Button>
                    </div>
                  }
                />
              </div>
            </Container>
          </Section>
        ) : null}

        <Section className="border-t border-surface-line bg-surface-base" id="featured-products">
          <Container>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Featured products</p>
                <h2 className="mt-2 text-3xl font-bold">Retail-ready product cards</h2>
              </div>
              <Button asChild variant="outline">
                <a href="/catalogue">Open catalogue</a>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  href={`/catalogue/${product.slug}`}
                  actionSlot={
                    <div className="flex items-center gap-2">
                      {product.releaseStatus && product.releaseStatus !== 'RELEASED' ? (
                        session?.user.role === 'CUSTOMER' ? (
                          <NotifyButton
                            productId={product.id}
                            subscribed={notificationIds.includes(product.id)}
                            preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                            action={toggleNotificationAction}
                            returnTo={returnTo}
                          />
                        ) : (
                          <Button asChild size="sm" variant="secondary">
                            <a href={`/login?callbackUrl=${encodeURIComponent(returnTo)}`}>Notify me</a>
                          </Button>
                        )
                      ) : (
                        <AddToCartButton productId={product.id} returnTo={returnTo} />
                      )}
                      <WishlistButton
                        productId={product.id}
                        wishlisted={wishlistIds.includes(product.id)}
                        authenticated={session?.user.role === 'CUSTOMER'}
                        action={toggleWishlistAction}
                        loginHref={`/login?callbackUrl=${encodeURIComponent('/')}`}
                        returnTo="/"
                      />
                    </div>
                  }
                />
              ))}
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
