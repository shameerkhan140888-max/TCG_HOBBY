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
import type { CatalogueProduct, ReleaseSummary } from '@tcg-hobby/types';
import { getCustomerNotificationSubscriptions, getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../components/site-header';
import { AddToCartButton } from '../components/cart-actions';
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
      className="object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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
  const stockLabel = upcoming ? product.releaseStatus === 'PREORDER' ? 'Pre-order' : 'Coming soon' : product.inStock ? 'In stock' : 'Low stock';

  return (
    <article className="group flex h-full flex-col gap-4 rounded-2xl bg-surface-raised/70 p-4 transition duration-200 hover:-translate-y-1 hover:bg-surface-raised motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <a href={`/catalogue/${product.slug}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-base focus:outline-none focus:ring-2 focus:ring-accent">
        <ProductMedia product={product} priority={priority} />
      </a>
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm text-neutral-400">{product.game}</p>
            <Badge variant={upcoming ? 'warning' : product.inStock ? 'success' : 'neutral'}>{stockLabel}</Badge>
          </div>
          <h2 className="line-clamp-2 min-h-[3.25rem] text-lg font-black leading-snug text-neutral-50">
            <a href={`/catalogue/${product.slug}`} className="transition hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
              {product.name}
            </a>
          </h2>
          <p className="text-sm text-neutral-500">{product.categoryName}</p>
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
              <AddToCartButton productId={product.id} returnTo={returnTo} />
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

function formatReleaseDate(release: ReleaseSummary): string {
  return new Date(release.releaseDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
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
  const supportingReleases = homeData.releaseHub.upcomingReleases
    .filter((release) => release.id !== homeData.releaseHub.featuredRelease?.id)
    .slice(0, 2);

  return (
    <>
      <SiteHeader />
      <main className="bg-surface-ink text-neutral-50">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <HomepageHeroCarousel slides={homeData.heroSlides} />

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

        <Section className="bg-surface-base py-16 sm:py-20 lg:py-24">
          <Container className="space-y-10">
            <SectionHeading
              eyebrow="Releases and pre-orders"
              title="Plan ahead for the next big release."
              action={
                <Button asChild variant="outline">
                  <a href="/releases">View releases</a>
                </Button>
              }
            />
            {homeData.releaseHub.featuredRelease ? (
              <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,rgba(255,122,26,0.18),rgba(18,18,21,0.95)_46%,rgba(8,8,10,1))] p-6 sm:p-8">
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">
                        {homeData.releaseHub.featuredRelease.preorderProductCount > 0 ? 'Pre-order' : 'Coming soon'}
                      </Badge>
                      <Badge variant="accent">{homeData.releaseHub.featuredRelease.brand}</Badge>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-3xl font-black leading-tight text-neutral-50 sm:text-4xl">
                        {homeData.releaseHub.featuredRelease.name}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-neutral-300">
                        {homeData.releaseHub.featuredRelease.announcementText ?? 'Release details are available in the calendar.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                      <span>{homeData.releaseHub.featuredRelease.game}</span>
                      <span aria-hidden="true">/</span>
                      <span>{formatReleaseDate(homeData.releaseHub.featuredRelease)}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {authenticated && homeData.releaseHub.featuredRelease.products[0] ? (
                        <NotifyButton
                          productId={homeData.releaseHub.featuredRelease.products[0].productId}
                          subscribed={notificationIds.includes(homeData.releaseHub.featuredRelease.products[0].productId)}
                          preference="ALL"
                          action={toggleNotificationAction}
                          returnTo={returnTo}
                        />
                      ) : (
                        <Button asChild>
                          <a href={`/login?callbackUrl=${encodeURIComponent(returnTo)}`}>Notify me</a>
                        </Button>
                      )}
                      <Button asChild variant="outline">
                        <a href="/releases">Release calendar</a>
                      </Button>
                    </div>
                  </div>
                </div>

                {supportingReleases.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                    {supportingReleases.map((release) => (
                      <a
                        key={release.id}
                        href="/releases"
                        className="rounded-2xl bg-surface-raised/75 p-5 transition hover:-translate-y-1 hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        <Badge variant="accent">{release.brand}</Badge>
                        <h3 className="mt-4 text-lg font-black leading-tight text-neutral-50">{release.name}</h3>
                        <p className="mt-2 text-sm text-neutral-400">{formatReleaseDate(release)}</p>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-raised/60 p-8 text-center">
                <h3 className="text-xl font-black text-neutral-50">Release calendar is being prepared</h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                  Upcoming releases will appear here when products are scheduled.
                </p>
              </div>
            )}
          </Container>
        </Section>

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

        <Section className="bg-surface-base py-16 sm:py-20 lg:py-24">
          <Container>
            <div className="grid gap-8 rounded-3xl bg-[linear-gradient(135deg,rgba(255,122,26,0.18),rgba(18,18,21,0.96)_48%,rgba(8,8,10,1))] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <Badge variant="accent">Founding member</Badge>
                <h2 className="text-3xl font-black tracking-tight text-neutral-50 sm:text-4xl">Join before the full storefront opens.</h2>
                <p className="max-w-3xl text-sm leading-6 text-neutral-300 sm:text-base">
                  Become a founding member for launch updates, early product news, pre-order alerts and first access to future collector services.
                </p>
              </div>
              <Button asChild size="lg">
                <a href="#newsletter">Join the list</a>
              </Button>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
