import type { Metadata } from 'next';
import { Badge, Container, PageShell, Section } from '@tcg-hobby/ui';
import { ContactForm } from '../../components/contact-form';
import { LaunchHeader } from '../../components/launch-header';
import { siteName } from '../../lib/site';

const description =
  'Contact TCG Hobby for launch questions, customer support, supplier enquiries and account-related matters.';

const contactOptions = [
  {
    title: 'General enquiries',
    email: 'info@tcg-hobby.co.uk',
    description: 'For launch questions, partnerships, supplier enquiries and general information.',
  },
  {
    title: 'Customer support',
    email: 'support@tcg-hobby.co.uk',
    description: 'For help with your subscription, account access or future customer-service queries.',
  },
  {
    title: 'Accounts and billing',
    email: 'accounts@tcg-hobby.co.uk',
    description: 'For invoices, payment queries and business account matters.',
  },
];

export const metadata: Metadata = {
  title: {
    absolute: 'Contact TCG Hobby | Support and Enquiries',
  },
  description,
  alternates: {
    canonical: 'https://tcg-hobby.co.uk/contact',
  },
  openGraph: {
    title: 'Contact TCG Hobby | Support and Enquiries',
    description,
    url: 'https://tcg-hobby.co.uk/contact',
    type: 'website',
    siteName,
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
    title: 'Contact TCG Hobby | Support and Enquiries',
    description,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ contactStatus?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const contactStatus = typeof resolvedSearchParams.contactStatus === 'string' ? resolvedSearchParams.contactStatus : undefined;

  return (
    <PageShell>
      <LaunchHeader />
      <main className="bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.16),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_62%,#17120e_100%)] py-12 sm:py-16 lg:py-20">
          <Container>
            <div className="max-w-4xl space-y-6">
              <Badge variant="accent">Contact</Badge>
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">Contact TCG Hobby</h1>
                <p className="max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">
                  Questions about the launch, products or your subscription? We&rsquo;re here to help.
                </p>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-neutral-400 sm:text-base">
                TCG Hobby is currently preparing for launch. Use the details below for general enquiries, support or account-related questions.
              </p>
            </div>
          </Container>
        </Section>

        <Section className="bg-surface-ink py-10 sm:py-14 lg:py-16">
          <Container className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              {contactOptions.map((option) => (
                <article key={option.email} className="rounded-lg border border-surface-line bg-surface-base/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{option.title}</p>
                  <a
                    href={`mailto:${option.email}`}
                    className="mt-3 inline-flex text-lg font-black text-neutral-50 underline decoration-accent/40 underline-offset-4 transition hover:text-accent-soft"
                  >
                    {option.email}
                  </a>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">{option.description}</p>
                </article>
              ))}

              <div className="rounded-lg border border-accent/20 bg-accent/10 p-5 text-sm leading-6 text-neutral-300">
                <p>
                  Automated emails may be sent from no-reply@tcg-hobby.co.uk. This mailbox is not monitored. Please contact{' '}
                  <a href="mailto:info@tcg-hobby.co.uk" className="text-accent-soft underline decoration-accent/50 underline-offset-4">
                    info@tcg-hobby.co.uk
                  </a>{' '}
                  or{' '}
                  <a href="mailto:support@tcg-hobby.co.uk" className="text-accent-soft underline decoration-accent/50 underline-offset-4">
                    support@tcg-hobby.co.uk
                  </a>{' '}
                  if you need assistance.
                </p>
              </div>

              <p className="rounded-lg border border-surface-line bg-black/20 p-4 text-sm leading-6 text-neutral-400">
                We aim to respond within one business day during normal working periods.
              </p>
            </div>

            <article className="rounded-lg border border-surface-line bg-surface-base/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-7">
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Send a message</p>
                <h2 className="text-2xl font-black text-neutral-50">Contact form</h2>
                <p className="text-sm leading-6 text-neutral-400">Please do not include payment card details or other sensitive information.</p>
              </div>
              <ContactForm status={contactStatus} />
            </article>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
