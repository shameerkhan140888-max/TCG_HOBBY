import { afterEach, describe, expect, it } from 'vitest';
import { getSiteSocialLinks } from './site';

const originalEnv = { ...process.env };

describe('site social configuration', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns only approved HTTPS Facebook, Instagram and TikTok links', () => {
    process.env.NEXT_PUBLIC_FACEBOOK_URL = 'https://www.facebook.com/tcghobby';
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://instagram.com/tcghobby';
    process.env.NEXT_PUBLIC_TIKTOK_URL = 'https://www.tiktok.com/@tcghobby';
    process.env.NEXT_PUBLIC_X_URL = 'https://x.com/tcghobby';

    expect(getSiteSocialLinks()).toEqual([
      { label: 'Facebook', href: 'https://www.facebook.com/tcghobby' },
      { label: 'Instagram', href: 'https://instagram.com/tcghobby' },
      { label: 'TikTok', href: 'https://www.tiktok.com/@tcghobby' },
    ]);
  });

  it('drops non-HTTPS social URLs', () => {
    process.env.NEXT_PUBLIC_FACEBOOK_URL = 'http://www.facebook.com/tcghobby';
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://instagram.com/tcghobby';
    process.env.NEXT_PUBLIC_TIKTOK_URL = 'not-a-url';

    expect(getSiteSocialLinks()).toEqual([{ label: 'Instagram', href: 'https://instagram.com/tcghobby' }]);
  });
});
