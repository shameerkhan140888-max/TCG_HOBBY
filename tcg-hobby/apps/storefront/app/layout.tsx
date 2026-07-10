import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageShell } from '@tcg-hobby/ui';
import { SiteFooter } from '../components/site-footer';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TCG Hobby',
    template: '%s | TCG Hobby',
  },
  description: 'Premium trading card game commerce platform.',
  applicationName: 'TCG Hobby',
  keywords: ['trading cards', 'TCG', 'Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'One Piece', 'UK store'],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'TCG Hobby',
    title: 'TCG Hobby',
    description: 'Premium trading card game commerce platform.',
    url: '/',
    images: [
      {
        url: '/brand/tcg-hobby-horizontal.png',
        width: 1366,
        height: 471,
        alt: 'TCG Hobby logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TCG Hobby',
    description: 'Premium trading card game commerce platform.',
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/brand/tcg-hobby-icon.svg',
    apple: '/brand/tcg-hobby-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TCG Hobby',
  url: siteUrl,
  logo: `${siteUrl}/brand/tcg-hobby-horizontal.png`,
  sameAs: ['https://www.instagram.com', 'https://www.facebook.com', 'https://www.youtube.com'],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PageShell>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </PageShell>
      </body>
    </html>
  );
}
