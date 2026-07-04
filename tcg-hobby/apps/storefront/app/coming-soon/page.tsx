import { Button, Container, EmptyState, PageShell, Section } from '@tcg-hobby/ui';
import { AnnouncementBanner, ReleaseCard, ReleaseHero, ReleaseTimeline, NotifyButton } from '@tcg-hobby/ui';
import { getComingSoonHubData, getCustomerNotificationSubscriptions } from '@tcg-hobby/database';
import { getCurrentCustomerSession } from '../../lib/auth';
import { SiteHeader } from '../../components/site-header';
import { toggleNotificationAction } from '../../lib/release-actions';

export const dynamic = 'force-dynamic';

export default async function ComingSoonPage() {
  const [hub, session] = await Promise.all([getComingSoonHubData(), getCurrentCustomerSession()]);
  const subscribedIds =
    session?.user.role === 'CUSTOMER' ? (await getCustomerNotificationSubscriptions(session.user.id)).map((item) => item.productId) : [];

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.2),transparent_32%),linear-gradient(135deg,#08080a_0%,#101014_52%,#17120e_100%)] py-10 sm:py-16">
          <Container className="space-y-6">
            <AnnouncementBanner
              title="Coming soon"
              message="Launch weeks, preorder windows, and new set announcements now have a dedicated home. Customers can check back weekly for the next release drop."
              action={
                <Button asChild>
                  <a href="/releases">Open release calendar</a>
                </Button>
              }
            />

            {hub.featuredRelease ? (
              <ReleaseHero
                release={hub.featuredRelease}
                actionSlot={
                  <>
                    {session?.user.role === 'CUSTOMER' ? (
                      <NotifyButton
                        productId={hub.featuredRelease.products[0]?.productId ?? ''}
                        subscribed={subscribedIds.includes(hub.featuredRelease.products[0]?.productId ?? '')}
                        preference="ALL"
                        action={toggleNotificationAction}
                        returnTo="/coming-soon"
                      />
                    ) : (
                      <Button asChild variant="secondary">
                        <a href="/login?callbackUrl=%2Fcoming-soon">Notify me</a>
                      </Button>
                    )}
                    <Button asChild variant="outline">
                      <a href="/releases">View all launches</a>
                    </Button>
                  </>
                }
              />
            ) : null}
          </Container>
        </Section>

        <Section>
          <Container className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Upcoming products', String(hub.upcomingReleases.length)],
                ['Featured release', hub.featuredRelease?.name ?? 'None'],
                ['Recently announced', String(hub.recentlyAnnounced.length)],
                ['Trending upcoming', String(hub.trendingUpcoming.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-surface-line bg-surface-base p-5">
                  <p className="text-sm text-neutral-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-neutral-50">{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Upcoming sealed products</p>
                <h2 className="mt-2 text-2xl font-bold">The next sealed wave</h2>
              </div>
              {hub.upcomingSealedProducts.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {hub.upcomingSealedProducts.map((product) => (
                    <ReleaseCard
                      key={product.id}
                      release={product}
                      actionSlot={
                        <div className="flex items-center gap-2">
                          {session?.user.role === 'CUSTOMER' ? (
                            <NotifyButton
                              productId={product.productId}
                              subscribed={subscribedIds.includes(product.productId)}
                              preference="PREORDER"
                              action={toggleNotificationAction}
                              returnTo="/coming-soon"
                            />
                          ) : (
                            <Button asChild variant="secondary">
                              <a href="/login?callbackUrl=%2Fcoming-soon">Notify me</a>
                            </Button>
                          )}
                          <Button asChild variant="outline">
                            <a href={`/catalogue/${product.productSlug}`}>Open product</a>
                          </Button>
                        </div>
                      }
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="No sealed releases yet" description="The next sealed wave will appear here once it is announced." />
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Upcoming accessories</p>
                <h2 className="mt-2 text-2xl font-bold">Accessory drops and bundle support</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {hub.upcomingAccessories.map((product) => (
                  <ReleaseCard
                    key={product.id}
                    release={product}
                    actionSlot={
                      <Button asChild variant="outline">
                        <a href={`/catalogue/${product.productSlug}`}>View product</a>
                      </Button>
                    }
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Upcoming sets</p>
                <h2 className="mt-2 text-2xl font-bold">Set launches worth checking weekly</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {hub.upcomingSets.map((product) => (
                  <ReleaseCard
                    key={product.id}
                    release={product}
                    actionSlot={
                      <Button asChild variant="outline">
                        <a href={`/catalogue/${product.productSlug}`}>View product</a>
                      </Button>
                    }
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Recently announced</p>
                <h2 className="mt-2 text-2xl font-bold">Fresh release news</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {hub.recentlyAnnounced.map((release) => (
                  <ReleaseCard
                    key={release.id}
                    release={release}
                    showCountdown={false}
                    actionSlot={<Button asChild variant="outline"><a href="/releases">Open calendar</a></Button>}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Release timeline</p>
                <h2 className="mt-2 text-2xl font-bold">Monthly launch calendar preview</h2>
              </div>
              <div className="space-y-6">
                {hub.releaseTimeline.map((month) => (
                  <div key={month.key} className="space-y-4">
                    <h3 className="text-xl font-semibold text-neutral-50">{month.label}</h3>
                    <ReleaseTimeline releases={month.releases} />
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
