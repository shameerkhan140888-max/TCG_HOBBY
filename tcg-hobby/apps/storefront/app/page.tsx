import Image from 'next/image';
import type { Metadata } from 'next';
import React from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Container,
  NotifyButton,
  Price,
  Section,
  WishlistButton,
} from '@tcg-hobby/ui';
import type { CatalogueProduct } from '@tcg-hobby/types';
import { getCustomerNotificationSubscriptions, getWishlistProductIds, MEGA_GRENINJA_PRODUCT_SLUG } from '@tcg-hobby/database';
import { SiteHeader } from '../components/site-header';
import { HomepageHeroCarousel } from '../components/homepage-hero-carousel';
import { getCurrentCustomerSession } from '../lib/auth';
import { toggleWishlistAction } from '../lib/wishlist';
import { toggleNotificationAction } from '../lib/release-actions';
import { getProductionHomepageData } from '../lib/homepage-data';
import { getSiteUrl, isComingSoonMode, launchDescription, siteName } from '../lib/site';
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

function ProductMedia({ product, priority = false }: { product: CatalogueProduct; priority?: boolean }) {
  if (!product.imageUrl) {
    return (
      <div className="flex h-full items-end rounded-xl bg-[linear-gradient(135deg,#1d1d22,#0f0f12_55%,rgba(255,122,26,0.22))] p-4">
        <span className="rounded-md bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
          {product.imageLabel}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={product.imageUrl}
      alt={product.imageAlt ?? product.name}
      fill
      priority={priority}
      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 45vw, 88vw"
      className="object-contain p-3 transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    />
  );
}

function HomepageProductCard({
  product,
  authenticated,
  notificationIds,
  returnTo,
  wishlistIds,
  priority = false,
}: {
  product: CatalogueProduct;
  authenticated: boolean;
  notificationIds: string[];
  returnTo: string;
  wishlistIds: string[];
  priority?: boolean;
}) {
  const upcoming = product.releaseStatus && product.releaseStatus !== 'RELEASED';
  const availableQuantity = Math.max(product.stockOnHand - product.reservedStock, 0);
  const stockLabel = upcoming
    ? product.releaseStatus === 'PREORDER'
      ? 'Pre-order'
      : 'Coming soon'
    : availableQuantity <= 0
      ? 'OUT OF STOCK'
      : availableQuantity <= 3
        ? 'LOW STOCK'
        : 'IN STOCK';
  const isLaunchProduct = product.slug === MEGA_GRENINJA_PRODUCT_SLUG;

  return (
    <article className="group flex h-full flex-col gap-4 rounded-2xl bg-surface-raised/85 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:bg-surface-raised hover:shadow-[0_24px_70px_rgba(255,122,26,0.14)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <a href={`/catalogue/${product.slug}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-base focus:outline-none focus:ring-2 focus:ring-accent">
        <ProductMedia product={product} priority={priority} />
      </a>
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm text-neutral-400">{product.game}</p>
              <Badge variant={upcoming ? 'warning' : availableQuantity <= 0 ? 'neutral' : availableQuantity <= 3 ? 'warning' : 'success'}>{stockLabel}</Badge>
          </div>
          <h2 className="line-clamp-2 min-h-[3.25rem] text-lg font-black leading-snug text-neutral-50">
            <a href={`/catalogue/${product.slug}`} className="transition hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
              {product.name}
            </a>
          </h2>
          {!isLaunchProduct ? <p className="text-sm text-neutral-500">{product.categoryName}</p> : null}
          {isLaunchProduct ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="success">FREE UK STANDARD DELIVERY</Badge>
              <Badge variant="accent">LIMIT 1 PER HOUSEHOLD</Badge>
            </div>
          ) : null}
        </div>
        <div className="mt-auto space-y-4">
          <Price value={product.price} />
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            {upcoming ? (
              authenticated ? (
                <NotifyButton
                  productId={product.id}
                  subscribed={notificationIds.includes(product.id)}
                  preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                  action={toggleNotificationAction}
                  returnTo={returnTo}
                />
              ) : (
                <Button asChild size="sm">
                  <a href={`/login?callbackUrl=${encodeURIComponent(returnTo)}`}>Notify me</a>
                </Button>
              )
            ) : (
              <Button asChild size="sm">
                <a href={`/catalogue/${product.slug}`}>{isLaunchProduct ? 'Shop Now' : 'View product'}</a>
              </Button>
            )}
            <WishlistButton
              productId={product.id}
              wishlisted={wishlistIds.includes(product.id)}
              authenticated={authenticated}
              action={toggleWishlistAction}
              loginHref={`/login?callbackUrl=${encodeURIComponent(returnTo)}`}
              returnTo={returnTo}
            />
          </div>
        </div>
      </div>
    </article>
  );
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

function ProductSection({
  title,
  eyebrow,
  description,
  products,
  authenticated,
  notificationIds,
  wishlistIds,
  returnTo,
  emptyTitle,
  emptyDescription,
  action,
}: {
  title: string;
  eyebrow: string;
  description: string;
  products: CatalogueProduct[];
  authenticated: boolean;
  notificationIds: string[];
  wishlistIds: string[];
  returnTo: string;
  emptyTitle: string;
  emptyDescription: string;
  action: ReactNode;
}) {
  return (
    <Section className="bg-surface-ink py-16 sm:py-20 lg:py-24">
      <Container className="space-y-10">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} action={action} />
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product, index) => (
              <HomepageProductCard
                key={product.id}
                product={product}
                notificationIds={notificationIds}
                wishlistIds={wishlistIds}
                authenticated={authenticated}
                returnTo={returnTo}
                priority={index === 0}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-raised/60 p-8 text-center">
            <h3 className="text-xl font-black text-neutral-50">{emptyTitle}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-400">{emptyDescription}</p>
          </div>
        )}
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
  const [wishlistIds, notificationIds] = authenticated
    ? await Promise.all([
        getWishlistProductIds(session.user.id),
        getCustomerNotificationSubscriptions(session.user.id).then((items) => items.map((item) => item.productId)),
      ])
    : [[], []];
  const returnTo = '/';
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

        <ProductSection
          eyebrow="Featured products"
          title="Curated picks from the catalogue."
          description="Discover hand-picked products, collector essentials and upcoming highlights."
          products={homeData.featuredProducts}
          notificationIds={notificationIds}
          wishlistIds={wishlistIds}
          authenticated={authenticated}
          returnTo={returnTo}
          emptyTitle="Featured products are being curated"
          emptyDescription="Selected products will appear here as the catalogue opens."
          action={
            <Button asChild>
              <a href="/catalogue">View all products</a>
            </Button>
          }
        />

        <SlimArtworkBanner
          eyebrow="Pre-orders"
          title="Plan ahead without the noise."
          description="Follow upcoming releases and product windows with clear information, realistic timing and collector-first communication."
          href="/releases"
          linkLabel="View releases"
        />

        <ProductSection
          eyebrow="New releases"
          title="Fresh arrivals for launch."
          description="Browse the latest products added to the TCG Hobby catalogue."
          products={homeData.newReleaseProducts}
          notificationIds={notificationIds}
          wishlistIds={wishlistIds}
          authenticated={authenticated}
          returnTo={returnTo}
          emptyTitle="New releases are being prepared"
          emptyDescription="Fresh products will appear here as launch stock is published."
          action={
            <Button asChild variant="outline">
              <a href="/catalogue?sort=newest">View new releases</a>
            </Button>
          }
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
      </main>
    </>
  );
}
