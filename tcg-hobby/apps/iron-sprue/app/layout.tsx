import type { Metadata } from 'next';
import './globals.css';
import { ironSprueBrand } from '../lib/brand';
import { getIronSpruePromoStripItems } from '../lib/admin-storefront-controls';
import { categoryNavigation } from '../lib/storefront';
import { LaunchListForm } from '../components/launch-list-form';
import { BasketLink } from '../components/basket-link';
import { IronSprueAnalyticsProvider, IronSprueCookieConsentBanner, IronSprueCookiePreferenceLink } from '../components/analytics-consent';

export const metadata: Metadata = {
  title: {
    default: 'Iron Sprue | Premium model kits and workshop essentials',
    template: '%s | Iron Sprue',
  },
  description: 'A premium modelling workshop and curated model-building retailer from Capital Hobby Group Ltd.',
  metadataBase: new URL(ironSprueBrand.siteUrl),
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  robots: process.env.STOREFRONT_ACCESS_MODE === 'protected' ? { index: false, follow: false } : undefined,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const promoStripItems = await getIronSpruePromoStripItems();
  const ga4Id = process.env.NEXT_PUBLIC_IRON_SPRUE_GA4_MEASUREMENT_ID?.trim() || null;
  const metaPixelId = process.env.NEXT_PUBLIC_IRON_SPRUE_META_PIXEL_ID?.trim() || null;

  return (
    <html lang="en-GB">
      <body>
        <IronSprueAnalyticsProvider ga4Id={ga4Id} metaPixelId={metaPixelId} />
        <header className="site-header">
          <div className="header-main">
            <a className="brand-link" href="/" aria-label="Iron Sprue home">
              <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="330" height="74" />
            </a>
            <div className="header-actions">
              <details className="search-shell">
                <summary aria-label="Open search">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                </summary>
                <form className="site-search" action="/shop" role="search">
                  <label htmlFor="site-search">Search Iron Sprue</label>
                  <input id="site-search" name="search" type="search" placeholder="Search kits, brands, tools..." />
                  <button type="submit">Search</button>
                </form>
              </details>
              <nav className="utility-nav" aria-label="Account and basket">
                <a className="account-link" href="/account" aria-label="Account">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                  </svg>
                </a>
                <BasketLink />
              </nav>
              <details className="menu-shell">
                <summary aria-label="Open navigation menu">
                  <span className="burger-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  Menu
                </summary>
                <div className="menu-panel">
                  <nav aria-label="Category navigation">
                    <h2>Shop the range</h2>
                    {categoryNavigation.map((item) => (
                      <a key={item.href} href={item.href}>{item.label}</a>
                    ))}
                  </nav>
                  <nav aria-label="Featured shop navigation">
                    <h2>Featured</h2>
                    <a href="/shop">All products</a>
                    <a href="/shop?sort=new">New arrivals</a>
                    <a href="/shop?offers=true">Offers</a>
                    <a href="/brands">Brands we stock</a>
                  </nav>
                </div>
              </details>
            </div>
          </div>
          <div className="promo-strip" role="status">
            {promoStripItems.map((item) => <span key={item}>{item}</span>)}
          </div>
        </header>
        <main className="page-frame">{children}</main>
        <aside className="trust-workshop-band" aria-label="Launch updates and accepted payments">
          <section className="newsletter-panel" aria-labelledby="newsletter-title">
            <div>
              <h2 id="newsletter-title">Join the workshop</h2>
              <p>Be first to know about new kits, stock updates, special offers and exclusive content.</p>
            </div>
            <LaunchListForm />
            <ul aria-label="Launch-list benefits">
              <li><strong>New arrivals</strong><span>Straight to your inbox</span></li>
              <li><strong>Exclusive offers</strong><span>Subscribers only</span></li>
              <li><strong>Modeller content</strong><span>Tips, guides and more</span></li>
            </ul>
          </section>
          <section className="payment-trust-banner" aria-label="Accepted payments and trust">
            <strong>Safe. Secure. Trusted.</strong>
            <ul aria-label="Accepted payment methods">
              <li><img src="/payments/visa.svg" alt="Visa" width="70" height="24" /></li>
              <li><img src="/payments/mastercard.svg" alt="Mastercard" width="54" height="34" /></li>
              <li><span className="payment-wordmark paypal">PayPal</span></li>
              <li><span className="payment-wordmark applepay">Apple Pay</span></li>
              <li><span className="payment-wordmark googlepay">G Pay</span></li>
              <li><span className="payment-wordmark klarna">Klarna.</span></li>
            </ul>
          </section>
        </aside>
        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="280" height="64" />
              <p>Premium model kits, display builds and workshop essentials curated by {ironSprueBrand.legalEntity}.</p>
              <a className="footer-instagram" href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank" aria-label="Instagram - @iron.sprue">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1.2" />
                </svg>
                <span>{ironSprueBrand.instagramHandle}</span>
              </a>
            </div>
            <nav aria-label="Legal links">
              <h2>Legal</h2>
              <a href="/about">About</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/contact">Contact</a>
            </nav>
            <nav aria-label="Help links">
              <h2>Help</h2>
              <a href="/delivery">Delivery</a>
              <a href="/returns">Returns</a>
              <a href="/cookies">Cookies</a>
              <IronSprueCookiePreferenceLink />
            </nav>
            <div className="footer-company">
              <h2>Iron Sprue</h2>
              <p>Capital Hobby Group Ltd</p>
              <p>Trading as Iron Sprue</p>
              <p>Company Number 17336948</p>
              <p>Registered in England &amp; Wales</p>
              <p><span>Registered Office:</span><br />4-6 Greatorex Street, London<br />United Kingdom, E1 5NF</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Iron Sprue. All rights reserved.</p>
            <p>Built for modellers, makers and the UK hobby community.</p>
          </div>
        </footer>
        <IronSprueCookieConsentBanner />
      </body>
    </html>
  );
}
