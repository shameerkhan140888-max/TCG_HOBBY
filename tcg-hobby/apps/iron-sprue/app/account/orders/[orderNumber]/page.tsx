import { notFound } from 'next/navigation';
import { customerOrderStatus, getCurrentIronSprueOrder } from '../../../../lib/orders';
import { submitIronSprueOrderRequestAction } from '../../../../lib/order-request-actions';

function money(value: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

function date(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function canRequestCancellation(order: Awaited<ReturnType<typeof getCurrentIronSprueOrder>>) {
  if (!order) return false;
  return !order.cancelledAt
    && !['CANCELLED', 'CANCELED', 'REFUNDED', 'COMPLETED'].includes(order.status)
    && !['CANCELED', 'REFUNDED'].includes(order.paymentStatus)
    && !['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.fulfilmentStatus);
}

function canRequestReturn(order: Awaited<ReturnType<typeof getCurrentIronSprueOrder>>) {
  if (!order) return false;
  return !order.cancelledAt
    && ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.fulfilmentStatus)
    && ['SUCCEEDED', 'REFUNDED'].includes(order.paymentStatus);
}

export default async function AccountOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams?: Promise<{ requestSaved?: string; requestError?: string }>;
}) {
  const { orderNumber } = await params;
  const query = searchParams ? await searchParams : {};
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
      {query.requestSaved ? <p className="form-success" role="status">Your request has been sent to Iron Sprue support.</p> : null}
      {query.requestError ? <p className="form-error" role="alert">{query.requestError}</p> : null}
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
      {order.customerRequests.length ? (
        <div className="auth-panel">
          <h2>Requests</h2>
          {order.customerRequests.map((request) => (
            <div className="account-line" key={request.id}>
              <span>
                <strong>{request.requestType === 'RETURN' ? 'Return request' : 'Cancellation request'}</strong>
                <small>{request.status} - {date(request.createdAt)}</small>
              </span>
              <strong>{request.reason}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {canRequestCancellation(order) || canRequestReturn(order) ? (
        <div className="auth-panel">
          <h2>Need help with this order?</h2>
          <p>Send a request to Iron Sprue support. We will review the order before any cancellation, return or refund action is taken.</p>
          <form action={submitIronSprueOrderRequestAction} className="account-request-form">
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <label htmlFor="requestType">Request type</label>
            <select id="requestType" name="requestType" required defaultValue={canRequestCancellation(order) ? 'CANCELLATION' : 'RETURN'}>
              {canRequestCancellation(order) ? <option value="CANCELLATION">Request cancellation</option> : null}
              {canRequestReturn(order) ? <option value="RETURN">Request return</option> : null}
            </select>
            <label htmlFor="reason">Reason</label>
            <input id="reason" name="reason" required maxLength={160} placeholder="Changed mind, wrong item, damaged item..." />
            <label htmlFor="customerMessage">Message</label>
            <textarea id="customerMessage" name="customerMessage" rows={4} maxLength={1000} placeholder="Add any helpful details for the support team." />
            <button type="submit" className="button">Send request</button>
          </form>
        </div>
      ) : null}
      <a className="button secondary" href="/account/orders">Back to orders</a>
    </section>
  );
}
