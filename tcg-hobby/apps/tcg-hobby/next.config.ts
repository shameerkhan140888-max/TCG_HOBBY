import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

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
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-neon', '@neondatabase/serverless'],
  images: {
    unoptimized: process.env.TCG_HOBBY_CLOUDFLARE_UNOPTIMIZED_IMAGES === '1',
    remotePatterns: [
      { protocol: 'https', hostname: 'images.tcghobby.test' },
      { protocol: 'https', hostname: 'tcg-hobby.co.uk' },
      ...managedMediaPattern,
    ],
  },
};

export default nextConfig;

if (process.env.TCG_HOBBY_CLOUDFLARE_UNOPTIMIZED_IMAGES === '1') {
  initOpenNextCloudflareForDev();
}
