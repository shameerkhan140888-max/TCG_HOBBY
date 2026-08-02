import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SocialLinks } from './social-links';

describe('SocialLinks', () => {
  it('renders nothing when no approved social URLs are configured', () => {
    expect(renderToStaticMarkup(<SocialLinks links={[]} />)).toBe('');
  });

  it('renders accessible new-tab links for approved platforms', () => {
    const markup = renderToStaticMarkup(
      <SocialLinks
        links={[
          { label: 'Facebook', href: 'https://www.facebook.com/tcghobby' },
          { label: 'Instagram', href: 'https://instagram.com/tcghobby' },
          { label: 'TikTok', href: 'https://www.tiktok.com/@tcghobby' },
        ]}
      />,
    );

    expect(markup).toContain('aria-label="Social links"');
    expect(markup).toContain('aria-label="Follow TCG Hobby on Facebook"');
    expect(markup).toContain('aria-label="Follow TCG Hobby on Instagram"');
    expect(markup).toContain('aria-label="Follow TCG Hobby on TikTok"');
    expect(markup.match(/target="_blank"/g)).toHaveLength(3);
    expect(markup.match(/rel="noopener noreferrer"/g)).toHaveLength(3);
  });
});
