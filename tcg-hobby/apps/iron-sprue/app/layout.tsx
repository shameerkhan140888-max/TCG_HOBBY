import type { Metadata } from 'next';
import './globals.css';
import { ironSprueBrand, ironSprueNavigation } from '../lib/brand';

export const metadata: Metadata = {
  title: {
    default: 'Iron Sprue | Premium model kits and workshop essentials',
    template: '%s | Iron Sprue',
  },
  description: 'A premium modelling workshop and curated model-building retailer from Capital Hobby Group Ltd.',
  metadataBase: new URL(ironSprueBrand.siteUrl),
  robots: process.env.STOREFRONT_ACCESS_MODE === 'public' ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site-header">
          <a className="brand-link" href="/" aria-label="Iron Sprue home">
            <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="178" height="48" />
          </a>
          <nav aria-label="Primary navigation">
            {ironSprueNavigation.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
            <a href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank">{ironSprueBrand.instagramHandle}</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div>
            <img src={ironSprueBrand.logoPath} alt="Iron Sprue" width="150" height="40" />
            <p>Premium model kits, display builds and workshop essentials curated by {ironSprueBrand.legalEntity}.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="/delivery">Delivery</a>
            <a href="/returns">Returns</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank">{ironSprueBrand.instagramHandle}</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
