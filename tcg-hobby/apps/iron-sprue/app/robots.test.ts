import { describe, expect, it } from 'vitest';
import { robotsForHost } from './robots';

describe('Iron Sprue robots', () => {
  it('allows the production apex and references the production sitemap', () => {
    const robots = robotsForHost('ironsprue.co.uk');

    expect(robots.sitemap).toBe('https://ironsprue.co.uk/sitemap.xml');
    expect(robots.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ userAgent: '*', allow: '/' }),
    ]));
  });

  it('blocks non-canonical public hosts such as staging workers', () => {
    const robots = robotsForHost('iron-sprue-storefront-staging.shameerkhan140888.workers.dev');

    expect(robots.sitemap).toBeUndefined();
    expect(robots.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
  });
});
