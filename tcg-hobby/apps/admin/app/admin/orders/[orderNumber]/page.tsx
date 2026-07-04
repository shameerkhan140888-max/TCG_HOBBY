import { notFound } from 'next/navigation';
import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, PageHeader, StatusBadge } from '@tcg-hobby/ui';
import { getAdminOrderByNumber } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

type ParamsValue = { orderNumber: string };

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<ParamsValue> }) {
  const { orderNumber } = await params;
  const order = await getAdminOrderByNumber(orderNumber);

  if (!order) {
    notFound();
  }

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Orders"
          title={order.orderNumber}
          description="Read-only order view for operations and support."
          actions={
            <Button asChild variant="outline">
              <a href="/admin/orders">Back</a>
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Payment</p>
              <StatusBadge tone={order.paymentStatus === 'SUCCEEDED' ? 'success' : order.paymentStatus === 'FAILED' ? 'warning' : 'neutral'}>
                {order.paymentStatus}
              </StatusBadge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Fulfilment</p>
              <StatusBadge tone={order.fulfilmentStatus === 'SHIPPED' ? 'success' : order.fulfilmentStatus === 'CANCELLED' ? 'neutral' : 'warning'}>
                {order.fulfilmentStatus}
              </StatusBadge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Total</p>
              <p className="text-2xl font-black text-neutral-50">{formatMoney(order.totalMinor)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Customer</p>
              <p className="text-sm text-neutral-50">{order.customerName}</p>
              <p className="text-xs text-neutral-500">{order.customerEmail}</p>
            </CardContent>
          </Card>
        </div>

        <AdminTable columns={['Item', 'Quantity', 'Unit', 'Total']}>
          <tbody className="divide-y divide-surface-line bg-surface-base">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4 text-neutral-50">{item.productName}</td>
                <td className="px-4 py-4 text-neutral-300">{item.quantity}</td>
                <td className="px-4 py-4 text-neutral-300">{formatMoney(item.unitPriceMinor)}</td>
                <td className="px-4 py-4 text-neutral-300">{formatMoney(item.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
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
                <p className="text-sm text-neutral-400">No shipping address on record.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 text-sm text-neutral-400">
              <h2 className="text-lg font-semibold text-neutral-50">Shipping and payment</h2>
              <p>Method: <span className="text-neutral-50">{order.shippingMethodName}</span></p>
              <p>Shipping code: <span className="text-neutral-50">{order.shippingMethodCode}</span></p>
              <p>Subtotal: <span className="text-neutral-50">{formatMoney(order.subtotalMinor)}</span></p>
              <p>Shipping: <span className="text-neutral-50">{formatMoney(order.shippingMinor)}</span></p>
              <p>Tax: <span className="text-neutral-50">{formatMoney(order.taxMinor)}</span></p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
