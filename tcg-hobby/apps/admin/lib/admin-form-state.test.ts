import { describe, expect, it } from 'vitest';
import { buildProductValues, parseProductContents } from './admin-form-state';

describe('product contents form state', () => {
  it('preserves multiline manual contents and bullet-style text', () => {
    const formData = new FormData();
    formData.set('contents', '- 1 promotional card\n- 8 booster packs');

    const values = buildProductValues(formData);

    expect(values.contents).toBe('- 1 promotional card\n- 8 booster packs');
    expect(parseProductContents(values.contents)).toEqual(['- 1 promotional card', '- 8 booster packs']);
  });

  it('keeps product contents optional', () => {
    const values = buildProductValues(new FormData());

    expect(values.contents).toBe('');
    expect(parseProductContents(values.contents)).toEqual([]);
  });
});
