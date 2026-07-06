import { Button, CartLineItem, Container, EmptyState, ErrorMessage, OrderSummary, Section } from '@tcg-hobby/ui';
import { formatMoney } from '@tcg-hobby/utils';
import { calculateVatEstimateMinor, getAvailableShippingMethods } from '@tcg-hobby/database';
import { clearCartAction } from '../../lib/cart';
import { CartLineQuantityForm, RemoveCartItemButton } from '../../components/cart-actions';
import { CommerceProgress } from '../../components/commerce-progress';
import { SiteHeader } from '../../components/site-header';
import { getCurrentCustomerCart } from '../../lib/cart';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function CartPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const cartError = asString(params.cartError);
  const cart = await getCurrentCustomerCart();
  const shippingMethods = await getAvailableShippingMethods('GB');
  const estimatedShippingMinor = shippingMethods[0]?.amountMinor ?? 0;
  const vatEstimateMinor = calculateVatEstimateMinor(cart.subtotalMinor);
  const summary = {
    currency: cart.currency,
    subtotalMinor: cart.subtotalMinor,
    shippingMinor: estimatedShippingMinor,
    taxMinor: vatEstimateMinor,
    totalMinor: cart.subtotalMinor + estimatedShippingMinor + vatEstimateMinor,
  };
  const currentHref = '/cart';

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80">
          <Container className="py-8 sm:py-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Cart</p>
              <h1 className="text-3xl font-black sm:text-4xl">Review your basket before checkout</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">Keep track of the products you want to buy, update quantities, and move forward to a secure Stripe checkout.</p>
            </div>
            <CommerceProgress currentStep="basket" className="mt-6" />
            {cartError ? <ErrorMessage className="mt-4">{cartError}</ErrorMessage> : null}
          </Container>
        </Section>

        <Container className="py-8">
          {cart.items.length ? (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-surface-line bg-surface-base p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Basket items</p>
                      <h2 className="mt-2 text-2xl font-black text-neutral-50">Your selected cards and accessories</h2>
                    </div>
                    <p className="hidden text-sm text-neutral-400 md:block">
                      {cart.totalItems} item{cart.totalItems === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <CartLineItem
                      key={item.id}
                      item={item}
                      className="overflow-hidden"
                      actionSlot={
                        <div className="flex flex-col gap-3 sm:min-w-44">
                          <CartLineQuantityForm productId={item.productId} quantity={item.quantity} returnTo={currentHref} />
                          <RemoveCartItemButton productId={item.productId} returnTo={currentHref} />
                        </div>
                      }
                    />
                  ))}
                </div>

                <div className="rounded-2xl border border-surface-line bg-surface-base p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Delivery estimate</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-surface-line bg-surface-ink p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Delivery</p>
                      <p className="mt-2 text-lg font-bold text-neutral-50">{shippingMethods[0]?.name ?? 'Delivery'}</p>
                      <p className="mt-1 text-sm text-neutral-400">{shippingMethods[0]?.etaLabel ?? 'Calculated at checkout'}</p>
                    </div>
                    <div className="rounded-xl border border-surface-line bg-surface-ink p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">VAT</p>
                      <p className="mt-2 text-lg font-bold text-neutral-50">{formatMoney({ amountMinor: vatEstimateMinor, currency: cart.currency })}</p>
                      <p className="mt-1 text-sm text-neutral-400">Estimated for UK delivery</p>
                    </div>
                    <div className="rounded-xl border border-surface-line bg-surface-ink p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Order total</p>
                      <p className="mt-2 text-lg font-bold text-accent-soft">{formatMoney({ amountMinor: summary.totalMinor, currency: cart.currency })}</p>
                      <p className="mt-1 text-sm text-neutral-400">Includes delivery estimate</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <OrderSummary
                  className="xl:sticky xl:top-24"
                  summary={summary}
                  actionSlot={
                    <div className="space-y-3">
                      <Button asChild className="w-full" size="lg">
                        <a href="/checkout">Proceed to checkout</a>
                      </Button>
                      <form action={clearCartAction}>
                        <input type="hidden" name="returnTo" value={currentHref} />
                        <Button type="submit" className="w-full" variant="outline">
                          Clear basket
                        </Button>
                      </form>
                    </div>
                  }
                />
                <div className="rounded-2xl border border-surface-line bg-surface-base p-4 text-sm leading-6 text-neutral-400">
                  <p className="font-semibold text-neutral-50">Need help?</p>
                  <p className="mt-2">Availability is checked against stock on hand before quantities are changed or checkout begins.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <CommerceProgress currentStep="basket" />
              <EmptyState
                title="Your basket is empty"
                description="Browse the catalogue to add cards, sealed products, or accessories before continuing to checkout."
                action={
                  <Button asChild>
                    <a href="/catalogue">Browse catalogue</a>
                  </Button>
                }
              />
            </div>
          )}

          {cart.items.length ? (
            <div className="sticky bottom-4 z-20 mt-6 lg:hidden">
              <div className="rounded-2xl border border-surface-line bg-surface-ink/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Checkout</p>
                    <p className="mt-1 text-lg font-black text-neutral-50">{formatMoney({ amountMinor: summary.totalMinor, currency: cart.currency })}</p>
                  </div>
                  <Button asChild size="lg" className="shrink-0">
                    <a href="/checkout">Proceed to checkout</a>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Container>
      </main>
    </>
  );
}
