import type { Metadata } from 'next';
import React from 'react';
import { Badge, Container, PageShell, Section } from '@tcg-hobby/ui';
import { LaunchHeader } from '../../components/launch-header';
import { getSiteUrl, siteName } from '../../lib/site';

const description = 'Helpful answers to common questions before and after you place an order.';

const faqSections = [
  {
    question: 'Do I need an account?',
    answer: ['No.', 'Guest checkout is available.', 'Creating an account unlocks additional collector features including wishlists and collection management.'],
  },
  {
    question: 'Can I change or cancel my order?',
    answer: ['If your order has not yet been dispatched we will always do our best to help.', 'Please contact us as soon as possible.'],
  },
  {
    question: 'How quickly do you dispatch?',
    answer: ['Orders are normally dispatched within one working day.'],
  },
  {
    question: 'Do you offer free delivery?',
    answer: ['Yes.', 'UK Mainland orders over £50 qualify for free standard delivery.', 'We may also run promotional free delivery events throughout the year.'],
  },
  {
    question: 'Do you ship to Northern Ireland?',
    answer: ['Yes.', 'Additional courier charges may apply.', 'These will always be shown during checkout before payment.'],
  },
  {
    question: 'Are your products genuine?',
    answer: ['Yes.', 'We only sell genuine products sourced from authorised distributors and trusted suppliers.'],
  },
  {
    question: 'Why are some products limited?',
    answer: ['Certain products are supplied in limited quantities.', 'Purchase limits help ensure fair access for as many collectors as possible.'],
  },
  {
    question: 'What happens if I exceed a purchase limit?',
    answer: ['Orders exceeding published purchase limits may be cancelled or refunded.'],
  },
  {
    question: 'Can I return sealed products?',
    answer: ['Yes.', 'Provided they remain unopened and are returned within our Returns Policy.'],
  },
  {
    question: 'Can I return opened trading card products?',
    answer: ['No.', 'Opened trading card products cannot normally be returned unless faulty.'],
  },
  {
    question: 'My item arrived damaged.',
    answer: ['Please contact us within 48 hours with photographs and we will resolve the issue as quickly as possible.'],
  },
  {
    question: 'How do I unsubscribe from marketing emails?',
    answer: ['Every marketing email includes an unsubscribe link.', 'You can unsubscribe at any time.'],
  },
] as const;

export const metadata: Metadata = {
  title: {
    absolute: `Frequently Asked Questions | ${siteName}`,
  },
  description,
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: `Frequently Asked Questions | ${siteName}`,
    description,
    url: '/faq',
    type: 'website',
    images: [{ url: '/brand/tcg-hobby-horizontal.png', width: 1200, height: 630, alt: 'TCG Hobby' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Frequently Asked Questions | ${siteName}`,
    description,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FaqPage() {
  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqSections.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer.join(' '),
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${siteUrl}/faq` },
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
              <Badge variant="accent">FAQ</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">Frequently Asked Questions</h1>
                <p className="max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">{description}</p>
              </div>
            </div>
          </Container>
        </Section>

        <Section className="bg-surface-ink py-10 sm:py-14 lg:py-16">
          <Container>
            <article className="mx-auto max-w-4xl rounded-lg border border-surface-line bg-surface-base/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-7 lg:p-9">
              <div className="space-y-8">
                {faqSections.map((item, index) => (
                  <section key={item.question} className="border-b border-surface-line/80 pb-7 last:border-b-0 last:pb-0">
                    <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)]">
                      <div>
                        <p className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-sm font-black text-accent">
                          {String(index + 1).padStart(2, '0')}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-xl font-black leading-tight text-neutral-50 sm:text-2xl">{item.question}</h2>
                        <div className="space-y-3 text-sm leading-7 text-neutral-300 sm:text-base sm:leading-8">
                          {item.answer.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
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
