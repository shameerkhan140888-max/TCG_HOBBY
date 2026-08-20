import { IronSprueLoginForm } from '../../components/account-forms';

export default function LoginPage() {
  return (
    <section className="section-block auth-page">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Sign in</h1>
        <p className="lead">Access your Iron Sprue orders, wishlist and account details.</p>
      </div>
      <IronSprueLoginForm />
    </section>
  );
}
