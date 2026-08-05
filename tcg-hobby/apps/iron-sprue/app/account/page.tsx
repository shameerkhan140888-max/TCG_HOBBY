export default function AccountPage() {
  return (
    <section className="section-block auth-page">
      <div className="section-head">
        <p className="eyebrow">Account</p>
        <h1>Iron Sprue account</h1>
        <p className="lead">Customer account actions will use the shared commerce API once transactional writes are connected.</p>
      </div>
      <form className="auth-panel">
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" placeholder="you@example.com" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" />
        <button type="button" disabled>Login coming soon</button>
        <a className="wishlist-icon-link" href="/wishlist" aria-label="View wishlist">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20s-7-4.4-9.3-8.6C1 8.2 2.7 5 6.1 5c2 0 3.4 1.1 4.1 2.2C10.9 6.1 12.3 5 14.3 5c3.4 0 5.1 3.2 3.4 6.4C19 15.6 12 20 12 20Z" />
          </svg>
        </a>
      </form>
    </section>
  );
}
