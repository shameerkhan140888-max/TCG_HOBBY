import React from 'react';
import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';
import { getSiteSocialLinks } from '../lib/site';
import { LaunchEmailCapture } from './launch-email-capture';
import { SocialLinks } from './social-links';

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
];

const customerLinks = [
  { label: 'Delivery & Returns', href: '/delivery-returns' },
  { label: 'FAQ', href: '/faq' },
  { label: 'About Us', href: '/about' },
];

export function SiteFooter() {
  const socialLinks = getSiteSocialLinks();

  return (
    <>
      <section id="newsletter" className="border-y border-accent/40 bg-surface-panel/80">
        <Container className="py-5 sm:py-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.42fr)_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-base font-black text-neutral-50">Join the newsletter</h2>
              <span className="text-sm text-neutral-500" aria-hidden="true">
                &mdash;
              </span>
              <p className="text-sm leading-5 text-neutral-500">Release alerts and product updates.</p>
            </div>
            <LaunchEmailCapture source="footer" returnTo="/" compact footerCompact />
          </div>
        </Container>
      </section>

      <footer className="bg-surface-base/95">
        <Container className="py-6 sm:py-7">
          <div className="grid gap-7 lg:grid-cols-[minmax(220px,0.85fr)_minmax(120px,0.42fr)_minmax(150px,0.48fr)_minmax(300px,1fr)] lg:items-start">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
                <BrandMark width={160} height={56} className="w-[150px] object-contain" />
              </Link>
              <p className="max-w-sm text-sm leading-6 text-neutral-400">
                A premium UK trading card retailer for collectors and players.
              </p>
              <SocialLinks links={socialLinks} compact className="hidden lg:block" />
            </div>

            <nav className="space-y-3" aria-label="Legal links">
              <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Legal</h2>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-300 transition-colors hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="space-y-3" aria-label="Help links">
              <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Help</h2>
              <ul className="space-y-2">
                {customerLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-300 transition-colors hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-2 text-xs leading-5 text-neutral-500">
              <p className="font-semibold text-neutral-300">Capital Hobby Group Ltd</p>
              <p>Trading as TCG Hobby</p>
              <p>Company Number 17336948</p>
              <p>Registered in England &amp; Wales</p>
              <p>
                <span className="text-neutral-400">Registered Office:</span> 4-6 Greatorex Street, London, United Kingdom, E1 5NF
              </p>
            </div>

            <SocialLinks links={socialLinks} compact className="lg:hidden" />
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-surface-line/70 pt-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} TCG Hobby. All rights reserved.</p>
            <p>Built for collectors, players and the UK hobby community.</p>
          </div>
        </Container>
      </footer>
    </>
  );
}
