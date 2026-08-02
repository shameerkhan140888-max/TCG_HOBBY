import { describe, expect, it } from 'vitest';
import { resolveInternalReturnTo } from './internal-return';

describe('resolveInternalReturnTo', () => {
  it('preserves safe internal paths and query strings', () => {
    expect(resolveInternalReturnTo('/shop/pokemon?q=greninja')).toBe('/shop/pokemon?q=greninja');
  });

  it.each(['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)'])(
    'rejects unsafe callback %s',
    (value) => expect(resolveInternalReturnTo(value)).toBe('/'),
  );
});
