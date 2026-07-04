import { Button, CartLineItem, Container, EmptyState, ErrorMessage, OrderSummary, Section } from '@tcg-hobby/ui';
import { getCurrentCustomerCart } from '../../lib/cart';
import { clearCartAction } from '../../lib/cart';
import { CartLineQuantityForm, RemoveCartItemButton } from '../../components/cart-actions';
import { SiteHeader } from '../../components/site-header';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function CartPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const cartError = asString(params.cartError);
  const cart = await getCurrentCustomerCart();
  const currentHref = '/cart';

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80">
          <Container className="py-8 sm:py-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Cart</p>
              <h1 className="text-3xl font-black sm:text-4xl">Review your items before checkout</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">Keep track of the products you want to buy, update quantities, and move forward to a secure Stripe checkout.</p>
            </div>
            {cartError ? <ErrorMessage className="mt-4">{cartError}</ErrorMessage> : null}
          </Container>
        </Section>

        <Container className="py-8">
          {cart.items.length ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <CartLineItem
                    key={item.id}
                    item={item}
                    actionSlot={
                      <div className="flex flex-col gap-3">
                        <CartLineQuantityForm productId={item.productId} quantity={item.quantity} returnTo={currentHref} />
                        <RemoveCartItemButton productId={item.productId} returnTo={currentHref} />
                      </div>
                    }
                  />
                ))}
              </div>

              <div className="space-y-4">
                <OrderSummary
                  summary={{
                    currency: cart.currency,
                    subtotalMinor: cart.subtotalMinor,
                    shippingMinor: 0,
                    taxMinor: 0,
                    totalMinor: cart.subtotalMinor,
                  }}
                  actionSlot={
                    <div className="space-y-3">
                      <Button asChild className="w-full">
                        <a href="/checkout">Proceed to checkout</a>
                      </Button>
                      <form action={clearCartAction}>
                        <input type="hidden" name="returnTo" value={currentHref} />
                        <Button type="submit" className="w-full" variant="outline">
                          Clear cart
                        </Button>
                      </form>
                    </div>
                  }
                />
                <div className="rounded-lg border border-surface-line bg-surface-base p-4 text-sm leading-6 text-neutral-400">
                  <p className="font-semibold text-neutral-50">Need help?</p>
                  <p className="mt-2">Availability is checked against stock on hand before quantities are changed or checkout begins.</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Your cart is empty"
              description="Start with featured products or jump back into the catalogue to build your order."
              action={
                <Button asChild>
                  <a href="/catalogue">Browse catalogue</a>
                </Button>
              }
            />
          )}
        </Container>
      </main>
    </>
  );
}
