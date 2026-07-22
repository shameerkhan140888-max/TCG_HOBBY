import type { NextConfig } from 'next';

const managedMediaBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
const managedMediaPattern = (() => {
  if (!managedMediaBaseUrl) return [];
  try {
    const url = new URL(managedMediaBaseUrl);
    if (url.protocol !== 'https:') return [];
    return [{ protocol: 'https' as const, hostname: url.hostname, pathname: `${url.pathname.replace(/\/$/, '')}/**` }];
  } catch { return []; }
})();

const nextConfig: NextConfig = {
  transpilePackages: ['@tcg-hobby/auth', '@tcg-hobby/database', '@tcg-hobby/ui', '@tcg-hobby/utils', '@tcg-hobby/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.tcghobby.test' },
      { protocol: 'https', hostname: 'tcg-hobby.co.uk' },
      ...managedMediaPattern,
    ],
  },
};

export default nextConfig;
