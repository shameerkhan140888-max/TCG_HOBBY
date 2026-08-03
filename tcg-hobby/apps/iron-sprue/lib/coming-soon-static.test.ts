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
const privacy = readFileSync(join(sourceRoot, 'privacy.html'), 'utf8');
const cookies = readFileSync(join(sourceRoot, 'cookies.html'), 'utf8');

describe('Iron Sprue static coming-soon page', () => {
  it('is scoped to the public landing page and does not link to incomplete commerce routes', () => {
    expect(index).not.toMatch(/href=["']\/(?:shop|products|catalogue|account|cart|checkout|api|admin)\b/i);
    expect(index).toContain('href="#launch-list"');
    expect(index).toContain('https://www.instagram.com/iron.sprue/');
  });

  it('uses only confirmed launch catalogue brands without partnership claims', () => {
    for (const brand of ['Aoshima', 'Deluxe Materials', 'Expo Tools', 'OcCre Creations', 'Pintoo']) {
      expect(index).toContain(brand);
    }

    expect(index).not.toContain('Tasma');
    expect(index).not.toMatch(/official partner|authorised dealer|approved retailer|official stockist/i);
    expect(index).toContain('data-carousel');
    expect(script).toContain('data-carousel-track');
  });

  it('contains the required SEO, canonical and company attribution metadata', () => {
    expect(index).toContain('<link rel="canonical" href="https://www.ironsprue.co.uk/">');
    expect(index).toContain('<meta name="robots" content="index, follow">');
    expect(index).toContain('application/ld+json');
    expect(index).toContain('trading division of Capital Hobby Group Ltd');
    expect(sitemap).toContain('<loc>https://www.ironsprue.co.uk/</loc>');
    expect(sitemap).toContain('<loc>https://www.ironsprue.co.uk/privacy.html</loc>');
    expect(sitemap).toContain('<loc>https://www.ironsprue.co.uk/cookies.html</loc>');
    expect(sitemap).not.toMatch(/shop|products|account|checkout|api|admin/);
  });

  it('keeps the mailing-list path explicit and free of backend secrets', () => {
    expect(index).toContain('id="launch-list-form"');
    expect(index).toContain('<label for="launch-email">Email address</label>');
    expect(index).toContain('action="/api/launch-list"');
    expect(index).toContain('id="launch-consent"');
    expect(index).toContain('I agree to receive Iron Sprue launch updates');
    expect(index).not.toContain('mailto:hello@ironsprue.co.uk');
    const formMarkup = index.match(/<form[^>]+id="launch-list-form"[\s\S]*?<\/form>/i)?.[0] ?? '';
    expect(`${formMarkup}\n${script}`).not.toMatch(/mailto:|localStorage|STRIPE|DATABASE_URL|AUTH_SECRET|localhost|127\.0\.0\.1/i);
    expect(script).toContain("fetch('/api/launch-list'");
  });

  it('publishes standalone privacy and cookie pages without commerce services', () => {
    expect(index).toContain('href="/privacy.html"');
    expect(index).toContain('href="/cookies.html"');
    expect(privacy).toContain('Privacy notice');
    expect(cookies).toContain('Cookie policy');
    expect(privacy).toContain('dedicated Iron Sprue Neon database');
    expect(privacy).toContain('Resend');
    expect(cookies).toContain('does not use browser local storage');
    expect(`${privacy}\n${cookies}`).not.toMatch(/Stripe|Prisma|DATABASE_URL|AUTH_SECRET|localhost|127\.0\.0\.1/i);
  });

  it('ships static Cloudflare Pages controls and avoids service calls', () => {
    expect(headers).toContain("connect-src 'self'");
    expect(headers).toContain("form-action 'self'");
    expect(robots).toContain('Disallow: /checkout');
    expect(robots).toContain('Sitemap: https://www.ironsprue.co.uk/sitemap.xml');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
