'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path d="M21 21l-4.35-4.35M10.75 17.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" aria-label={open ? 'Close search' : 'Search products'} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent">
        {open ? <span aria-hidden="true" className="text-2xl leading-none">×</span> : <SearchIcon />}
      </button>
      {open ? (
        <form action="/shop" role="search" className="fixed left-3 right-3 top-[84px] z-50 flex gap-2 rounded-md bg-surface-base p-3 shadow-2xl ring-1 ring-accent/30 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[28rem]" onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}>
          <label htmlFor="header-search" className="sr-only">Search products</label>
          <input ref={inputRef} id="header-search" name="search" type="search" placeholder="Search products" className="h-10 min-w-0 flex-1 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
          <button type="submit" className="h-10 rounded-md bg-accent px-4 text-sm font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-white">Search</button>
        </form>
      ) : null}
    </div>
  );
}
