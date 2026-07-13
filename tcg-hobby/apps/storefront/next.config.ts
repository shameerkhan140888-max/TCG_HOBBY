import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tcg-hobby/auth', '@tcg-hobby/database', '@tcg-hobby/ui', '@tcg-hobby/utils', '@tcg-hobby/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.tcghobby.test',
      },
      {
        protocol: 'https',
        hostname: 'tcg-hobby.co.uk',
      },
    ],
  },
};

export default nextConfig;
