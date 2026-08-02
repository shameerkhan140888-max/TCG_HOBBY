import { Button, Card, CardContent, Container, EmptyState, Section } from '@tcg-hobby/ui';
import { getCurrentCustomerOrders } from '../../../lib/orders';

export default async function AccountOrdersPage() {
  const orders = await getCurrentCustomerOrders();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Orders</p>
          <h1 className="text-3xl font-black sm:text-4xl">Your order history</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">Review recent purchases, shipment states, and the total value of each order.</p>
        </div>

        {orders.length ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.orderNumber}>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-neutral-50">{order.orderNumber}</p>
                    <p className="text-sm text-neutral-400">
                      {order.itemCount} items . {order.shippingMethodName} . {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : ''}
                    </p>
                    <p className="text-2xl font-black text-accent-soft">GBP {(order.totalMinor / 100).toFixed(2)}</p>
                  </div>
                  <Button asChild variant="outline">
                    <a href={`/account/orders/${order.orderNumber}`}>View order</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="You have no orders yet"
            description="Once you complete a checkout, your past orders will appear here."
            action={
              <Button asChild>
                <a href="/catalogue">Browse catalogue</a>
              </Button>
            }
          />
        )}
      </Container>
    </Section>
  );
}
