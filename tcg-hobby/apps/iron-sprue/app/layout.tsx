import type { Metadata } from 'next';
import './globals.css';
import { ironSprueBrand, ironSprueNavigation } from '../lib/brand';
import { categoryNavigation } from '../lib/storefront';

export const metadata: Metadata = {
  title: {
    default: 'Iron Sprue | Premium model kits and workshop essentials',
    template: '%s | Iron Sprue',
  },
  description: 'A premium modelling workshop and curated model-building retailer from Capital Hobby Group Ltd.',
  metadataBase: new URL(ironSprueBrand.siteUrl),
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  robots: process.env.STOREFRONT_ACCESS_MODE === 'protected' ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
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
                <a className="basket-link" href="/basket" aria-label="Basket with 0 items">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 9 9 4h6l2 5" />
                    <path d="M5 9h14l-1.3 11H6.3L5 9Z" />
                    <path d="M9 13v3M15 13v3" />
                  </svg>
                  <span>0</span>
                </a>
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
            <span>Free UK delivery on orders over &pound;75</span>
            <span>Fast dispatch on stocked lines</span>
            <span>Safe and secure checkout</span>
          </div>
        </header>
        <main className="page-frame">{children}</main>
        <section className="payment-trust-banner" aria-label="Accepted payments and trust">
          <div>
            <strong>Safe. Secure. Trusted.</strong>
            <span>Your payment will be protected by recognised checkout providers when the store opens.</span>
          </div>
          <ul aria-label="Accepted payment methods">
            <li><img src="/payments/visa.svg" alt="Visa" width="70" height="24" /></li>
            <li><img src="/payments/mastercard.svg" alt="Mastercard" width="54" height="34" /></li>
            <li><span className="payment-wordmark paypal">PayPal</span></li>
            <li><span className="payment-wordmark">Apple Pay</span></li>
            <li><span className="payment-wordmark">Google Pay</span></li>
          </ul>
        </section>
        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="280" height="64" />
              <p>Premium model kits, display builds and workshop essentials curated by {ironSprueBrand.legalEntity}.</p>
              <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>
              <a className="footer-instagram" href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank" aria-label="Instagram - @iron.sprue">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1.2" />
                </svg>
              </a>
            </div>
            <nav aria-label="Legal links">
              <h2>Legal</h2>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/contact">Contact</a>
            </nav>
            <nav aria-label="Help links">
              <h2>Help</h2>
              <a href="/delivery">Delivery</a>
              <a href="/returns">Returns</a>
              <a href="/cookies">Cookies</a>
            </nav>
            <div className="footer-company">
              <h2>Iron Sprue</h2>
              <p>Capital Hobby Group Ltd</p>
              <p>Trading as Iron Sprue</p>
              <p>Company Number 17336948</p>
              <p>Registered in England &amp; Wales</p>
              <p><span>Registered Office:</span> 4-6 Greatorex Street, London, United Kingdom, E1 5NF</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Iron Sprue. All rights reserved.</p>
            <p>Built for modellers, makers and the UK hobby community.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
