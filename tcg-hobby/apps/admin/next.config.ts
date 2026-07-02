import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tcg-hobby/auth', '@tcg-hobby/ui'],
};

export default nextConfig;
