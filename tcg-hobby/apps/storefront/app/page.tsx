import Image from 'next/image';
import type { Metadata } from 'next';
import React from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  Container,
  Section,
} from '@tcg-hobby/ui';
import type { MerchandisingRecommendation } from '@tcg-hobby/database';
import { getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../components/site-header';
import { HomepageHeroCarousel } from '../components/homepage-hero-carousel';
import { ProductMerchandisingRail } from '../components/product-merchandising-rail';
import { SocialLinks } from '../components/social-links';
import { getCurrentCustomerSession } from '../lib/auth';
import { getProductionHomepageData } from '../lib/homepage-data';
import { getSiteSocialLinks, getSiteUrl, isComingSoonMode, launchDescription, siteName } from '../lib/site';
import ComingSoonPage from './coming-soon/page';

export const dynamic = 'force-dynamic';

const storefrontDescription =
  'Shop trading cards, sealed products, accessories, new releases and collector tools from TCG Hobby, a UK trading card retailer built for collectors and players.';

type HomeSearchParams = {
  subscriberSignup?: string | string[] | undefined;
};

export async function generateMetadata(): Promise<Metadata> {
  if (isComingSoonMode()) {
    return {
      title: {
        absolute: `Coming Soon | ${siteName}`,
      },
      description: launchDescription,
      alternates: {
        canonical: '/',
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  return {
    title: {
      absolute: 'TCG Hobby | Trading Cards, New Releases and Collector Tools',
    },
    description: storefrontDescription,
    alternates: {
      canonical: 'https://tcg-hobby.co.uk',
    },
    openGraph: {
      title: 'TCG Hobby | Trading Cards, New Releases and Collector Tools',
      description: storefrontDescription,
      url: 'https://tcg-hobby.co.uk',
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
      title: 'TCG Hobby | Trading Cards, New Releases and Collector Tools',
      description: storefrontDescription,
      images: ['/brand/tcg-hobby-horizontal.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

const categoryPills = [
  { label: 'Pokémon', href: '/catalogue?q=Pokemon' },
  { label: 'Magic: The Gathering', href: '/catalogue?q=Magic' },
  { label: 'Disney Lorcana', href: '/catalogue?q=Lorcana' },
  { label: 'One Piece Card Game', href: '/catalogue?q=One+Piece' },
  { label: 'Yu-Gi-Oh!', href: '/catalogue?q=Yu-Gi-Oh' },
  { label: 'Accessories', href: '/catalogue?category=accessories' },
];

function CategoryPillNav() {
  return (
    <nav aria-label="Popular catalogue categories" className="bg-surface-ink py-6">
      <Container>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {categoryPills.map((category) => (
            <a
              key={category.label}
              href={category.href}
              className="shrink-0 rounded-full bg-surface-raised/75 px-5 py-3 text-sm font-bold text-neutral-200 shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition hover:bg-accent hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {category.label}
            </a>
          ))}
        </div>
      </Container>
    </nav>
  );
}

function SlimArtworkBanner({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <Section className="bg-surface-ink py-8 sm:py-10">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-surface-base px-6 py-8 shadow-[0_22px_80px_rgba(0,0,0,0.26)] sm:px-8 lg:px-10">
          <Image
            src="/launch/tcg-hobby-production-hero.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[72%_center] opacity-35"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,10,0.96),rgba(8,8,10,0.76)_46%,rgba(8,8,10,0.2))]" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
              <h2 className="text-2xl font-black text-neutral-50 sm:text-3xl">{title}</h2>
              <p className="max-w-2xl text-sm leading-6 text-neutral-300">{description}</p>
            </div>
            <Button asChild variant="outline">
              <a href={href}>{linkLabel}</a>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function TrustStrip() {
  return (
    <Section className="bg-surface-ink py-10 sm:py-12">
      <Container>
        <div className="grid gap-4 rounded-3xl bg-surface-raised/60 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] md:grid-cols-3">
          {[
            ['Trusted Service', 'Clear updates and careful support from launch onward.'],
            ['Competitive Prices', 'Fair retail pricing wherever product conditions allow.'],
            ['Community Focused', 'Built for UK collectors, players and long-term hobby growth.'],
          ].map(([title, copy]) => (
            <div key={title} className="space-y-2 px-2 py-3">
              <h2 className="text-base font-black text-neutral-50">{title}</h2>
              <p className="text-sm leading-6 text-neutral-400">{copy}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        <h2 className="text-3xl font-black tracking-tight text-neutral-50 sm:text-4xl">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-neutral-400 sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function HomepageMerchandisingSection({
  title,
  eyebrow,
  description,
  products,
  authenticated,
  wishlistIds,
  placement,
  actionHref,
  actionLabel,
}: {
  title: string;
  eyebrow: string;
  description: string;
  products: MerchandisingRecommendation[];
  authenticated: boolean;
  wishlistIds: string[];
  placement: 'HOMEPAGE_FEATURED' | 'HOMEPAGE_NEW_ARRIVALS';
  actionHref: string;
  actionLabel: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <Section className="bg-surface-ink py-16 sm:py-20 lg:py-24">
      <Container>
        <ProductMerchandisingRail
          products={products}
          eyebrow={eyebrow}
          title={title}
          description={description}
          placement={placement}
          authenticated={authenticated}
          wishlistProductIds={wishlistIds}
          actionHref={actionHref}
          actionLabel={actionLabel}
          className="mt-0"
        />
      </Container>
    </Section>
  );
}

function FollowSection({ socialLinks }: { socialLinks: ReturnType<typeof getSiteSocialLinks> }) {
  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <Section className="bg-surface-ink py-12 sm:py-16">
      <Container>
        <div className="flex flex-col gap-5 rounded-3xl bg-surface-raised/65 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">Follow TCG Hobby</p>
            <h2 className="text-2xl font-black text-neutral-50 sm:text-3xl">New releases, restocks and product announcements.</h2>
            <p className="max-w-2xl text-sm leading-6 text-neutral-400">
              Follow along for launch updates, special offers and collector-focused product news.
            </p>
          </div>
          <SocialLinks links={socialLinks} />
        </div>
      </Container>
    </Section>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  if (isComingSoonMode()) {
    return <ComingSoonPage searchParams={searchParams} />;
  }

  const [homeData, session] = await Promise.all([
    getProductionHomepageData(),
    getCurrentCustomerSession(),
  ]);
  const authenticated = session?.user.role === 'CUSTOMER';
  const wishlistIds = authenticated ? await getWishlistProductIds(session.user.id) : [];
  const socialLinks = getSiteSocialLinks();
  const siteUrl = getSiteUrl();
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/catalogue?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/brand/tcg-hobby-horizontal.png`,
    },
  ];
  return (
    <>
      <SiteHeader />
      <main className="bg-surface-ink text-neutral-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <HomepageHeroCarousel slides={homeData.heroSlides} />
        <CategoryPillNav />

        <HomepageMerchandisingSection
          eyebrow="Featured products"
          title="Curated picks from the catalogue."
          description="Discover hand-picked products, collector essentials and upcoming highlights."
          products={homeData.featuredProducts}
          wishlistIds={wishlistIds}
          authenticated={authenticated}
          placement="HOMEPAGE_FEATURED"
          actionHref="/catalogue"
          actionLabel="View all products"
        />

        <SlimArtworkBanner
          eyebrow="Pre-orders"
          title="Plan ahead without the noise."
          description="Follow upcoming releases and product windows with clear information, realistic timing and collector-first communication."
          href="/releases"
          linkLabel="View releases"
        />

        <HomepageMerchandisingSection
          eyebrow="Latest arrivals"
          title="Fresh arrivals for launch."
          description="Browse the latest eligible products added to the TCG Hobby catalogue."
          products={homeData.latestProducts}
          wishlistIds={wishlistIds}
          authenticated={authenticated}
          placement="HOMEPAGE_NEW_ARRIVALS"
          actionHref="/catalogue?sort=newest"
          actionLabel="View latest"
        />

        <HomepageMerchandisingSection
          eyebrow="Staff picks"
          title="Selected by TCG Hobby."
          description="A compact edit of products highlighted through Admin merchandising."
          products={homeData.staffPickProducts}
          wishlistIds={wishlistIds}
          authenticated={authenticated}
          placement="HOMEPAGE_FEATURED"
          actionHref="/catalogue"
          actionLabel="View catalogue"
        />

        <Section className="bg-surface-ink py-16 sm:py-20 lg:py-24">
          <Container className="space-y-10">
            <SectionHeading
              eyebrow="Why TCG Hobby"
              title="Built around trust, clarity and long-term collecting."
            />
            <div className="grid gap-5 lg:grid-cols-3">
              {[
                ['Genuine Products', 'Products sourced from trusted UK distributors and established suppliers.'],
                ['Fair Pricing', 'We aim to offer products at RRP wherever possible and price fairly when market conditions make that impractical.'],
                ['Collector-Focused Service', 'Built around clear communication, secure shopping and long-term support for collectors and players.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl bg-surface-raised/65 p-6">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-accent/10 text-accent" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="h-5 w-5">
                      <path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <h2 className="mt-5 text-xl font-black text-neutral-50">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">{copy}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        <SlimArtworkBanner
          eyebrow="Collector essentials"
          title="Accessories that keep collections display-ready."
          description="Protect cards, organise binders and prepare for launch day with products chosen for collectors and players."
          href="/catalogue?category=accessories"
          linkLabel="Shop accessories"
        />

        <TrustStrip />
        <FollowSection socialLinks={socialLinks} />
      </main>
    </>
  );
}
