import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';
import { getSiteSocialLinks } from '../lib/site';
import { LaunchEmailCapture } from './launch-email-capture';

const footerLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
];

export function SiteFooter() {
  const socialLinks = getSiteSocialLinks();

  return (
    <footer className="bg-surface-base/95">
      <Container className="py-14 sm:py-16">
        <div id="newsletter" className="grid gap-8 rounded-3xl bg-[linear-gradient(135deg,rgba(255,122,26,0.16),rgba(18,18,21,0.96)_48%,rgba(8,8,10,1))] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Newsletter</h2>
            <p className="text-3xl font-black tracking-tight text-neutral-50 sm:text-4xl">Stay close to launch drops.</p>
            <p className="max-w-xl text-sm leading-6 text-neutral-400">
              Launch updates, release announcements and selected collector offers.
            </p>
          </div>
          <LaunchEmailCapture source="footer" returnTo="/" />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
              <BrandMark width={160} height={56} className="w-[150px] object-contain" />
            </Link>
            <p className="max-w-md text-sm leading-6 text-neutral-400">
              A premium UK trading card retailer for collectors and players.
            </p>
          </div>

          <nav className="space-y-4 lg:text-right" aria-label="Footer">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Links</h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-3 lg:justify-end">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-300 transition-colors hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-neutral-300 transition-colors hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 pt-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} TCG Hobby. All rights reserved.</p>
          <p>Built for collectors, players, and the UK hobby community.</p>
        </div>
      </Container>
    </footer>
  );
}
