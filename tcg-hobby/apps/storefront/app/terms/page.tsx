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
const description = 'Terms and Conditions for buying from Capital Hobby Group Ltd trading as TCG Hobby.';

export const metadata: Metadata = {
  title: {
    absolute: `Terms & Conditions | ${siteName}`,
  },
  description,
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: `Terms & Conditions | ${siteName}`,
    description,
    url: '/terms',
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
    title: `Terms & Conditions | ${siteName}`,
    description,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

type TermsSection = {
  number: string;
  heading: string;
  body: ReactNode[];
};

const termsSections: TermsSection[] = [
  {
    number: '1',
    heading: 'About Us',
    body: [
      `${legalCompanyDescription} It is a company registered in England and Wales under company number ${legalCompanyNumber}.`,
      `Our registered office is ${legalRegisteredOffice.join(', ')}.`,
      <>
        You can contact us at{' '}
        <a href={`mailto:${primaryContactEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {primaryContactEmail}
        </a>
        {' '}or for customer support at{' '}
        <a href={`mailto:${supportEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {supportEmail}
        </a>
        .
      </>,
    ],
  },
  {
    number: '2',
    heading: 'Acceptance of Terms',
    body: [
      'These Terms & Conditions apply when you access our website, create an account, place an order, join release notifications, use collection tools or buy products from us.',
      'By using the website or placing an order, you agree to these terms. If you do not agree, you should not use the website or place an order.',
    ],
  },
  {
    number: '3',
    heading: 'Products',
    body: [
      'We sell trading card products, sealed products, accessories and related collector items. Product descriptions, images, prices and availability are provided in good faith and may change as supplier information changes.',
      'Trading card product names and trademarks belong to their respective owners. Capital Hobby Group Ltd trading as TCG Hobby is an independent retailer and is not affiliated with, endorsed by or sponsored by those trademark owners unless we clearly state otherwise.',
    ],
  },
  {
    number: '4',
    heading: 'Pricing',
    body: [
      'Prices are shown in pounds sterling. We aim to price products fairly and to offer products at manufacturer recommended retail price where reasonably possible.',
      'If a price is listed incorrectly because of an error, we may cancel or correct the order before dispatch and will contact you where appropriate.',
    ],
  },
  {
    number: '5',
    heading: 'Orders',
    body: [
      'An order is an offer to buy products from us. We may accept or reject an order depending on payment, stock availability, fraud checks, product restrictions or other reasonable operational reasons.',
      'Your order is accepted when we confirm acceptance or dispatch the products. We will not create duplicate orders intentionally, and we may cancel orders that appear fraudulent, abusive or technically invalid.',
    ],
  },
  {
    number: '6',
    heading: 'Payments (Stripe)',
    body: [
      'Payments are processed securely by Stripe or another payment provider we clearly identify at checkout. We do not store full payment card details on our own systems.',
      'You must ensure the payment method you use is valid and that you are authorised to use it.',
    ],
  },
  {
    number: '7',
    heading: 'Pre-orders',
    body: [
      'Pre-order products are subject to supplier allocation, release dates and delivery timing that may change outside our control.',
      'We will avoid false scarcity and will only show allocation or stock wording where it is supported by available data. If a pre-order cannot be fulfilled, we will contact you and provide an appropriate refund or alternative where available.',
    ],
  },
  {
    number: '8',
    heading: 'Delivery',
    body: [
      'Delivery options, costs and estimated times will be shown during checkout where available. Estimated delivery times are not guaranteed unless we expressly state that a service is guaranteed.',
      'Risk in the products passes to you when the products are delivered to the delivery address you provided.',
    ],
  },
  {
    number: '9',
    heading: 'Returns and Consumer Rights',
    body: [
      'If you are a UK consumer, you may have statutory cancellation and return rights under consumer protection law. These rights are in addition to any goodwill returns policy we may offer.',
      'Some products may not be suitable for return once opened, used, damaged or unsealed where this affects resale condition or where an exception applies under consumer law.',
      <>
        To discuss a return or issue with an order, contact{' '}
        <a href={`mailto:${supportEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {supportEmail}
        </a>
        .
      </>,
    ],
  },
  {
    number: '10',
    heading: 'Intellectual Property',
    body: [
      'The website design, written content, Capital Hobby Group Ltd trading as TCG Hobby branding, original artwork and other materials we create or license are protected by intellectual property rights.',
      'You may not copy, reproduce, scrape or commercially reuse website content without permission, except where permitted by law.',
    ],
  },
  {
    number: '11',
    heading: 'Website Availability',
    body: [
      'We aim to keep the website available and secure, but we do not guarantee uninterrupted access. We may suspend, update or restrict parts of the website for maintenance, security, operational or legal reasons.',
      'We are not responsible for losses caused by temporary website unavailability where we have taken reasonable care.',
    ],
  },
  {
    number: '12',
    heading: 'Limitation of Liability',
    body: [
      'Nothing in these terms excludes or limits liability where it would be unlawful to do so, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation.',
      'Subject to that, Capital Hobby Group Ltd trading as TCG Hobby is not liable for indirect or consequential losses, business losses, loss of profit or loss of opportunity arising from use of the website or products.',
    ],
  },
  {
    number: '13',
    heading: 'Governing Law',
    body: [
      'These terms are governed by the laws of England and Wales.',
      'The courts of England and Wales will have jurisdiction, subject to any mandatory consumer rights that apply where you live.',
    ],
  },
  {
    number: '14',
    heading: 'Contact Details',
    body: [
      `${legalCompanyDescription} Company number ${legalCompanyNumber}. Registered office: ${legalRegisteredOffice.join(', ')}.`,
      <>
        Primary contact:{' '}
        <a href={`mailto:${primaryContactEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {primaryContactEmail}
        </a>
        .
      </>,
      <>
        Support:{' '}
        <a href={`mailto:${supportEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent">
          {supportEmail}
        </a>
        .
      </>,
    ],
  },
];

export default function TermsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms & Conditions',
    url: `${siteUrl}/terms`,
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
              <Badge variant="accent">Legal</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">Terms & Conditions</h1>
                <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  The terms that apply when you use our website or buy from us.
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
                {termsSections.map((section) => (
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
