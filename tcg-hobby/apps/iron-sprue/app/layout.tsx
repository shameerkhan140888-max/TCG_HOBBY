import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ironSprueBrand } from '../lib/brand';
import {
  getIronSprueCategoryNavigation,
  getIronSpruePromoStripItems,
  getIronSprueTypographySettings,
  ironSprueTypographyCustomProperties,
} from '../lib/admin-storefront-controls';
import { LaunchListForm } from '../components/launch-list-form';
import { BasketLink } from '../components/basket-link';
import { IronSprueAnalyticsProvider, IronSprueCookieConsentBanner, IronSprueCookiePreferenceLink } from '../components/analytics-consent';
import { PaymentMethodStrip } from '../components/payment-method-strip';

export const metadata: Metadata = {
  title: {
    default: 'Iron Sprue | Premium model kits and workshop essentials',
    template: '%s | Iron Sprue',
  },
  description: 'A premium modelling workshop and curated model-building retailer from Capital Hobby Group Ltd.',
  metadataBase: new URL(ironSprueBrand.siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Iron Sprue',
    title: 'Iron Sprue | Premium model kits and workshop essentials',
    description: 'Premium model kits, display builds and workshop essentials curated by Capital Hobby Group Ltd.',
    url: ironSprueBrand.siteUrl,
    images: [{ url: '/brand/iron-sprue-horizontal.svg', alt: 'Iron Sprue' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iron Sprue | Premium model kits and workshop essentials',
    description: 'Premium model kits, display builds and workshop essentials curated by Capital Hobby Group Ltd.',
    images: ['/brand/iron-sprue-horizontal.svg'],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_IRON_SPRUE_SEARCH_CONSOLE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_IRON_SPRUE_META_DOMAIN_VERIFICATION
      ? { 'facebook-domain-verification': process.env.NEXT_PUBLIC_IRON_SPRUE_META_DOMAIN_VERIFICATION }
      : undefined,
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  robots: process.env.STOREFRONT_ACCESS_MODE === 'protected' ? { index: false, follow: false } : undefined,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [promoStripItems, categoryNavigation, typographySettings] = await Promise.all([
    getIronSpruePromoStripItems(),
    getIronSprueCategoryNavigation(),
    getIronSprueTypographySettings(),
  ]);
  const ga4Id = process.env.NEXT_PUBLIC_IRON_SPRUE_GA4_MEASUREMENT_ID?.trim() || null;
  const metaPixelId = process.env.NEXT_PUBLIC_IRON_SPRUE_META_PIXEL_ID?.trim() || null;

  return (
    <html lang="en-GB" style={ironSprueTypographyCustomProperties(typographySettings) as CSSProperties}>
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
            {promoStripItems.map((item, index) => (
              <span key={item.label}>
                <PromoStripIcon icon={item.icon} label={item.label} index={index} />
                {item.label}
              </span>
            ))}
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
          <section className="payment-trust-banner" aria-label="Payment and trust">
            <strong>Safe. Secure. Trusted.</strong>
            <PaymentMethodStrip compact />
          </section>
        </aside>
        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="280" height="64" />
              <p>Premium model kits, display builds and workshop essentials curated by {ironSprueBrand.legalEntity}.</p>
              <a className="footer-instagram" href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank" aria-label="Instagram - @iron.sprue">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <defs>
                    <radialGradient id="instagram-app-gradient" cx="30%" cy="107%" r="140%">
                      <stop offset="0%" stopColor="#fdf497" />
                      <stop offset="12%" stopColor="#fdf497" />
                      <stop offset="45%" stopColor="#fd5949" />
                      <stop offset="62%" stopColor="#d6249f" />
                      <stop offset="90%" stopColor="#285aeb" />
                    </radialGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5.2" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1.25" />
                </svg>
                <span>{ironSprueBrand.instagramHandle}</span>
              </a>
            </div>
            <nav aria-label="Legal links">
              <h2>Legal</h2>
              <a href="/about">About</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/cookies">Cookies</a>
              <IronSprueCookiePreferenceLink />
            </nav>
            <nav aria-label="Help links">
              <h2>Help</h2>
              <a href="/delivery">Delivery</a>
              <a href="/returns">Returns</a>
              <a href="/contact">Contact</a>
            </nav>
            <div className="footer-company">
              <h2>Iron Sprue <span>A trading name of {ironSprueBrand.legalEntity}</span></h2>
              <p>Capital Hobby Group Ltd</p>
              <p>Company Number 17336948</p>
              <p>VAT No. {ironSprueBrand.vatNumber}</p>
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

function PromoStripIcon({ icon, label, index }: { icon?: string; label: string; index: number }) {
  const normalized = label.toLowerCase();
  if (icon === 'DELIVERY' || (!icon && (normalized.includes('delivery') || index === 0))) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  }
  if (icon === 'PARCEL' || (!icon && (normalized.includes('dispatch') || normalized.includes('stock') || index === 1))) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 8l8-4 8 4-8 4zM4 8v8l8 4V12zM20 8v8l-8 4V12z" />
      </svg>
    );
  }
  if (icon === 'ANNOUNCEMENT') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 14h3l9 4V6l-9 4H4z" />
        <path d="M7 14l1 5h3" />
      </svg>
    );
  }
  if (icon === 'OFFER') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 12V5h7l9 9-7 7z" />
        <circle cx="8" cy="9" r="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3l7 3v5c0 4.5-2.8 8.5-7 10-4.2-1.5-7-5.5-7-10V6z" />
      <path d="M8.5 12l2.2 2.2 4.8-5" />
    </svg>
  );
}
