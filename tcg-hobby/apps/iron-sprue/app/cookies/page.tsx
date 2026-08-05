export default function CookiesPage() {
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Cookies</p>
        <h1>Cookie policy</h1>
        <p className="lead">Essential cookies may be used for security, account, basket and checkout functions. Any analytics or marketing cookies will be explained before use where required.</p>
      </div>
      <div className="detail-panels">
        <article>
          <h2>Essential cookies</h2>
          <p>Essential cookies keep the site secure, remember basket state, support account sessions and help checkout work correctly. These cannot be switched off through the site because the service depends on them.</p>
        </article>
        <article>
          <h2>Analytics and marketing</h2>
          <p>If Iron Sprue introduces analytics or marketing cookies, we will explain what they do and provide any required choice before using them for non-essential purposes.</p>
        </article>
        <article>
          <h2>Managing cookies</h2>
          <p>You can restrict or delete cookies in your browser settings. Some account, basket or checkout features may not work correctly if essential cookies are blocked.</p>
        </article>
      </div>
    </section>
  );
}
