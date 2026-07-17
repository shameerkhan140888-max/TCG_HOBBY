import React from 'react';
import type { SiteSocialLink } from '../lib/site';

export type SocialLinksProps = {
  links: SiteSocialLink[];
  compact?: boolean;
  className?: string;
};

const platformMarks: Record<SiteSocialLink['label'], string> = {
  Facebook: 'f',
  Instagram: 'IG',
  TikTok: 'TT',
};

export function SocialLinks({ links, compact = false, className = '' }: SocialLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Social links" className={className}>
      <ul className="flex flex-wrap gap-3">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow TCG Hobby on ${link.label}`}
              className={`inline-flex items-center justify-center rounded-full bg-surface-panel font-bold text-neutral-300 transition-colors hover:bg-accent hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-accent ${
                compact ? 'h-9 min-w-9 px-3 text-xs' : 'h-11 gap-2 px-4 text-sm'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid place-items-center rounded-full bg-neutral-50/10 font-black ${
                  compact ? 'h-5 min-w-5 px-1 text-[0.65rem]' : 'h-6 min-w-6 px-1.5 text-xs'
                }`}
              >
                {platformMarks[link.label]}
              </span>
              {compact ? <span className="sr-only">{link.label}</span> : <span>{link.label}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
