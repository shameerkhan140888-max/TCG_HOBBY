import Link from 'next/link';
import { Button, Container, Input, BrandMark } from '@tcg-hobby/ui';

const footerColumns = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Coming Soon', href: '/coming-soon' },
      { label: 'Buylist', href: '/buylist' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Returns', href: '/returns' },
      { label: 'Shipping', href: '/shipping' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Catalogue', href: '/catalogue' },
      { label: 'Releases', href: '/releases' },
      { label: 'Collection', href: '/collection' },
      { label: 'Deck Builder', href: '/decks' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-surface-line bg-surface-base/95">
      <Container className="py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center">
              <BrandMark width={160} height={56} className="w-[150px] object-contain" />
            </Link>
            <p className="max-w-md text-sm leading-6 text-neutral-400">
              A premium trading card platform for collectors, players, traders, and retailers across the UK and beyond.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
              <span className="rounded-full border border-surface-line px-3 py-1">Facebook</span>
              <span className="rounded-full border border-surface-line px-3 py-1">Instagram</span>
              <span className="rounded-full border border-surface-line px-3 py-1">YouTube</span>
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map((link) => (
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
            </div>
          ))}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">Newsletter</h2>
            <p className="text-sm leading-6 text-neutral-400">
              A placeholder sign-up for launch updates, release announcements, and collector news.
            </p>
            <form className="space-y-3">
              <Input type="email" placeholder="Email address" aria-label="Newsletter email address" />
              <Button type="button" className="w-full">
                Notify me
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-surface-line pt-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TCG Hobby. All rights reserved.</p>
          <p>Built for collectors, traders, and the UK hobby community.</p>
        </div>
      </Container>
    </footer>
  );
}
