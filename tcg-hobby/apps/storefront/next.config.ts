import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tcg-hobby/ui', '@tcg-hobby/utils', '@tcg-hobby/types'],
};

export default nextConfig;
