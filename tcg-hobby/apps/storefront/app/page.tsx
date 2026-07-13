import Image from 'next/image';
import type { Metadata } from 'next';
import React from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  EmptyState,
  NotifyButton,
  ProductCard,
  ReleaseCard,
  Section,
  WishlistButton,
} from '@tcg-hobby/ui';
import type { CatalogueProduct } from '@tcg-hobby/types';
import { getCustomerNotificationSubscriptions, getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../components/site-header';
import { AddToCartButton } from '../components/cart-actions';
import { LaunchEmailCapture } from '../components/launch-email-capture';
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

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function ProductMedia({ product, priority = false }: { product: CatalogueProduct; priority?: boolean }) {
  if (!product.imageUrl) {
    return null;
  }

  return (
    <Image
      src={product.imageUrl}
      alt={product.imageAlt ?? product.name}
      fill
      priority={priority}
      sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
      className="object-cover"
    />
  );
}

function ProductActions({
  product,
  notificationIds,
  returnTo,
  wishlistIds,
  authenticated,
}: {
  product: CatalogueProduct;
  notificationIds: string[];
  returnTo: string;
  wishlistIds: string[];
  authenticated: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {product.releaseStatus && product.releaseStatus !== 'RELEASED' ? (
        authenticated ? (
          <NotifyButton
            productId={product.id}
            subscribed={notificationIds.includes(product.id)}
            preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
            action={toggleNotificationAction}
            returnTo={returnTo}
          />
        ) : (
          <Button asChild size="sm" variant="secondary">
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
  );
}

function ProductGrid({
  products,
  notificationIds,
  wishlistIds,
  authenticated,
  returnTo,
  priorityFirstImage = false,
}: {
  products: CatalogueProduct[];
  notificationIds: string[];
  wishlistIds: string[];
  authenticated: boolean;
  returnTo: string;
  priorityFirstImage?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          href={`/catalogue/${product.slug}`}
          mediaSlot={<ProductMedia product={product} priority={priorityFirstImage && index === 0} />}
          actionSlot={
            <ProductActions
              product={product}
              notificationIds={notificationIds}
              wishlistIds={wishlistIds}
              authenticated={authenticated}
              returnTo={returnTo}
            />
          }
        />
      ))}
    </div>
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
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        <h2 className="text-3xl font-black tracking-tight text-neutral-50 sm:text-4xl">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-neutral-400 sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
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

  const resolvedSearchParams = await searchParams;
  const subscriberSignup = asString(resolvedSearchParams.subscriberSignup);
  const signupSaved = subscriberSignup === 'saved';
  const signupError = ['invalid', 'save', 'limited', 'consent', 'spam'].includes(subscriberSignup) ? subscriberSignup : undefined;
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

        <Section className="border-b border-surface-line bg-surface-base/80">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Shop by game"
              title="Start with your favourite TCG."
              description="Browse the categories planned for launch. Tiles stay useful even while a database category is still being prepared."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {homeData.categories.map((category) => (
                <a
                  key={category.name}
                  href={category.href}
                  className="group rounded-lg border border-surface-line bg-surface-raised p-5 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_18px_50px_rgba(255,122,26,0.08)] focus:outline-none focus:ring-2 focus:ring-accent motion-reduce:transform-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{category.accent}</p>
                      <h2 className="text-2xl font-black text-neutral-50">{category.name}</h2>
                    </div>
                    <Badge variant={category.available ? 'success' : 'outline'}>{category.available ? 'Available' : 'Preparing'}</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-neutral-400">{category.description}</p>
                  <p className="mt-5 text-sm font-semibold text-accent-soft">Browse category</p>
                </a>
              ))}
            </div>
          </Container>
        </Section>

        <Section id="new-releases" className="border-b border-surface-line bg-surface-ink">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="New releases"
              title="Fresh arrivals for launch day and beyond."
              description="Real catalogue products sorted by newest first, with no fabricated stock or urgency."
              action={
                <Button asChild variant="outline">
                  <a href="/catalogue?sort=newest">Shop new releases</a>
                </Button>
              }
            />
            {homeData.newReleases.length ? (
              <ProductGrid
                products={homeData.newReleases}
                notificationIds={notificationIds}
                wishlistIds={wishlistIds}
                authenticated={authenticated}
                returnTo={returnTo}
                priorityFirstImage
              />
            ) : (
              <EmptyState
                title="New releases are being prepared"
                description="No released products are available yet. Open the catalogue to browse the current published range."
                action={
                  <Button asChild>
                    <a href="/catalogue">Open catalogue</a>
                  </Button>
                }
              />
            )}
          </Container>
        </Section>

        <Section className="border-b border-surface-line bg-surface-base">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Coming soon and pre-orders"
              title="Plan the next release window."
              description="Upcoming releases use the release calendar and notification infrastructure already in the storefront."
              action={
                <Button asChild variant="outline">
                  <a href="/releases">Open release calendar</a>
                </Button>
              }
            />
            {homeData.releaseHub.featuredRelease ? (
              <Card className="overflow-hidden border-accent/25 bg-[linear-gradient(135deg,rgba(255,122,26,0.12),rgba(18,18,21,0.95)_42%,rgba(8,8,10,1))]">
                <CardContent className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">
                        {homeData.releaseHub.featuredRelease.preorderProductCount > 0 ? 'Pre-orders' : 'Coming soon'}
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
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">Game</p>
                        <p className="mt-1 font-semibold text-neutral-50">{homeData.releaseHub.featuredRelease.game}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">Release date</p>
                        <p className="mt-1 font-semibold text-neutral-50">
                          {new Date(homeData.releaseHub.featuredRelease.releaseDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">Products</p>
                        <p className="mt-1 font-semibold text-neutral-50">{homeData.releaseHub.featuredRelease.productCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {homeData.releaseHub.upcomingReleases.slice(0, 2).map((release) => (
                      <ReleaseCard
                        key={release.id}
                        release={release}
                        showCountdown={false}
                        actionSlot={
                          <div className="flex flex-wrap gap-2">
                            {authenticated && release.products[0] ? (
                              <NotifyButton
                                productId={release.products[0].productId}
                                subscribed={notificationIds.includes(release.products[0].productId)}
                                preference="ALL"
                                action={toggleNotificationAction}
                                returnTo={returnTo}
                              />
                            ) : (
                              <Button asChild size="sm" variant="secondary">
                                <a href={`/login?callbackUrl=${encodeURIComponent(returnTo)}`}>Notify me</a>
                              </Button>
                            )}
                            <Button asChild size="sm" variant="outline">
                              <a href="/releases">View release</a>
                            </Button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                title="Release calendar is being prepared"
                description="No visible upcoming releases are available yet. The section will populate from release data as soon as products are scheduled."
                action={
                  <Button asChild>
                    <a href="/releases">Open releases</a>
                  </Button>
                }
              />
            )}
          </Container>
        </Section>

        <Section id="featured-products" className="border-b border-surface-line bg-surface-ink">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Featured products"
              title="Curated picks from the catalogue."
              description="Featured products are selected from published catalogue data and filtered to avoid repeating the new-release grid where practical."
              action={
                <Button asChild variant="outline">
                  <a href="/catalogue">View all products</a>
                </Button>
              }
            />
            {homeData.featuredProducts.length ? (
              <ProductGrid
                products={homeData.featuredProducts}
                notificationIds={notificationIds}
                wishlistIds={wishlistIds}
                authenticated={authenticated}
                returnTo={returnTo}
              />
            ) : (
              <EmptyState
                title="Featured products are not configured yet"
                description="Published featured products will appear here once the catalogue team marks them as featured."
                action={
                  <Button asChild>
                    <a href="/catalogue">Browse catalogue</a>
                  </Button>
                }
              />
            )}
          </Container>
        </Section>

        <Section className="border-b border-surface-line bg-surface-base">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Today's hot products"
              title="Honest demand signals, no made-up rankings."
              description="Until analytics are connected, this section uses deterministic featured, stock and release-date signals."
            />
            {homeData.hotProducts.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {homeData.hotProducts.map((item) => (
                  <Card key={item.product.id} className="transition hover:border-accent/50">
                    <CardContent className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-neutral-400">{item.product.game}</p>
                          <h3 className="mt-1 text-xl font-black leading-tight text-neutral-50">{item.product.name}</h3>
                        </div>
                        <Badge variant="accent">{item.badge}</Badge>
                      </div>
                      <p className="text-sm leading-6 text-neutral-400">{item.reason}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={`/catalogue/${item.product.slug}`}>View product</a>
                        </Button>
                        <ProductActions
                          product={item.product}
                          notificationIds={notificationIds}
                          wishlistIds={wishlistIds}
                          authenticated={authenticated}
                          returnTo={returnTo}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Hot product signals need catalogue data"
                description="This section will populate once in-stock published products are available."
              />
            )}
          </Container>
        </Section>

        <Section className="border-b border-surface-line bg-surface-ink">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Why TCG Hobby"
              title="Built around trust, clarity and long-term collecting."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                ['Genuine Products', 'Products sourced from trusted UK distributors and established suppliers.'],
                ['Fair Pricing', 'We aim to offer products at RRP wherever possible and price fairly when market conditions make that impractical.'],
                ['Collector-Focused Service', 'Built around clear communication, secure shopping and long-term support for collectors and players.'],
              ].map(([title, copy]) => (
                <Card key={title} className="border-accent/20 bg-surface-raised/85">
                  <CardContent className="space-y-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent" aria-hidden="true">
                      ✓
                    </div>
                    <h2 className="text-xl font-black text-neutral-50">{title}</h2>
                    <p className="text-sm leading-6 text-neutral-400">{copy}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </Section>

        <Section className="border-b border-surface-line bg-surface-base">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Collection and player tools"
              title={authenticated ? 'Welcome back to your hobby hub.' : 'Member tools that support the store.'}
              description="Retail comes first on the homepage, with lightweight routes into collection, deck, wishlist and release tools."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {homeData.tools.map((tool) => {
                const href = authenticated && tool.requiresLogin ? getAuthenticatedToolHref(tool.title) : tool.href;
                return (
                  <a
                    key={tool.title}
                    href={href}
                    className="rounded-lg border border-surface-line bg-surface-raised p-5 transition hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <h2 className="text-lg font-black text-neutral-50">{tool.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">{tool.description}</p>
                    <p className="mt-4 text-sm font-semibold text-accent-soft">{tool.requiresLogin && !authenticated ? 'Log in to use' : 'Open tool'}</p>
                  </a>
                );
              })}
            </div>
          </Container>
        </Section>

        <Section className="border-b border-surface-line bg-surface-ink">
          <Container className="space-y-8">
            <SectionHeading
              eyebrow="Latest from TCG Hobby"
              title="Release updates without invented articles."
              description="This section uses release announcements until a dedicated news source is connected."
            />
            {homeData.news.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {homeData.news.map((item) => (
                  <a
                    key={`${item.title}-${item.dateLabel ?? item.label}`}
                    href={item.href}
                    className="rounded-lg border border-surface-line bg-surface-raised p-5 transition hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent">{item.label}</Badge>
                      {item.dateLabel ? <span className="text-xs text-neutral-500">{item.dateLabel}</span> : null}
                    </div>
                    <h2 className="mt-4 text-xl font-black leading-tight text-neutral-50">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">{item.description}</p>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No updates are published yet"
                description="Release announcements or future news content will appear here when available."
              />
            )}
          </Container>
        </Section>

        <Section id="launch-list" className="bg-[linear-gradient(135deg,#111113,#1f140c_58%,#08080a)]">
          <Container>
            <Card className="border-accent/25 bg-black/25">
              <CardContent className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[0.9fr_1.1fr] lg:p-9">
                <div className="space-y-3">
                  <Badge variant="accent">Newsletter</Badge>
                  <h2 className="text-3xl font-black text-neutral-50 sm:text-4xl">Stay close to launch drops.</h2>
                  <p className="text-sm leading-6 text-neutral-300 sm:text-base">
                    Join for release updates, product drops and selected offers. Consent is required and duplicate signups receive the same privacy-safe response.
                  </p>
                </div>
                <LaunchEmailCapture
                  source="homepage-newsletter"
                  returnTo="/"
                  saved={signupSaved}
                  error={signupError}
                  compact
                />
              </CardContent>
            </Card>
          </Container>
        </Section>
      </main>
    </>
  );
}

function getAuthenticatedToolHref(title: string): string {
  if (title === 'Collection Manager') return '/collection';
  if (title === 'Deck Builder') return '/decks';
  if (title === 'Wishlist') return '/account/wishlist';
  if (title === 'Release Notifications') return '/account/notifications';
  return '/account';
}
