import { notFound } from 'next/navigation';
import { Button, Container, EmptyState, OrderStatusBadge, OrderSummary, PaymentStatusBadge, ProductImagePlaceholder, ProductImageStage, Section } from '@capital-hobby/ui';
import { CommerceProgress } from '../../../components/commerce-progress';
import { GuestCartClearer } from '../../../components/guest-cart-clearer';
import { PaymentStatusRefresher } from '../../../components/payment-status-refresher';
import { SiteHeader } from '../../../components/site-header';
import { getOrderForStripeReturn } from '../../../lib/orders';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsValue>;
}) {
  const params = (await searchParams) ?? {};
  const sessionId = asString(params.session_id);

  if (!sessionId) {
    notFound();
  }

  const order = await getOrderForStripeReturn(sessionId);
  const linkedToAccount = Boolean(order?.userId);
  const paid = order?.paymentStatus === 'SUCCEEDED';

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80">
          <Container className="py-8 sm:py-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Order confirmation</p>
              <h1 className="text-3xl font-black sm:text-4xl">
                {paid && order ? `Order ${order.orderNumber} confirmed` : 'Confirming your payment'}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                {paid ? 'Your signed Stripe payment confirmation has been received.' : 'Stripe is securely confirming your payment. This page will update automatically.'}
              </p>
            </div>
            <CommerceProgress currentStep="confirmation" className="mt-6" />
          </Container>
        </Section>

        <Container className="py-8">
          {order ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <PaymentStatusRefresher enabled={!paid} />
              <GuestCartClearer enabled={paid && !linkedToAccount} />
              <div className="space-y-4">
                <div className="rounded-2xl border border-surface-line bg-surface-base p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <PaymentStatusBadge status={order.paymentStatus} />
                    <OrderStatusBadge status={order.fulfilmentStatus} />
                    <span className="text-sm text-neutral-400">Stripe session {order.stripeCheckoutSessionId}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    {paid
                      ? `Your order is secure and ready for fulfilment.${!linkedToAccount ? ' Guest orders are stored against the email address you entered at checkout.' : ''}`
                      : 'Your order remains reserved while the signed payment confirmation is processed. Do not submit another payment.'}
                  </p>
                </div>

                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-surface-line bg-surface-base p-4">
                      <div className="flex items-center gap-4">
                        <ProductImageStage className="flex h-20 w-20 flex-none items-center justify-center p-2">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.imageAlt ?? item.productName} className="h-full w-full object-contain" />
                          ) : (
                            <ProductImagePlaceholder label="Product image unavailable" compact />
                          )}
                        </ProductImageStage>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-semibold text-neutral-50">{item.productName}</h2>
                          <p className="text-sm text-neutral-400">{item.quantity} x {item.productSlug}</p>
                        </div>
                        <p className="font-semibold text-accent-soft">GBP {(item.totalMinor / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <OrderSummary
                  summary={{
                    currency: order.currency as 'GBP',
                    subtotalMinor: order.subtotalMinor,
                    shippingMinor: order.shippingMinor,
                    taxMinor: order.taxMinor,
                    totalMinor: order.totalMinor,
                  }}
                  actionSlot={
                    <div className="space-y-3">
                      {paid && linkedToAccount ? (
                        <Button asChild className="w-full">
                          <a href={`/account/orders/${order.orderNumber}`}>View order details</a>
                        </Button>
                      ) : null}
                      <Button asChild className="w-full" variant="outline">
                        <a href="/catalogue">Continue shopping</a>
                      </Button>
                    </div>
                  }
                />
              </div>
            </div>
          ) : (
          <EmptyState
            title="We could not find this payment session"
            description="Return to your basket or contact support if Stripe has already charged you."
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
