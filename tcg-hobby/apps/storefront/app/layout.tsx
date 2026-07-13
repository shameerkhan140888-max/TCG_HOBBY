import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageShell } from '@tcg-hobby/ui';
import { SiteFooter } from '../components/site-footer';
import { LaunchFooter } from '../components/launch-footer';
import {
  getSiteSocialLinks,
  getSiteUrl,
  isComingSoonMode,
  launchDescription,
  legalCompanyDescription,
  legalCompanyName,
  legalCompanyNumber,
  legalRegisteredOffice,
  siteDescription,
  siteName,
} from '../lib/site';
import './globals.css';

const siteUrl = getSiteUrl();
const comingSoonMode = isComingSoonMode();
const activeDescription = comingSoonMode ? launchDescription : siteDescription;
const activeTitle = comingSoonMode ? `Coming Soon | ${siteName}` : siteName;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: activeTitle,
    template: `%s | ${siteName}`,
  },
  description: activeDescription,
  applicationName: siteName,
  keywords: ['trading cards', 'TCG', 'Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'One Piece', 'UK store'],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName,
    title: activeTitle,
    description: activeDescription,
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
    title: activeTitle,
    description: activeDescription,
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

const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: legalCompanyName,
  legalName: legalCompanyName,
  alternateName: siteName,
  description: legalCompanyDescription,
  identifier: legalCompanyNumber,
  url: siteUrl,
  logo: `${siteUrl}/brand/tcg-hobby-horizontal.png`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: legalRegisteredOffice[0],
    addressLocality: legalRegisteredOffice[1],
    addressCountry: legalRegisteredOffice[2],
    postalCode: legalRegisteredOffice[3],
  },
  sameAs: getSiteSocialLinks().map((link) => link.href),
};

const webSiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl,
  description: activeDescription,
  publisher: {
    '@type': 'Organization',
    name: legalCompanyName,
    alternateName: siteName,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PageShell>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteStructuredData) }}
          />
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            {comingSoonMode ? <LaunchFooter /> : <SiteFooter />}
          </div>
        </PageShell>
      </body>
    </html>
  );
}
