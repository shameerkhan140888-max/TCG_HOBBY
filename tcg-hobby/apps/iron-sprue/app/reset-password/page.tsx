import { IronSprueResetPasswordForm } from '../../components/password-recovery-forms';

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params?.token ?? '';
  return (
    <section className="section-block auth-page">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Choose a new password</h1>
        <p className="lead">Use the secure reset link from your email to update your Iron Sprue password.</p>
      </div>
      <IronSprueResetPasswordForm token={token} />
    </section>
  );
}
