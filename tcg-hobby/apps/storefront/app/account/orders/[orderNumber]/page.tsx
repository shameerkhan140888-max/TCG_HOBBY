import { notFound } from 'next/navigation';
import { Button, Card, CardContent, Container, OrderStatusBadge, OrderSummary, PaymentStatusBadge, Section } from '@tcg-hobby/ui';
import { getCurrentCustomerOrder } from '../../../../lib/orders';

type ParamsValue = { orderNumber: string };

export default async function AccountOrderDetailPage({ params }: { params: Promise<ParamsValue> }) {
  const { orderNumber } = await params;
  const order = await getCurrentCustomerOrder(orderNumber);

  if (!order) {
    notFound();
  }

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Order details</p>
            <h1 className="text-3xl font-black sm:text-4xl">{order.orderNumber}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <PaymentStatusBadge status={order.paymentStatus} />
              <OrderStatusBadge status={order.fulfilmentStatus} />
            </div>
          </div>
          <Button asChild variant="outline">
            <a href="/account/orders">Back to orders</a>
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {order.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-50">{item.productName}</h2>
                    <p className="text-sm text-neutral-400">{item.quantity} x {item.productSlug}</p>
                  </div>
                  <p className="text-lg font-bold text-accent-soft">GBP {(item.totalMinor / 100).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-lg font-semibold text-neutral-50">Shipping address</h2>
                {order.shippingAddress ? (
                  <div className="text-sm leading-6 text-neutral-400">
                    <p className="text-neutral-50">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.line1}</p>
                    {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                    <p>
                      {order.shippingAddress.city}
                      {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''}
                    </p>
                    <p>
                      {order.shippingAddress.postalCode} {order.shippingAddress.country}
                    </p>
                    <p>{order.shippingAddress.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">No shipping address was stored for this order.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <OrderSummary
              summary={{
                currency: order.currency as 'GBP',
                subtotalMinor: order.subtotalMinor,
                shippingMinor: order.shippingMinor,
                taxMinor: order.taxMinor,
                totalMinor: order.totalMinor,
              }}
              actionSlot={
                <div className="space-y-3 text-sm leading-6 text-neutral-400">
                  <p>Shipping method: <span className="text-neutral-50">{order.shippingMethodName}</span></p>
                  <p>Stripe session: <span className="break-all text-neutral-50">{order.stripeCheckoutSessionId ?? 'Pending'}</span></p>
                  <p>Payment intent: <span className="break-all text-neutral-50">{order.paymentIntentId ?? 'Pending'}</span></p>
                </div>
              }
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
