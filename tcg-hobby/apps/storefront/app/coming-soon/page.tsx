import type { Metadata } from 'next';
import { Badge, Container, PageShell, Section } from '@tcg-hobby/ui';
import { LaunchBrandCarousel } from '../../components/launch-brand-carousel';
import { LaunchEmailCapture } from '../../components/launch-email-capture';
import { LaunchHeader } from '../../components/launch-header';
import { getSiteUrl, launchDescription, siteName } from '../../lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Coming Soon',
  description: launchDescription,
  alternates: {
    canonical: '/coming-soon',
  },
  openGraph: {
    title: `Coming Soon | ${siteName}`,
    description: launchDescription,
    url: '/coming-soon',
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
    title: `Coming Soon | ${siteName}`,
    description: launchDescription,
    images: ['/brand/tcg-hobby-horizontal.png'],
  },
};

function FairPricingCommitment() {
  return (
    <Section id="fair-pricing" className="border-b border-surface-line bg-surface-ink py-10 sm:py-12 lg:py-14">
      <Container>
        <div className="mx-auto max-w-4xl rounded-lg border border-accent/20 bg-[linear-gradient(135deg,rgba(255,122,26,0.12),rgba(17,17,20,0.9)_34%,rgba(8,8,10,0.96))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent sm:h-12 sm:w-12">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3.5 19 6v5.2c0 4.2-2.8 7.8-7 9.3-4.2-1.5-7-5.1-7-9.3V6l7-2.5Z" />
                <path d="m8.8 12.1 2.1 2.1 4.5-4.7" />
              </svg>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Fair Pricing</p>
              <h2 className="text-2xl font-black leading-tight text-neutral-50 sm:text-3xl">Our Pricing Commitment</h2>
              <p className="max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base sm:leading-8">
                “We believe trading cards should be accessible to collectors and players alike. Wherever possible, we’ll offer products at the manufacturer’s recommended retail price (RRP). When market conditions make that impossible, we’ll always aim to price our products as fairly and competitively as we can.”
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ subscriberSignup?: string | string[] | undefined }>;
}) {
  const siteUrl = getSiteUrl();
  const resolvedSearchParams = await searchParams;
  const signupSaved = resolvedSearchParams.subscriberSignup === 'saved';
  const signupError =
    resolvedSearchParams.subscriberSignup === 'invalid'
      ? 'Enter a valid email address.'
      : resolvedSearchParams.subscriberSignup === 'consent'
        ? 'consent'
      : resolvedSearchParams.subscriberSignup === 'save' || resolvedSearchParams.subscriberSignup === 'limited'
        ? 'save'
        : undefined;
  const launchStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'TCG Hobby Coming Soon',
    url: `${siteUrl}/coming-soon`,
    description: launchDescription,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: `${siteUrl}/brand/tcg-hobby-horizontal.png`,
    },
  };

  return (
    <PageShell>
      <LaunchHeader />
      <main className="bg-surface-ink text-neutral-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(launchStructuredData) }}
        />

        <Section className="relative overflow-hidden border-b border-surface-line bg-surface-ink py-8 sm:py-10 lg:py-14">
          <figure className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
            <img
              src="/launch/tcg-hobby-production-hero.png"
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </figure>
          <Container className="relative grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:grid-rows-[auto_auto]">
            <div className="relative z-10 order-1 max-w-3xl space-y-4 sm:space-y-5 lg:col-start-1 lg:row-start-1">
              <Badge variant="accent">Coming soon</Badge>
              <div className="space-y-4">
                <h1 className="max-w-[11ch] text-[2.65rem] font-black leading-[1.04] text-neutral-50 sm:max-w-none sm:text-5xl lg:text-6xl">
                  TCG Hobby opens soon.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  A premium trading card launch experience for sealed product drops, preorder windows, opening updates, and player-ready releases.
                </p>
              </div>
            </div>

            <div className="order-2 w-full lg:contents">
              <figure className="relative w-full lg:hidden">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src="/launch/tcg-hobby-production-hero.png"
                    alt="Original TCG Hobby collector artwork showing a collector holding a glowing trading card in a dark hobby store."
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </figure>

              <div id="launch-list" className="relative z-10 mx-4 -mt-16 rounded-lg border border-accent/30 bg-[rgba(10,11,14,0.92)] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-md sm:mx-auto sm:-mt-24 sm:w-[88%] sm:p-5 lg:col-start-1 lg:row-start-2 lg:mx-0 lg:mt-0 lg:w-auto lg:bg-black/20 lg:shadow-[0_18px_54px_rgba(0,0,0,0.22)] lg:backdrop-blur-none">
                <div className="mb-3 space-y-1 sm:mb-4">
                  <h2 className="text-lg font-bold text-neutral-50">Be first to know</h2>
                  <p className="text-sm leading-6 text-neutral-400">
                    Be first to hear about our launch, upcoming releases and important TCG Hobby updates.
                  </p>
                </div>
                <LaunchEmailCapture source="coming-soon-page" compact saved={signupSaved} error={signupError} returnTo="/" />
              </div>
            </div>
          </Container>
        </Section>

        <FairPricingCommitment />

        <Section className="py-10 sm:py-12 lg:py-14">
          <Container className="space-y-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Preview</p>
              <h2 className="mt-2 text-3xl font-bold text-neutral-50">Built for launch day and beyond.</h2>
            </div>
            <LaunchBrandCarousel />
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
