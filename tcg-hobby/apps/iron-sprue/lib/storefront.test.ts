import { describe, expect, it } from 'vitest';
import { promoPanels } from './storefront';

describe('Iron Sprue storefront showcase cards', () => {
  it('uses one stable page destination per homepage showcase card', () => {
    expect(promoPanels.map((panel) => panel.href)).toEqual([
      '/bundles',
      '/shop/cubicfun',
      '/shop/pintoo',
    ]);
  });

  it('keeps homepage showcase copy balanced in length', () => {
    const copyLengths = promoPanels.map((panel) => panel.copy.length);
    const shortest = Math.min(...copyLengths);
    const longest = Math.max(...copyLengths);

    expect(longest - shortest).toBeLessThanOrEqual(12);
  });
});
