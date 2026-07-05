import {
  AnnouncementBanner,
  Button,
  CollectionHealth,
  Container,
  EmptyState,
  InsightCard,
  MarketValue,
  PageShell,
  PortfolioCard,
  Section,
  StatTile,
  TrendBadge,
  ValueSparkline,
} from '@tcg-hobby/ui';
import { getCollectionInsights } from '@tcg-hobby/database';
import { requireCustomerSession } from '../../../lib/auth';
import { SiteHeader } from '../../../components/site-header';

export const dynamic = 'force-dynamic';

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

export default async function CollectionInsightsPage() {
  const session = await requireCustomerSession('/collection/insights');
  const insights = await getCollectionInsights(session.user.id);
  const trend = insights.valueTrendPercent >= 0 ? 'UP' : 'DOWN';
  const sparkline = [
    { label: '30D', valueMinor: insights.thirtyDayValueMinor },
    { label: '7D', valueMinor: insights.sevenDayValueMinor },
    { label: 'Yesterday', valueMinor: insights.previousValueMinor },
    { label: 'Today', valueMinor: insights.estimatedValueMinor },
  ];

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Collection insights</p>
              <h1 className="text-3xl font-black sm:text-4xl">Approximate Market Values for your collection.</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                We surface estimated values and collection health signals so you can understand your binder, deck pool, and wishlist overlap at a glance.
              </p>
            </div>

            <AnnouncementBanner
              title="Approximate market values"
              message="All values are indicative only. They are not investment advice, not guaranteed, and may change as market conditions move."
              action={
                <Button asChild variant="outline">
                  <a href="/watchlist">View watchlist</a>
                </Button>
              }
            />
          </Container>
        </Section>

        <Container className="space-y-10 py-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Estimated value" value={formatMoney(insights.estimatedValueMinor)} helper={`+${insights.valueTrendPercent}% from previous snapshot`} />
            <StatTile label="Cards owned" value={String(insights.cardsOwned)} helper={`${insights.setsOwned} sets represented`} />
            <StatTile label="Favourite game" value={insights.favouriteGame} helper={`${insights.wishlistOverlapCount} wishlist overlaps`} />
            <StatTile label="Deck completion" value={`${insights.deckCompletionPercent}%`} helper="Across your active decks" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <PortfolioCard
              title="Collection portfolio"
              currentEstimateMinor={insights.estimatedValueMinor}
              previousEstimateMinor={insights.previousValueMinor}
              trend={trend}
              confidenceScore={insights.collectionHealthScore}
              actionSlot={
                <div className="space-y-4">
                  <MarketValue
                    currentEstimateMinor={insights.estimatedValueMinor}
                    yesterdayMinor={insights.previousValueMinor}
                    trend={trend}
                    confidenceScore={insights.collectionHealthScore}
                  />
                  <ValueSparkline points={sparkline} />
                </div>
              }
            />
            <CollectionHealth score={insights.collectionHealthScore} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InsightCard
              title="Most valuable cards"
              description="Your strongest approximate values today."
              actionSlot={
                <div className="space-y-3">
                  {insights.mostValuableCards.length ? (
                    insights.mostValuableCards.map((card) => (
                      <div key={card.id} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-50">{card.name}</p>
                            <p className="text-sm text-neutral-400">{card.game}</p>
                          </div>
                          <TrendBadge trend={card.trend} />
                        </div>
                        <p className="mt-2 text-sm text-neutral-300">{formatMoney(card.estimateMinor)}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No collection value yet" description="Add items from the catalogue import flow to see insights." />
                  )}
                </div>
              }
            />

            <InsightCard
              title="Recent activity"
              description="Your latest collection and market changes."
              actionSlot={
                <div className="space-y-3">
                  {insights.recentActivity.map((entry) => (
                    <div key={entry.label} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                      <p className="font-semibold text-neutral-50">{entry.label}</p>
                      <p className="text-sm text-neutral-400">{entry.value}</p>
                    </div>
                  ))}
                </div>
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InsightCard
              title="Biggest gainers"
              description="Cards moving up over the past month."
              actionSlot={
                <div className="space-y-3">
                  {insights.biggestGainers.length ? (
                    insights.biggestGainers.map((card) => (
                      <div key={card.id} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-neutral-50">{card.name}</p>
                          <TrendBadge trend={card.trend} />
                        </div>
                        <p className="mt-2 text-sm text-neutral-300">{formatMoney(card.estimateMinor)}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No gainers yet" description="The collection needs more market data to surface movers." />
                  )}
                </div>
              }
            />

            <InsightCard
              title="Biggest decliners"
              description="Cards easing back in the current market."
              actionSlot={
                <div className="space-y-3">
                  {insights.biggestDecliners.length ? (
                    insights.biggestDecliners.map((card) => (
                      <div key={card.id} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-neutral-50">{card.name}</p>
                          <TrendBadge trend={card.trend} />
                        </div>
                        <p className="mt-2 text-sm text-neutral-300">{formatMoney(card.estimateMinor)}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No decliners yet" description="Your current collection is stable in the seeded market view." />
                  )}
                </div>
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InsightCard
              title="Wishlist overlap"
              description="Cards you already own that are also on your wishlist."
              actionSlot={
                <div className="space-y-3">
                  {insights.wishlistOverlap.length ? (
                    insights.wishlistOverlap.map((item) => (
                      <div key={item.id} className="rounded-lg border border-surface-line bg-surface-ink p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-neutral-50">{item.productName}</p>
                          <TrendBadge trend={item.trend} />
                        </div>
                        <p className="mt-2 text-sm text-neutral-300">{formatMoney(item.estimateMinor)}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No overlap yet" description="The collection and wishlist will cross over once you save more cards." />
                  )}
                </div>
              }
            />

            <InsightCard
              title="Collection heat map"
              description="Placeholder view for future spatial collection analytics."
              actionSlot={
                <div className="space-y-3">
                  {insights.collectionHeatMap.length ? (
                    insights.collectionHeatMap.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-surface-line bg-surface-ink p-4">
                        <p className="font-semibold text-neutral-50">{item.label}</p>
                        <p className="text-sm text-neutral-400">{item.count}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="Heat map pending" description="This panel will become a richer visualisation in a later sprint." />
                  )}
                </div>
              }
            />
          </div>
        </Container>
      </main>
    </PageShell>
  );
}
