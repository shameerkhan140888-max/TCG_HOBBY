import {
  AnnouncementBanner,
  Button,
  Container,
  EmptyState,
  InsightCard,
  MarketValue,
  NotificationPreference,
  PageShell,
  PortfolioCard,
  Section,
  StatTile,
  TrendBadge,
  WatchButton,
} from '@tcg-hobby/ui';
import { getNotificationCenterPreferences, getWatchlist } from '@tcg-hobby/database';
import { requireCustomerSession } from '../../lib/auth';
import { SiteHeader } from '../../components/site-header';
import { toggleWatchlistAction, updateWatchlistPreferencesAction } from '../../lib/market-actions';

export const dynamic = 'force-dynamic';

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

export default async function WatchlistPage() {
  const session = await requireCustomerSession('/watchlist');
  const [watchlist, notificationPreferences] = await Promise.all([
    getWatchlist(session.user.id),
    getNotificationCenterPreferences(session.user.id),
  ]);
  const totalEstimateMinor = watchlist.reduce((sum, item) => sum + item.currentEstimateMinor, 0);
  const watchedReleases = watchlist.filter((item) => item.subjectType === 'RELEASE').length;
  const watchedCards = watchlist.filter((item) => item.subjectType === 'PRODUCT').length;
  const watchedCollectionItems = watchlist.filter((item) => item.subjectType === 'COLLECTION_ITEM').length;
  const latestUpdate = watchlist[0]?.lastUpdatedAt ?? new Date().toISOString();
  const trend = watchlist.some((item) => item.trend === 'UP') ? 'UP' : watchlist.some((item) => item.trend === 'DOWN') ? 'DOWN' : 'FLAT';

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Watchlist</p>
              <h1 className="text-3xl font-black sm:text-4xl">Cards and releases you are tracking.</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                This is the place to keep an eye on approximate value changes, launch timing, and future availability without committing to an alerting system yet.
              </p>
            </div>

            <AnnouncementBanner
              title="Collector tracking only"
              message="Notifications are prepared for future releases, but no alerts are sent yet. All values remain approximate market estimates."
              action={
                <Button asChild variant="outline">
                  <a href="/coming-soon">Browse upcoming releases</a>
                </Button>
              }
            />
          </Container>
        </Section>

        <Container className="space-y-10 py-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Watched items" value={String(watchlist.length)} helper={`Updated ${new Date(latestUpdate).toLocaleDateString('en-GB')}`} />
            <StatTile label="Estimated value" value={formatMoney(totalEstimateMinor)} helper="Approximate market values only" />
            <StatTile label="Products" value={String(watchedCards)} helper={`${watchedReleases} releases`} />
            <StatTile label="Collection cards" value={String(watchedCollectionItems)} helper="Linked to owned items" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <PortfolioCard
              title="Watchlist portfolio"
              currentEstimateMinor={totalEstimateMinor}
              previousEstimateMinor={Math.round(totalEstimateMinor * 0.95)}
              trend={trend}
              confidenceScore={78}
              actionSlot={
                <MarketValue
                  currentEstimateMinor={totalEstimateMinor}
                  yesterdayMinor={Math.round(totalEstimateMinor * 0.95)}
                  trend={trend}
                  confidenceScore={78}
                />
              }
            />

            <InsightCard
              title="Notification centre"
              description="Future alert channels are stored here so the platform is ready when messaging goes live."
              actionSlot={
                <div className="space-y-3">
                  {notificationPreferences.length ? (
                    notificationPreferences.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-line bg-surface-ink p-4">
                        <div className="space-y-1">
                          <NotificationPreference
                            notificationType={item.notificationType}
                            emailEnabled={item.emailEnabled}
                            pushEnabled={item.pushEnabled}
                            inAppEnabled={item.inAppEnabled}
                          />
                          <p className="text-sm text-neutral-400">{item.subjectLabel ?? 'General preference'}</p>
                        </div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Ready for later</div>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No notification settings yet" description="The watchlist will grow into a notification hub in a later sprint." />
                  )}
                </div>
              }
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Tracked items</p>
              <h2 className="mt-2 text-2xl font-bold">Watching now</h2>
            </div>

            {watchlist.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {watchlist.map((item) => (
                  <div key={item.id} className="rounded-lg border border-surface-line bg-surface-base p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-neutral-50">{item.subjectLabel}</h3>
                          <TrendBadge trend={item.trend} />
                        </div>
                        <p className="text-sm text-neutral-400">{item.subjectType.replaceAll('_', ' ')}</p>
                        <p className="text-xs text-neutral-500">Last updated {new Date(item.lastUpdatedAt).toLocaleDateString('en-GB')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <WatchButton
                          subjectType={item.subjectType}
                          subjectKey={item.subjectKey}
                          subjectLabel={item.subjectLabel}
                          watched
                          action={toggleWatchlistAction}
                          returnTo="/watchlist"
                          notificationType={item.notificationType}
                        />
                        <p className="text-sm font-semibold text-neutral-50">{formatMoney(item.currentEstimateMinor)}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <MarketValue
                        currentEstimateMinor={item.currentEstimateMinor}
                        yesterdayMinor={item.yesterdayMinor}
                        trend={item.trend}
                        confidenceScore={70}
                      />

                      <form action={updateWatchlistPreferencesAction} className="grid gap-3 md:grid-cols-2">
                        <input type="hidden" name="subjectType" value={item.subjectType} />
                        <input type="hidden" name="subjectKey" value={item.subjectKey} />
                        <input type="hidden" name="subjectLabel" value={item.subjectLabel} />
                        <input type="hidden" name="productId" value={item.productId ?? ''} />
                        <input type="hidden" name="releaseId" value={item.releaseId ?? ''} />
                        <input type="hidden" name="collectionItemId" value={item.collectionItemId ?? ''} />
                        <input type="hidden" name="returnTo" value="/watchlist" />
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor={`notificationType-${item.id}`}>
                            Notification
                          </label>
                          <select
                            id={`notificationType-${item.id}`}
                            name="notificationType"
                            defaultValue={item.notificationType}
                            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
                          >
                            <option value="PRICE_MOVEMENT">Price movement</option>
                            <option value="UPCOMING_RELEASE">Upcoming release</option>
                            <option value="WISHLIST_AVAILABILITY">Wishlist availability</option>
                            <option value="COLLECTION_UPDATES">Collection updates</option>
                            <option value="BUYLIST_UPDATES">Buylist updates</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor={`note-${item.id}`}>
                            Note
                          </label>
                          <input
                            id={`note-${item.id}`}
                            name="note"
                            defaultValue={item.note ?? ''}
                            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
                            placeholder="Optional note"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-neutral-300">
                          <input type="checkbox" name="emailEnabled" defaultChecked={item.emailEnabled} />
                          Email
                        </label>
                        <label className="flex items-center gap-2 text-sm text-neutral-300">
                          <input type="checkbox" name="inAppEnabled" defaultChecked={item.inAppEnabled} />
                          In-app
                        </label>
                        <label className="flex items-center gap-2 text-sm text-neutral-300">
                          <input type="checkbox" name="pushEnabled" defaultChecked={item.pushEnabled} />
                          Push
                        </label>
                        <div className="flex items-end justify-end md:col-span-2">
                          <Button type="submit" variant="secondary">
                            Save preference
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No watched items yet"
                description="Use watch controls on cards, releases, or collection items to bring them here."
                action={
                  <Button asChild>
                    <a href="/catalogue">Browse catalogue</a>
                  </Button>
                }
              />
            )}
          </div>
        </Container>
      </main>
    </PageShell>
  );
}
