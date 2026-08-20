import { notFound } from 'next/navigation';
import { customerOrderStatus, getCurrentIronSprueOrder } from '../../../../lib/orders';

function money(value: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

function date(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await getCurrentIronSprueOrder(decodeURIComponent(orderNumber));
  if (!order) notFound();
  const trackingReady = Boolean(order.trackingNumber && order.trackingCarrier);
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Order {order.orderNumber}</h1>
        <p className="lead">{customerOrderStatus(order)} - placed {date(order.createdAt)}</p>
      </div>
      <div className="receipt-grid">
        <div className="auth-panel">
          <h2>Items</h2>
          {order.items.map((item) => (
            <div className="account-line" key={item.id}>
              <span>
                <strong>{item.productName}</strong>
                <small>{item.productSku} - Qty {item.quantity}</small>
              </span>
              <strong>{money(item.totalMinor, order.currency)}</strong>
            </div>
          ))}
        </div>
        <div className="auth-panel">
          <h2>Summary</h2>
          <div className="account-line"><span>Subtotal</span><strong>{money(order.subtotalMinor, order.currency)}</strong></div>
          <div className="account-line"><span>Delivery</span><strong>{money(order.shippingMinor, order.currency)}</strong></div>
          {order.discountMinor > 0 ? <div className="account-line"><span>Discount</span><strong>-{money(order.discountMinor, order.currency)}</strong></div> : null}
          <div className="account-line"><span>Total paid</span><strong>{money(order.totalMinor, order.currency)}</strong></div>
          {trackingReady ? (
            <div className="tracking-panel">
              <h3>Tracking</h3>
              <p>{order.trackingCarrier}: {order.trackingNumber}</p>
              {order.trackingUrl ? <a className="button secondary" href={order.trackingUrl} target="_blank" rel="noreferrer">Track your order</a> : null}
            </div>
          ) : null}
        </div>
      </div>
      <a className="button secondary" href="/account/orders">Back to orders</a>
    </section>
  );
}
