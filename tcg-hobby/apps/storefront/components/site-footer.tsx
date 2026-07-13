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
    <footer className="border-t border-surface-line bg-surface-base/95">
      <Container className="py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.75fr_1.15fr]">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
              <BrandMark width={160} height={56} className="w-[150px] object-contain" />
            </Link>
            <p className="max-w-md text-sm leading-6 text-neutral-400">
              A premium UK trading card retailer for collectors and players.
            </p>
          </div>

          <nav className="space-y-4" aria-label="Footer">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Store</h2>
            <ul className="space-y-2">
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

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Newsletter</h2>
            <p className="text-sm leading-6 text-neutral-400">
              Launch updates, release announcements, and collector news.
            </p>
            <LaunchEmailCapture source="footer" returnTo="/" />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-surface-line pt-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TCG Hobby. All rights reserved.</p>
          <p>Built for collectors, players, and the UK hobby community.</p>
        </div>
      </Container>
    </footer>
  );
}
