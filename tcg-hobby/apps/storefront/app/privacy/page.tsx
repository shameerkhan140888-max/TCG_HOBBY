import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import React from 'react';
import { Badge, Container, PageShell, Section } from '@tcg-hobby/ui';
import { LaunchHeader } from '../../components/launch-header';
import {
  getSiteUrl,
  legalCompanyDescription,
  legalCompanyName,
  legalCompanyNumber,
  legalRegisteredOffice,
  primaryContactEmail,
  siteName,
  supportEmail,
} from '../../lib/site';

const lastUpdated = '12 July 2026';
const description = 'Learn how TCG Hobby collects, stores and protects your personal information.';

export const metadata: Metadata = {
  title: {
    absolute: `Privacy Policy | ${siteName}`,
  },
  description,
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: `Privacy Policy | ${siteName}`,
    description,
    url: '/privacy',
    type: 'website',
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
    title: `Privacy Policy | ${siteName}`,
    description,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

type PolicySection = {
  number: string;
  heading: string;
  body: ReactNode[];
};

const policySections: PolicySection[] = [
  {
    number: '1',
    heading: 'Who We Are',
    body: [
      <>
        {legalCompanyDescription} It is a company registered in England and Wales under company number {legalCompanyNumber}. Our registered office is{' '}
        {legalRegisteredOffice.join(', ')}.
      </>,
      <>
        Capital Hobby Group Ltd trading as TCG Hobby is a UK-based trading card retailer preparing to launch at{' '}
        <a href="https://tcg-hobby.co.uk" className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          https://tcg-hobby.co.uk
        </a>
        .
      </>,
      <>
        If you have any questions about this Privacy Policy or how we handle your information, you can contact us at{' '}
        <a href={`mailto:${primaryContactEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {primaryContactEmail}
        </a>
        {' '}or for support enquiries at{' '}
        <a href={`mailto:${supportEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {supportEmail}
        </a>
        .
      </>,
    ],
  },
  {
    number: '2',
    heading: 'Information We Collect',
    body: [
      'When you join the Capital Hobby Group Ltd trading as TCG Hobby launch list, we collect the information you choose to provide, such as your email address, optional first name, consent status, signup source and signup time.',
      'We may also collect limited technical information, such as hashed IP address metadata, to help evidence consent, protect the form from misuse and maintain the security of our service.',
    ],
  },
  {
    number: '3',
    heading: 'How We Use Your Information',
    body: [
      'We use your information to manage your launch-list signup, send confirmation emails, provide launch news, product updates and occasional marketing emails where you have given consent, and maintain accurate subscriber records.',
      'We may also use your information to improve our launch experience, monitor signup performance, protect against spam or abuse, and meet our legal and operational responsibilities.',
    ],
  },
  {
    number: '4',
    heading: 'Marketing Consent',
    body: [
      'We will only send launch news, product updates and occasional marketing emails where you have actively confirmed that you agree to receive them.',
      'You can unsubscribe at any time by using the unsubscribe link included in our emails. Once you unsubscribe, we will update your subscriber record so that you are no longer eligible for marketing emails.',
    ],
  },
  {
    number: '5',
    heading: 'How We Store and Protect Your Information',
    body: [
      'We store subscriber information in secure systems used to operate the Capital Hobby Group Ltd trading as TCG Hobby website and launch-list service.',
      'We use reasonable technical and organisational measures designed to protect personal information from unauthorised access, misuse, alteration or loss.',
    ],
  },
  {
    number: '6',
    heading: 'Who We Share Information With',
    body: [
      'We only share personal information with service providers where this is necessary to operate the website, manage subscriber records, send confirmation emails or provide related technical services.',
      'We do not sell your personal information.',
    ],
  },
  {
    number: '7',
    heading: 'How Long We Keep Information',
    body: [
      'We keep launch-list subscriber records for as long as needed to manage the launch list, evidence consent, honour unsubscribe requests and operate Capital Hobby Group Ltd trading as TCG Hobby responsibly.',
      'If you unsubscribe, we may retain limited information to ensure your unsubscribe request continues to be respected.',
    ],
  },
  {
    number: '8',
    heading: 'Your Rights',
    body: [
      'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict or object to the use of your personal information.',
      <>
        To make a privacy request, contact us at{' '}
        <a href={`mailto:${primaryContactEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {primaryContactEmail}
        </a>
        .
      </>,
    ],
  },
  {
    number: '9',
    heading: 'Cookies and Similar Technologies',
    body: [
      'The Capital Hobby Group Ltd trading as TCG Hobby website may use essential technologies required for core site functionality, security and performance.',
      'If we introduce additional analytics, advertising or preference cookies in future, we will provide appropriate information and controls where required.',
    ],
  },
  {
    number: '10',
    heading: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time as Capital Hobby Group Ltd trading as TCG Hobby develops and our services change.',
      'When we make changes, we will update the Last Updated date shown on this page.',
    ],
  },
];

export default function PrivacyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'PrivacyPolicy',
    name: 'Privacy Policy',
    url: `${siteUrl}/privacy`,
    dateModified: '2026-07-12',
    publisher: {
      '@type': 'Organization',
      name: legalCompanyName,
      alternateName: siteName,
      identifier: legalCompanyNumber,
      url: siteUrl,
    },
  };

  return (
    <PageShell>
      <LaunchHeader />
      <main className="bg-surface-ink text-neutral-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <Section className="border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.16),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_62%,#17120e_100%)] py-12 sm:py-16 lg:py-20">
          <Container>
            <div className="max-w-4xl space-y-6">
              <Badge variant="accent">Privacy</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">Privacy Policy</h1>
                <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  How we collect, use and protect your information.
                </p>
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-black/20 px-4 py-3 text-sm text-neutral-300">
                <span className="font-semibold uppercase tracking-[0.18em] text-accent">Last Updated</span>
                <span>{lastUpdated}</span>
              </div>
            </div>
          </Container>
        </Section>

        <Section className="bg-surface-ink py-10 sm:py-14 lg:py-16">
          <Container>
            <article className="mx-auto max-w-4xl rounded-lg border border-surface-line bg-surface-base/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-7 lg:p-9">
              <div className="space-y-10">
                {policySections.map((section) => (
                  <section key={section.number} className="border-b border-surface-line/80 pb-8 last:border-b-0 last:pb-0">
                    <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)]">
                      <div>
                        <p className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-sm font-black text-accent">
                          {section.number}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-xl font-black leading-tight text-neutral-50 sm:text-2xl">{section.heading}</h2>
                        <div className="space-y-4 text-sm leading-7 text-neutral-300 sm:text-base sm:leading-8">
                          {section.body.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
