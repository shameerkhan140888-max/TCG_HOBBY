import { Badge, Button, Card, CardContent, Container, PageShell, Section } from '@tcg-hobby/ui';
import { BuylistStatusBadge, PriceBadge } from '@tcg-hobby/ui';
import { requireCustomerSession } from '../../lib/auth';
import { getCurrentCustomerBuylistDraft, getCurrentCustomerBuylists } from '../../lib/buylist';
import { SiteHeader } from '../../components/site-header';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function BuylistHomePage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const submitted = asString(params.submitted) === '1';

  await requireCustomerSession('/buylist');
  const [draft, buylists] = await Promise.all([getCurrentCustomerBuylistDraft(), getCurrentCustomerBuylists()]);
  const completed = buylists.filter((buylist) => buylist.status !== 'DRAFT');

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-12">
          <Container className="space-y-6">
            <div className="space-y-3">
              <Badge variant="accent">Sell cards to TCG Hobby</Badge>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Build a buylist request in a few quick steps</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Search for eligible cards, add the items you want to sell, and submit a request for inspection. Estimated values are subject to review.
              </p>
            </div>

            {submitted ? (
              <Card className="border-emerald-500/30 bg-emerald-500/10">
                <CardContent className="space-y-2 p-5">
                  <p className="font-semibold text-emerald-200">Your buylist request was submitted.</p>
                  <p className="text-sm leading-6 text-emerald-100/80">
                    We&apos;ll review the contents, confirm condition, and update the offer once the items are received.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="/buylist/search">Search eligible cards</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/buylist/cart">Review draft</a>
              </Button>
            </div>
          </Container>
        </Section>

        <Container className="space-y-8 py-10">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm text-neutral-400">Draft items</p>
                <p className="text-3xl font-black">{draft?.items.reduce((count, item) => count + item.quantity, 0) ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm text-neutral-400">Estimated payout</p>
                {draft ? <PriceBadge label="Estimated payout" amountMinor={draft.estimatedPayoutMinor} tone="accent" /> : <p className="text-3xl font-black text-accent-soft">GBP 0.00</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm text-neutral-400">Recent submissions</p>
                <p className="text-3xl font-black">{completed.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm text-neutral-400">Current draft</p>
                <div>{draft ? <BuylistStatusBadge status={draft.status} /> : <Badge variant="neutral">No draft yet</Badge>}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Start here</p>
                  <h2 className="mt-2 text-xl font-bold">Find cards we&apos;re buying</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    Search the eligible catalogue, check the current buy price, and add items to your request.
                  </p>
                </div>
                <Button asChild>
                  <a href="/buylist/search">Open search</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Review</p>
                  <h2 className="mt-2 text-xl font-bold">Your pending request</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    Adjust quantities, remove items, and submit when you&apos;re ready for inspection.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <a href="/buylist/cart">Open draft</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Reminder</p>
                <h2 className="mt-2 text-xl font-bold">Estimated values are not final offers</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Final payout depends on received condition, availability, and staff review. No shipping label is generated in this sprint.
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      </main>
    </PageShell>
  );
}
