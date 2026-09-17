import { ironSprueBrand } from '../../lib/brand';
import { IronSprueCookiePreferenceButton } from '../../components/analytics-consent';

const storageInventory = [
  {
    name: 'iron_sprue_cookie_consent',
    provider: 'Iron Sprue',
    purpose: 'Stores the visitor cookie preference for strictly necessary, analytics and marketing choices.',
    category: 'Strictly necessary',
    party: 'First party',
    duration: 'Up to 12 months unless cleared or changed by the visitor.',
  },
  {
    name: 'iron_sprue_cookie_consent in localStorage',
    provider: 'Iron Sprue',
    purpose: 'Mirrors the cookie preference locally so route changes do not reshow the banner.',
    category: 'Strictly necessary',
    party: 'First party',
    duration: 'Until the visitor changes preferences, clears site data or browser storage is cleared.',
  },
  {
    name: 'iron-sprue-basket-v1',
    provider: 'Iron Sprue',
    purpose: 'Stores guest basket items on this device so the basket works between pages.',
    category: 'Strictly necessary',
    party: 'First party',
    duration: 'Until checkout completion, basket clearing or browser storage is cleared.',
  },
  {
    name: 'iron-sprue-pending-payment-basket-v1',
    provider: 'Iron Sprue',
    purpose: 'Temporarily preserves basket contents during payment confirmation so a failed payment can be recovered.',
    category: 'Strictly necessary',
    party: 'First party',
    duration: 'Session storage; normally cleared after payment success, payment failure recovery or browser close.',
  },
  {
    name: 'iron-sprue:checkout-success:*',
    provider: 'Iron Sprue',
    purpose: 'Temporarily caches a confirmed checkout result so the success page remains stable while payment confirmation settles.',
    category: 'Strictly necessary',
    party: 'First party',
    duration: 'Session storage; cleared when the browser session ends.',
  },
  {
    name: 'iron_sprue_purchase_tracked:*',
    provider: 'Iron Sprue',
    purpose: 'Prevents duplicate purchase analytics events for the same order when analytics or marketing consent is active.',
    category: 'Analytics or marketing support',
    party: 'First party',
    duration: 'Local storage until browser storage is cleared.',
  },
  {
    name: 'Stripe.js provider-managed storage',
    provider: 'Stripe',
    purpose: 'Supports secure card-entry, fraud prevention and payment processing when the checkout payment form is loaded.',
    category: 'Strictly necessary for checkout payment',
    party: 'Third party',
    duration: 'Managed by Stripe according to its own payment and fraud-prevention controls.',
  },
  {
    name: 'Google Analytics provider-managed storage',
    provider: 'Google',
    purpose: 'Measures site usage only where Google Analytics is configured and analytics consent has been given.',
    category: 'Analytics',
    party: 'Third party',
    duration: 'Managed by Google Analytics when active and consented.',
  },
  {
    name: 'Meta Pixel provider-managed storage',
    provider: 'Meta',
    purpose: 'Measures campaign or product-interest events only where Meta Pixel is configured and marketing consent has been given.',
    category: 'Marketing',
    party: 'Third party',
    duration: 'Managed by Meta when active and consented.',
  },
  {
    name: 'Cloudflare technical delivery data',
    provider: 'Cloudflare',
    purpose: 'Supports secure, reliable delivery of the storefront and media assets.',
    category: 'Strictly necessary',
    party: 'Third party infrastructure',
    duration: 'Managed by Cloudflare according to the technical delivery function used.',
  },
] as const;

export default function CookiesPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Cookies</p>
        <h1>Cookie policy</h1>
        <p className="lead">How Iron Sprue uses cookies and similar browser technologies.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>What cookies are</h2>
            <p>Cookies are small pieces of information stored by a browser or device. Websites may also use technologies such as local storage or similar browser storage.</p>
          </section>
          <section>
            <h2>Strictly necessary technologies</h2>
            <p>Some technologies are necessary for Iron Sprue to operate. These may support basket operation, checkout, login and account sessions, fraud and security controls, cookie-consent preferences, load balancing and reliable delivery.</p>
            <p>Strictly necessary technologies do not require optional marketing or analytics consent where they are genuinely necessary to provide the service requested. They cannot be disabled through Iron Sprue's optional cookie controls.</p>
          </section>
          <section>
            <h2>Analytics</h2>
            <p>Analytics technologies help us understand how the site is used. They remain off by default unless and until the visitor has given the required consent.</p>
          </section>
          <section>
            <h2>Marketing</h2>
            <p>Marketing technologies may be used to understand campaign effectiveness or advertising interactions. They remain off by default unless the relevant technology is present and the required consent has been given.</p>
          </section>
          <section>
            <h2>Current cookie and storage inventory</h2>
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Provider</th>
                    <th>Purpose</th>
                    <th>Category</th>
                    <th>First/third party</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {storageInventory.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.provider}</td>
                      <td>{item.purpose}</td>
                      <td>{item.category}</td>
                      <td>{item.party}</td>
                      <td>{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>Changing your preferences</h2>
            <p>You can reopen cookie preferences from the footer or this page. Strictly necessary technologies remain active. Analytics and marketing choices can be changed where those categories are available.</p>
            <p>Withdrawing consent must be as straightforward as giving it.</p>
            <IronSprueCookiePreferenceButton />
          </section>
          <section>
            <h2>Browser settings</h2>
            <p>You can also delete or block cookies using your browser settings. Blocking technologies required for basket, account or checkout functionality may prevent parts of the website from working.</p>
          </section>
          <section>
            <h2>Contact</h2>
            <p>Questions about cookies or privacy can be sent to <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
