import { ironSprueBrand } from '../../lib/brand';

export const metadata = {
  title: 'Access Iron Sprue staging',
  robots: { index: false, follow: false },
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = params.returnTo?.startsWith('/') ? params.returnTo : '/';

  return (
    <main className="access-page">
      <section className="access-panel">
        <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="190" height="52" />
        <h1 style={{ fontSize: 34, lineHeight: 1.05, marginTop: 28 }}>Protected staging access</h1>
        <p className="meta">Enter the preview password to continue. Public launch remains disabled until explicit approval.</p>
        <form method="post" action="/api/staging-access">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {params.error ? <p role="alert" className="meta">The password was not accepted.</p> : null}
          <button type="submit" style={{ marginTop: 16 }}>Unlock preview</button>
        </form>
      </section>
    </main>
  );
}
