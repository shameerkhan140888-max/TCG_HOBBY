import { Button, Container, EmptyState, Section } from '@tcg-hobby/ui';
import { calculateVatEstimateMinor } from '@tcg-hobby/database';
import { CheckoutForm } from '../../components/checkout-form';
import { CommerceProgress } from '../../components/commerce-progress';
import { SiteHeader } from '../../components/site-header';
import { getCheckoutPageData } from '../../lib/checkout';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const data = await getCheckoutPageData();

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80">
          <Container className="py-8 sm:py-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Checkout</p>
              <h1 className="text-3xl font-black sm:text-4xl">Securely complete your order</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Review delivery details, choose a delivery method, and pay through Stripe test mode. Guests can check out without creating an account.
              </p>
            </div>
            <CommerceProgress currentStep="delivery" className="mt-6" />
          </Container>
        </Section>

        <Container className="py-8">
          {data.cart.items.length ? (
            <CheckoutForm
              state={{
                fieldErrors: {},
                values: {
                  ...data.defaults,
                },
                shippingMethods: data.shippingMethods,
              }}
              cartSubtotalMinor={data.cart.subtotalMinor}
              cartItems={data.cart.items}
              taxEstimateMinor={calculateVatEstimateMinor(data.cart.subtotalMinor)}
            />
          ) : (
            <EmptyState
              title="Your cart is empty"
              description="Add products to your cart before moving to checkout."
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
