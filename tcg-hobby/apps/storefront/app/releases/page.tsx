import { Button, Container, EmptyState, Input, PageShell, Section } from '@tcg-hobby/ui';
import { AnnouncementBanner, ReleaseTimeline } from '@tcg-hobby/ui';
import { getCatalogueCategories, getReleaseCalendar } from '@tcg-hobby/database';
import type { ReleaseCalendarEntry } from '@tcg-hobby/types';
import { SiteHeader } from '../../components/site-header';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function createHref(params: { search: string; game: string; brand: string; category: string; month: string }) {
  const query = new URLSearchParams();

  if (params.search) query.set('q', params.search);
  if (params.game) query.set('game', params.game);
  if (params.brand) query.set('brand', params.brand);
  if (params.category) query.set('category', params.category);
  if (params.month) query.set('month', params.month);

  const queryString = query.toString();
  return queryString ? `/releases?${queryString}` : '/releases';
}

function toUniqueOptions(items: string[]) {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function splitUpcomingAndPast(releases: ReleaseCalendarEntry[]) {
  const now = Date.now();
  return {
    upcoming: releases.filter((release) => new Date(release.releaseDate).getTime() >= now),
    past: releases.filter((release) => new Date(release.releaseDate).getTime() < now),
  };
}

export default async function ReleasesPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.q);
  const game = asString(params.game);
  const brand = asString(params.brand);
  const category = asString(params.category);
  const month = asString(params.month);

  const [calendar, categories] = await Promise.all([
    getReleaseCalendar({ search, game, brand, category, month }),
    getCatalogueCategories(),
  ]);
  const { upcoming, past } = splitUpcomingAndPast(calendar.releases);
  const games = toUniqueOptions(calendar.releases.map((release) => release.game));
  const brands = toUniqueOptions(calendar.releases.map((release) => release.brand));

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/70 py-8">
          <Container className="space-y-4">
            <AnnouncementBanner
              title="Release calendar"
              message="Track launch dates, preorder windows, and past release waves in one monthly calendar."
            />
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Launch schedule</p>
              <h1 className="text-3xl font-black sm:text-4xl">Browse upcoming and past releases</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Search by game, brand, category, or month to see what is landing next and what has already gone live.
              </p>
            </div>
          </Container>
        </Section>

        <Section>
          <Container className="space-y-6">
            <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
              <Input name="q" defaultValue={search} placeholder="Search releases, sets, and launch notes" />
              <select name="game" defaultValue={game} className="h-10 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent">
                <option value="">All games</option>
                {games.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select name="brand" defaultValue={brand} className="h-10 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent">
                <option value="">All brands</option>
                {brands.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select name="category" defaultValue={category} className="h-10 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent">
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select name="month" defaultValue={month} className="h-10 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent">
                <option value="">All months</option>
                {calendar.months.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <div className="lg:col-span-5">
                <Button type="submit">Apply filters</Button>
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                ['Upcoming launches', String(upcoming.length)],
                ['Past launches', String(past.length)],
                ['Featured releases', String(calendar.releases.filter((release) => release.featuredOnHomepage).length)],
                ['Months shown', String(calendar.months.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-surface-line bg-surface-base p-5">
                  <p className="text-sm text-neutral-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-neutral-50">{value}</p>
                </div>
              ))}
            </div>

            {upcoming.length ? (
              <div className="space-y-8">
                {calendar.months.map((monthGroup) => (
                  <div key={monthGroup.key} className="space-y-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Launch month</p>
                        <h2 className="mt-2 text-2xl font-bold">{monthGroup.label}</h2>
                      </div>
                      <Button asChild variant="outline">
                        <a href={createHref({ search, game, brand, category, month: monthGroup.key })}>Filter to month</a>
                      </Button>
                    </div>
                    <ReleaseTimeline releases={monthGroup.releases} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No releases match those filters"
                description="Try widening the search or clearing one of the filters. The release calendar is intentionally broad so customers can stay up to date."
                action={
                  <Button asChild>
                    <a href="/releases">Reset filters</a>
                  </Button>
                }
              />
            )}
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
