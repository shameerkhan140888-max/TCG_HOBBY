import { redirect } from 'next/navigation';
import { IronSprueLogoutForm, IronSprueProfileForm } from '../../components/account-forms';
import { getCurrentIronSprueCustomerSession } from '../../lib/auth';
import { getCurrentIronSprueOrders } from '../../lib/orders';

export default async function AccountPage() {
  const session = await getCurrentIronSprueCustomerSession();
  if (!session) redirect('/login?next=/account');
  const orders = await getCurrentIronSprueOrders();
  return (
    <section className="section-block auth-page">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Iron Sprue account</h1>
        <p className="lead">Manage your profile, review orders and keep track of your workshop bench list.</p>
      </div>
      <div className="account-grid">
        <IronSprueProfileForm name={session.user.name} email={session.user.email} />
        <div className="auth-panel">
          <h2>Orders</h2>
          <p>{orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'} linked to this account.` : 'No account orders yet.'}</p>
          <a className="button" href="/account/orders">View order history</a>
          <a className="button secondary" href="/wishlist">View wishlist</a>
          <IronSprueLogoutForm />
        </div>
      </div>
    </section>
  );
}
