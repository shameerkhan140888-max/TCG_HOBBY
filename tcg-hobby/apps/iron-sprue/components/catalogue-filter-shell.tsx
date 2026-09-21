'use client';

import React from 'react';
import { useState, type ReactNode } from 'react';

type CatalogueFilterShellProps = {
  activeFilterCount: number;
  children: ReactNode;
};

export function CatalogueFilterShell({ activeFilterCount, children }: CatalogueFilterShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = `Filters${activeFilterCount ? ` (${activeFilterCount})` : ''}`;

  return (
    <aside className={`catalogue-filter-shell${isOpen ? ' is-open' : ''}`} aria-label="Catalogue filters">
      <button
        type="button"
        className="catalogue-filter-toggle"
        aria-controls="catalogue-filter-controls"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {label}
      </button>
      <div className="catalogue-filter-body" id="catalogue-filter-controls">
        {children}
      </div>
    </aside>
  );
}
