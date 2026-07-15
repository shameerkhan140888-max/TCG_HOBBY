'use client';

import React from 'react';
import Link from 'next/link';
import { BrandMark, Button, Container } from '@tcg-hobby/ui';

export function LaunchHeader() {
  const handleJoinClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const form = document.getElementById('join-launch-list');
    const email = document.getElementById('launch-email-coming-soon-page');

    if (!form) {
      return;
    }

    event.preventDefault();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.setTimeout(() => {
      email?.focus({ preventScroll: true });
    }, 450);

    window.history.replaceState(null, '', '#join-launch-list');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/95 backdrop-blur">
      <Container className="flex min-h-[76px] items-center justify-between gap-4 py-3">
        <Link href="/" className="flex flex-none items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
          <BrandMark width={160} height={56} className="w-[150px] object-contain sm:w-[160px]" />
        </Link>
        <Button
          asChild
          size="sm"
          className="transition-[background-color,box-shadow,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#ff8a2a,#ff6f12)] hover:shadow-[0_0_28px_rgba(255,122,26,0.34)] hover:brightness-105 focus-visible:-translate-y-0.5 focus-visible:shadow-[0_0_28px_rgba(255,122,26,0.34)] motion-reduce:transform-none"
        >
          <a href="/#join-launch-list" onClick={handleJoinClick}>
            Join launch list
          </a>
        </Button>
      </Container>
    </header>
  );
}
