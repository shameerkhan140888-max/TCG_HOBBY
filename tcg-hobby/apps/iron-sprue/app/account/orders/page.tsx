import { getCurrentIronSprueOrders, customerOrderStatus } from '../../../lib/orders';

function money(value: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
}

export default async function AccountOrdersPage() {
  const orders = await getCurrentIronSprueOrders();
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Order history</h1>
        <p className="lead">Track Iron Sprue purchases and dispatch details from your account.</p>
      </div>
      {orders.length ? (
        <div className="account-list">
          {orders.map((order) => (
            <a className="account-list-card" key={order.id} href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}>
              <span>
                <strong>{order.orderNumber}</strong>
                <small>{date(order.createdAt)} - {customerOrderStatus(order)}</small>
              </span>
              <strong>{money(order.totalMinor, order.currency)}</strong>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No orders yet.</h2>
          <p>Your Iron Sprue orders will appear here after checkout.</p>
          <a className="button" href="/shop">Browse products</a>
        </div>
      )}
    </section>
  );
}
