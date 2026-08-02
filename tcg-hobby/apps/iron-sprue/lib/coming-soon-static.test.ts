import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join(__dirname, '..', 'public-coming-soon');
const index = readFileSync(join(sourceRoot, 'index.html'), 'utf8');
const styles = readFileSync(join(sourceRoot, 'styles.css'), 'utf8');
const script = readFileSync(join(sourceRoot, 'signup.js'), 'utf8');
const robots = readFileSync(join(sourceRoot, 'robots.txt'), 'utf8');
const sitemap = readFileSync(join(sourceRoot, 'sitemap.xml'), 'utf8');
const headers = readFileSync(join(sourceRoot, '_headers'), 'utf8');

describe('Iron Sprue static coming-soon page', () => {
  it('is scoped to the public landing page and does not link to incomplete commerce routes', () => {
    expect(index).not.toMatch(/href=["']\/(?:shop|products|catalogue|account|cart|checkout|api|admin)\b/i);
    expect(index).toContain('href="#launch-list"');
    expect(index).toContain('https://www.instagram.com/iron.sprue/');
  });

  it('uses only confirmed launch catalogue brands without partnership claims', () => {
    for (const brand of ['Aoshima', 'Deluxe Materials', 'Expo Tools', 'OcCre Creations', 'Pintoo', 'Tasma']) {
      expect(index).toContain(brand);
    }

    expect(index).not.toMatch(/official partner|authorised dealer|approved retailer|official stockist/i);
  });

  it('contains the required SEO, canonical and company attribution metadata', () => {
    expect(index).toContain('<link rel="canonical" href="https://www.ironsprue.co.uk/">');
    expect(index).toContain('<meta name="robots" content="index, follow">');
    expect(index).toContain('application/ld+json');
    expect(index).toContain('trading division of Capital Hobby Group Ltd');
    expect(sitemap).toContain('<loc>https://www.ironsprue.co.uk/</loc>');
    expect(sitemap).not.toMatch(/shop|products|account|checkout|api|admin/);
  });

  it('keeps the mailing-list path explicit and free of backend secrets', () => {
    expect(index).toContain('id="launch-list-form"');
    expect(index).toContain('<label for="launch-email">Email address</label>');
    expect(index).toContain('mailto:hello@ironsprue.co.uk');
    expect(script).toContain('Send the draft to complete signup');
    expect(`${index}\n${script}`).not.toMatch(/Resend|STRIPE|DATABASE_URL|AUTH_SECRET|localhost|127\.0\.0\.1/i);
  });

  it('ships static Cloudflare Pages controls and avoids service calls', () => {
    expect(headers).toContain("connect-src 'none'");
    expect(headers).toContain("form-action 'self' mailto:");
    expect(robots).toContain('Disallow: /checkout');
    expect(robots).toContain('Sitemap: https://www.ironsprue.co.uk/sitemap.xml');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
