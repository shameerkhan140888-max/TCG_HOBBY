import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';
import { getSiteSocialLinks } from '../lib/site';
import { LaunchEmailCapture } from './launch-email-capture';

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
];

export function SiteFooter() {
  const socialLinks = getSiteSocialLinks();

  return (
    <footer className="bg-surface-base/95">
      <Container className="py-12 sm:py-14">
        <div id="newsletter" className="grid gap-5 rounded-2xl bg-surface-raised/65 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)] lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Newsletter</h2>
            <p className="text-xl font-black tracking-tight text-neutral-50 sm:text-2xl">Stay close to launch drops.</p>
            <p className="text-sm leading-6 text-neutral-400">
              Release news, product drops and selected collector offers.
            </p>
          </div>
          <LaunchEmailCapture source="footer" returnTo="/" compact />
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
              <BrandMark width={160} height={56} className="w-[150px] object-contain" />
            </Link>
            <p className="max-w-md text-sm leading-6 text-neutral-400">
              A premium UK trading card retailer for collectors and players.
            </p>
          </div>

          <nav className="space-y-4" aria-label="Legal links">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Legal</h2>
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

          <nav className="space-y-4" aria-label="Social links">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Social</h2>
            {socialLinks.length ? (
              <ul className="space-y-2">
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
            ) : (
              <p className="text-sm text-neutral-500">Social links will appear here when configured.</p>
            )}
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
