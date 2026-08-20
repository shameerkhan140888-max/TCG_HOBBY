import { IronSprueRequestPasswordResetForm } from '../../components/password-recovery-forms';

export default function ForgotPasswordPage() {
  return (
    <section className="section-block auth-page">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Reset your password</h1>
        <p className="lead">Enter your email address and we will send a secure one-time reset link.</p>
      </div>
      <IronSprueRequestPasswordResetForm />
    </section>
  );
}
