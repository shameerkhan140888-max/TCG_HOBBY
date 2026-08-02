import React from 'react';
import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';

export function LaunchFooter() {
  return (
    <footer className="border-t border-surface-line bg-surface-base/80">
      <Container className="flex flex-col gap-5 py-8 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
          <BrandMark width={150} height={52} className="w-[140px] object-contain" />
        </Link>
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="transition hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
            Terms
          </Link>
          <Link href="/contact" className="transition hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
            Contact
          </Link>
        </div>
        <p>© {new Date().getFullYear()} TCG Hobby.</p>
      </Container>
    </footer>
  );
}
