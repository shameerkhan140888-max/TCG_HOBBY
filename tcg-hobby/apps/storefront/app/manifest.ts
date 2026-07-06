import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TCG Hobby',
    short_name: 'TCG Hobby',
    description: 'Premium trading card game commerce platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#ff8a00',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
