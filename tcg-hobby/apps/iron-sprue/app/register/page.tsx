import { IronSprueRegisterForm } from '../../components/account-forms';

export default function RegisterPage() {
  return (
    <section className="section-block auth-page">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Create your Iron Sprue account</h1>
        <p className="lead">Save products, view orders and keep your delivery details ready for future builds.</p>
      </div>
      <IronSprueRegisterForm />
    </section>
  );
}
