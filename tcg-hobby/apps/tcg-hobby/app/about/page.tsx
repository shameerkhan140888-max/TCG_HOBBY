import type { Metadata } from 'next';
import React from 'react';
import { Badge, Container, PageShell, Section } from '@tcg-hobby/ui';
import { LaunchHeader } from '../../components/launch-header';
import {
  getSiteUrl,
  legalCompanyName,
  legalCompanyNumber,
  legalRegisteredOffice,
  legalTradingName,
  siteName,
} from '../../lib/site';

const description = 'Built by collectors. Trusted by collectors.';

const aboutParagraphs = [
  'TCG Hobby was created with one simple goal:',
  'To build a premium UK destination for trading card game enthusiasts.',
  "We understand the excitement of opening a new booster pack, completing a collection and finding the cards you've been searching for.",
  "Whether you're a collector, competitive player or someone just starting their hobby journey, we aim to provide genuine products, fair pricing and excellent customer service.",
  "Our focus is on offering products from the world's most popular trading card games including Pokémon, Magic: The Gathering, One Piece, Disney Lorcana, Yu-Gi-Oh! and accessories from leading brands.",
  "As TCG Hobby grows, we'll continue expanding our catalogue, improving our collector tools and building a community where collectors feel at home.",
] as const;

const values = [
  ['Genuine Products', 'Only genuine products sourced from authorised distributors and trusted suppliers.'],
  ['Fair Purchase Limits', 'Helping more collectors access high-demand products.'],
  ['Collector Focused', 'Packed with care by collectors who understand the hobby.'],
  ['Growing Community', 'Building a long-term destination for collectors and players across the UK.'],
] as const;

export const metadata: Metadata = {
  title: {
    absolute: `About TCG Hobby | ${siteName}`,
  },
  description,
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: `About TCG Hobby | ${siteName}`,
    description,
    url: '/about',
    type: 'website',
    images: [{ url: '/brand/tcg-hobby-horizontal.png', width: 1200, height: 630, alt: 'TCG Hobby' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `About TCG Hobby | ${siteName}`,
    description,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About TCG Hobby',
      description,
      url: `${siteUrl}/about`,
      publisher: {
        '@type': 'Organization',
        name: `${legalCompanyName} trading as ${legalTradingName}`,
        alternateName: legalTradingName,
        url: siteUrl,
        identifier: legalCompanyNumber,
        address: {
          '@type': 'PostalAddress',
          streetAddress: legalRegisteredOffice[0],
          addressLocality: legalRegisteredOffice[1],
          addressCountry: 'GB',
          postalCode: legalRegisteredOffice[3],
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'About TCG Hobby', item: `${siteUrl}/about` },
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
              <Badge variant="accent">About</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">About TCG Hobby</h1>
                <p className="max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">{description}</p>
              </div>
            </div>
          </Container>
        </Section>

        <Section className="bg-surface-ink py-10 sm:py-14 lg:py-16">
          <Container>
            <article className="mx-auto max-w-4xl rounded-lg border border-surface-line bg-surface-base/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-7 lg:p-9">
              <div className="space-y-10">
                <section className="space-y-4 text-sm leading-7 text-neutral-300 sm:text-base sm:leading-8">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={paragraph} className={index === 0 ? 'text-lg font-semibold text-neutral-50' : undefined}>
                      {paragraph}
                    </p>
                  ))}
                </section>

                <section className="border-t border-surface-line/80 pt-8">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Why shop with us</p>
                    <h2 className="text-2xl font-black text-neutral-50">A collector-first retail experience.</h2>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {values.map(([title, copy]) => (
                      <article key={title} className="rounded-lg border border-surface-line bg-black/20 p-5">
                        <div className="flex gap-3">
                          <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-black text-accent" aria-hidden="true">
                            ✓
                          </span>
                          <div>
                            <h3 className="text-lg font-black text-neutral-50">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-neutral-400">{copy}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="border-t border-surface-line/80 pt-8">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Company details</p>
                    <h2 className="text-2xl font-black text-neutral-50">{legalCompanyName}</h2>
                  </div>
                  <dl className="mt-6 grid gap-4 text-sm leading-6 sm:grid-cols-2">
                    <div className="rounded-lg bg-black/20 p-4">
                      <dt className="text-neutral-500">Trading as</dt>
                      <dd className="mt-1 font-semibold text-neutral-50">{legalTradingName}</dd>
                    </div>
                    <div className="rounded-lg bg-black/20 p-4">
                      <dt className="text-neutral-500">Company Number</dt>
                      <dd className="mt-1 font-semibold text-neutral-50">{legalCompanyNumber}</dd>
                    </div>
                    <div className="rounded-lg bg-black/20 p-4 sm:col-span-2">
                      <dt className="text-neutral-500">Registered Office</dt>
                      <dd className="mt-1 font-semibold text-neutral-50">
                        4–6 Greatorex Street
                        <br />
                        London
                        <br />
                        United Kingdom
                        <br />
                        E1 5NF
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </article>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
