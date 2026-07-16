import type { Metadata } from 'next';
import React from 'react';
import { Badge, Container, PageShell, Section } from '@tcg-hobby/ui';
import { LaunchHeader } from '../../components/launch-header';
import { getSiteUrl, primaryContactEmail, siteName } from '../../lib/site';

const description = 'Everything you need to know about delivery, shipping, returns and refunds.';

const deliverySections = [
  {
    number: '01',
    heading: 'Standard Delivery',
    body: [
      'Free UK Mainland delivery on all orders over £50.',
      'Delivery charges for orders under £50 are calculated during checkout.',
      'TCG Hobby may also run promotional free delivery events from time to time.',
      'Where a promotional offer is active it will override the normal shipping thresholds.',
    ],
  },
  {
    number: '02',
    heading: 'Dispatch',
    body: [
      'Orders are normally dispatched within one working day.',
      'Orders placed during weekends or bank holidays will be dispatched on the next working day.',
    ],
  },
  {
    number: '03',
    heading: 'Delivery Partners',
    body: [
      'Orders may be shipped using Royal Mail, DPD, Evri or other trusted UK delivery partners depending on parcel size and destination.',
    ],
  },
  {
    number: '04',
    heading: 'Packaging',
    body: [
      'Every order is packed carefully with collectors in mind.',
      'We use suitable protective packaging to help ensure products arrive in excellent condition.',
    ],
  },
  {
    number: '05',
    heading: 'Northern Ireland',
    body: [
      'We also deliver to Northern Ireland.',
      'Additional delivery charges may apply due to courier costs.',
      'Any additional shipping cost will always be shown before checkout.',
    ],
  },
  {
    number: '06',
    heading: 'Pre-orders',
    body: [
      'Orders containing pre-order products will normally dispatch close to the official release date.',
      'If your order contains both in-stock and pre-order items, dispatch timing will be explained during checkout.',
    ],
  },
  {
    number: '07',
    heading: 'Returns',
    body: ['Customers may return unused products within 30 days of delivery.'],
    list: ['unused', 'unopened where applicable', 'complete', 'in original packaging'],
  },
  {
    number: '08',
    heading: 'Sealed Products',
    body: [
      'Factory sealed trading card products may be returned if they remain unopened and suitable for resale.',
      'Opened trading card products cannot normally be returned unless faulty.',
    ],
  },
  {
    number: '09',
    heading: 'Faulty or Damaged Items',
    body: ['Please contact us within 48 hours of delivery.'],
    list: ['order number', 'photographs of packaging', 'photographs of damaged items'],
  },
  {
    number: '10',
    heading: 'Refunds',
    body: [
      'Refunds are normally processed within five working days of receiving and inspecting returned goods.',
      'Refunds are made using the original payment method.',
    ],
  },
  {
    number: '11',
    heading: 'Return Postage',
    body: [
      'If the item is faulty, damaged or supplied incorrectly, TCG Hobby will cover the return postage costs.',
      'For unwanted items, customers are responsible for return postage unless otherwise stated.',
    ],
  },
] as const;

export const metadata: Metadata = {
  title: {
    absolute: `Delivery & Returns | ${siteName}`,
  },
  description,
  alternates: {
    canonical: '/delivery-returns',
  },
  openGraph: {
    title: `Delivery & Returns | ${siteName}`,
    description,
    url: '/delivery-returns',
    type: 'website',
    images: [{ url: '/brand/tcg-hobby-horizontal.png', width: 1200, height: 630, alt: 'TCG Hobby' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Delivery & Returns | ${siteName}`,
    description,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DeliveryReturnsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Delivery & Returns',
      description,
      url: `${siteUrl}/delivery-returns`,
      publisher: {
        '@type': 'Organization',
        name: siteName,
        url: siteUrl,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Delivery & Returns', item: `${siteUrl}/delivery-returns` },
      ],
    },
  ];

  return (
    <PageShell>
      <LaunchHeader />
      <main className="bg-surface-ink text-neutral-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

        <Section className="border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.16),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_62%,#17120e_100%)] py-12 sm:py-16 lg:py-20">
          <Container>
            <div className="max-w-4xl space-y-6">
              <Badge variant="accent">Customer care</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">Delivery & Returns</h1>
                <p className="max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">{description}</p>
              </div>
            </div>
          </Container>
        </Section>

        <Section className="bg-surface-ink py-10 sm:py-14 lg:py-16">
          <Container>
            <article className="mx-auto max-w-4xl rounded-lg border border-surface-line bg-surface-base/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-7 lg:p-9">
              <div className="space-y-10">
                {deliverySections.map((section) => (
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
                          {section.body.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                          {'list' in section ? (
                            <ul className="list-disc space-y-2 pl-5 text-neutral-300">
                              {section.list.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
                <p className="rounded-lg border border-accent/20 bg-accent/10 p-4 text-sm leading-6 text-neutral-300">
                  Questions about delivery or returns? Contact{' '}
                  <a href={`mailto:${primaryContactEmail}`} className="text-accent-soft underline decoration-accent/50 underline-offset-4">
                    {primaryContactEmail}
                  </a>
                  .
                </p>
              </div>
            </article>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
