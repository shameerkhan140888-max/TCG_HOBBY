import { Button, Card, CardContent, Container, EmptyState, PageShell, Section } from '@tcg-hobby/ui';
import { BuylistStatusBadge, PriceBadge } from '@tcg-hobby/ui';
import { submitBuylistAction } from '../../../lib/buylist';
import { getCurrentCustomerBuylistDraft } from '../../../lib/buylist';
import { BuylistQuantityForm, RemoveBuylistItemButton } from '../../../components/buylist-actions';
import { SiteHeader } from '../../../components/site-header';

export const dynamic = 'force-dynamic';

export default async function BuylistCartPage() {
  const draft = await getCurrentCustomerBuylistDraft();

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-12">
          <Container className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Buylist draft</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Review quantities before you submit</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                We&apos;ll inspect the cards after submission. Estimated payout is shown here for planning purposes only.
              </p>
            </div>
            {draft ? <BuylistStatusBadge status={draft.status} /> : null}
          </Container>
        </Section>

        <Container className="py-10">
          {draft && draft.items.length ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {draft.items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-neutral-50">{item.productName}</h2>
                            <BuylistStatusBadge status={draft.status} />
                          </div>
                          <p className="text-sm text-neutral-400">{item.productSlug}</p>
                          <div className="flex flex-wrap gap-2">
                            <PriceBadge label="Estimated" amountMinor={item.lineEstimatedPayoutMinor} tone="accent" />
                            <PriceBadge label="Offered" amountMinor={item.lineOfferedPayoutMinor} tone="neutral" />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">Line payout</p>
                          <p className="text-xl font-bold text-accent-soft">
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: draft.currency }).format(item.lineEstimatedPayoutMinor / 100)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <BuylistQuantityForm productId={item.productId} quantity={item.quantity} returnTo="/buylist/cart" maxQuantity={99} />
                        <RemoveBuylistItemButton productId={item.productId} returnTo="/buylist/cart" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent">Summary</p>
                    <h2 className="text-xl font-bold">Estimated payout</h2>
                    <p className="text-sm leading-6 text-neutral-400">This figure is provisional until the cards are checked on arrival.</p>
                  </div>

                  <div className="space-y-3 rounded-lg border border-surface-line bg-surface-ink p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Items</span>
                      <span className="font-medium text-neutral-50">{draft.items.reduce((count, item) => count + item.quantity, 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Estimated payout</span>
                      <span className="font-medium text-neutral-50">
                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: draft.currency }).format(draft.estimatedPayoutMinor / 100)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Offered payout</span>
                      <span className="font-medium text-neutral-50">
                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: draft.currency }).format(draft.offeredPayoutMinor / 100)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                    Payout values are estimates only and may change after inspection, grading review, or condition checks.
                  </div>

                  <form action={submitBuylistAction} className="space-y-4">
                    <label className="space-y-2 text-sm text-neutral-300">
                      <span className="text-xs uppercase tracking-wide text-neutral-500">Customer notes</span>
                      <textarea
                        name="customerNotes"
                        defaultValue={draft.customerNotes ?? ''}
                        rows={4}
                        className="w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="Any helpful notes about condition, packaging, or the cards you're sending in."
                      />
                    </label>
                    <Button type="submit" className="w-full">
                      Submit buylist request
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState
              title="Your buylist draft is empty"
              description="Search eligible cards, add the items you want to sell, then return here to submit the request."
              action={
                <Button asChild>
                  <a href="/buylist/search">Search buylist</a>
                </Button>
              }
            />
          )}
        </Container>
      </main>
    </PageShell>
  );
}
