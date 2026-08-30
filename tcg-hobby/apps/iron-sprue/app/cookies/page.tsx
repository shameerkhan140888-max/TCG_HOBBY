import { ironSprueBrand } from '../../lib/brand';
import { IronSprueCookiePreferenceButton } from '../../components/analytics-consent';

export default function CookiesPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Cookies</p>
        <h1>Cookie policy</h1>
        <p className="lead">How Iron Sprue uses strictly necessary cookies and cache storage, plus optional analytics or marketing technologies where enabled.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>What cookies are</h2>
            <p>Cookies and similar browser storage help a website remember information between pages and visits. Some are essential for the service to work; others are optional and should only run where consent or another lawful basis allows.</p>
          </section>
          <section>
            <h2>Strictly necessary cookies and cache storage</h2>
            <p>Strictly necessary cookies, cache storage and similar technologies may be used for security, account sessions, basket persistence, checkout, fraud prevention, staging access, reliable page delivery and basic service performance.</p>
            <p>These are necessary for the storefront to operate and cannot be switched off through the site controls.</p>
          </section>
          <section>
            <h2>Analytics and marketing</h2>
            <p>Where Iron Sprue uses optional analytics or marketing cookies, the site should request and respect the appropriate consent before those optional tools are used.</p>
            <p>Analytics cookies may help us understand site performance, product interest and customer journeys. Marketing cookies, where enabled, may help measure advertising, campaign and ecommerce activity.</p>
          </section>
          <section>
            <h2>Payment, email and delivery services</h2>
            <p>Checkout, payment, email, hosting, security and delivery-related providers may use technical identifiers where needed to provide their service securely.</p>
            <p>Iron Sprue does not use these technical tools to ask customers to send card details by email or support message.</p>
          </section>
          <section>
            <h2>Changing your choice</h2>
            <p>Where optional cookie preferences are available, you can update your choice using the cookie preferences link in the site footer or the available cookie controls.</p>
            <p>You can also restrict or delete cookies in your browser settings. Blocking essential cookies may stop account, basket or checkout features from working correctly.</p>
            <IronSprueCookiePreferenceButton />
          </section>
          <section>
            <h2>Questions</h2>
            <p>For questions about cookies or privacy, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
