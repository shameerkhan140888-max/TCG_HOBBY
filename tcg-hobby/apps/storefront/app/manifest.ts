import type { MetadataRoute } from 'next';
import { siteDescription, siteName } from '../lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#ff8a00',
    icons: [
      {
        src: '/brand/tcg-hobby-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/brand/tcg-hobby-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
