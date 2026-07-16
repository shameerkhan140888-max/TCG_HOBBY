import React from 'react';
import { notFound } from 'next/navigation';
import { Badge, Breadcrumbs, Button, Container, ProductCard, Section, WishlistButton, NotifyButton } from '@tcg-hobby/ui';
import { formatMoney } from '@tcg-hobby/utils';
import { getCatalogueProductBySlug, getCustomerNotificationSubscriptions, getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../../../components/site-header';
import { ProductGallery } from '../../../components/product-gallery';
import { AddToCartButton, AddToCartWithQuantityForm } from '../../../components/cart-actions';
import { getCurrentCustomerSession } from '../../../lib/auth';
import { getProductContents } from '../../../lib/product-merchandising';
import { getSiteUrl } from '../../../lib/site';
import { toggleWishlistAction } from '../../../lib/wishlist';
import { toggleNotificationAction } from '../../../lib/release-actions';

export const dynamic = 'force-dynamic';

type ParamsValue = { slug: string };

function resolveStockState(availableQuantity: number): { label: string; tone: 'success' | 'warning'; helper: string } {
  if (availableQuantity <= 0) {
    return {
      label: 'OUT OF STOCK',
      tone: 'warning',
      helper: 'This product is not currently available to purchase.',
    };
  }

  if (availableQuantity <= 5) {
    return {
      label: 'LOW STOCK',
      tone: 'warning',
      helper: 'Available now while current stock lasts. Exact quantities are not shown online.',
    };
  }

  return {
    label: 'IN STOCK',
    tone: 'success',
    helper: 'Available for dispatch.',
  };
}

export async function generateMetadata({ params }: { params: Promise<ParamsValue> }) {
  const { slug } = await params;
  const product = await getCatalogueProductBySlug(slug);
  const siteUrl = getSiteUrl();

  if (!product) {
    return {
      title: 'Product not found | TCG Hobby',
    };
  }

  const title = `${product.name} | TCG Hobby`;
  const description = product.description;
  const canonical = new URL(`/catalogue/${product.slug}`, siteUrl).toString();
  const imageUrl = product.imageUrl ? new URL(product.imageUrl, siteUrl).toString() : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: product.imageAlt ?? product.name,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<ParamsValue> }) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    getCatalogueProductBySlug(slug),
    getCurrentCustomerSession(),
  ]);
  const wishlistIds = session?.user.role === 'CUSTOMER' ? await getWishlistProductIds(session.user.id) : [];
  const notificationIds =
    session?.user.role === 'CUSTOMER' ? (await getCustomerNotificationSubscriptions(session.user.id)).map((item) => item.productId) : [];

  if (!product) {
    notFound();
  }

  const currentHref = `/catalogue/${slug}`;
  const availableQuantity = Math.max(product.stockOnHand - product.reservedStock, 0);
  const maxPurchaseQuantity = Math.max(Math.min(availableQuantity, product.customerPurchaseLimit ?? availableQuantity), 0);
  const hasPurchaseLimit = Boolean(product.customerPurchaseLimit && product.customerPurchaseLimit > 0);
  const hasFreeDelivery = Boolean(product.freeUkStandardShipping);
  const stockState = resolveStockState(availableQuantity);
  const productContents = getProductContents(product.slug);
  const siteUrl = getSiteUrl();
  const relatedProducts = product.relatedProducts;
  const displayImages = product.images.length
    ? product.images
    : product.imageUrl
      ? [
          {
            id: `${product.id}-primary`,
            url: product.imageUrl,
            altText: product.imageAlt ?? product.name,
            imageType: 'primary',
            sortOrder: 1,
            isPrimary: true,
          },
        ]
      : [];
  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.game,
    },
    category: product.categoryName,
    ...(displayImages.length
      ? {
          image: displayImages.map((image) => new URL(image.url, siteUrl).toString()),
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: new URL(`/catalogue/${product.slug}`, siteUrl).toString(),
      priceCurrency: product.price.currency,
      price: (product.price.amountMinor / 100).toFixed(2),
      availability: availableQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  const productActions =
    product.releaseStatus && product.releaseStatus !== 'RELEASED' ? (
      session?.user.role === 'CUSTOMER' ? (
        <NotifyButton
          productId={product.id}
          subscribed={notificationIds.includes(product.id)}
          preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
          action={toggleNotificationAction}
          returnTo={currentHref}
        />
      ) : (
        <Button asChild size="lg" className="w-full">
          <a href={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}>Notify me</a>
        </Button>
      )
    ) : product.inStock ? (
      <AddToCartWithQuantityForm productId={product.id} returnTo={currentHref} maxQuantity={maxPurchaseQuantity} hideQuantity={maxPurchaseQuantity <= 1} />
    ) : (
      <Button disabled size="lg" className="w-full">
        Out of stock
      </Button>
    );

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }} />
        <Section className="border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.16),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_62%,#17120e_100%)] py-6 sm:py-8">
          <Container className="space-y-4">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Catalogue', href: '/catalogue' },
                { label: product.categoryName, href: `/catalogue?category=${product.categorySlug}` },
                { label: product.name },
              ]}
            />
          </Container>
        </Section>

        <Container className="py-8 sm:py-12 lg:py-14">
          <div className="mb-6 space-y-3 lg:hidden">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">{product.game}</p>
            <h1 className="text-3xl font-black leading-tight text-neutral-50">{product.name}</h1>
          </div>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:items-start">
            <ProductGallery images={displayImages} productName={product.name} />

            <aside className="min-w-0 lg:sticky lg:top-24">
              <div className="rounded-2xl bg-surface-base/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6">
                <div className="space-y-5">
                  <div className="space-y-3 lg:block">
                    <div className="hidden lg:block">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">{product.game}</p>
                      <h1 className="mt-2 text-3xl font-black leading-tight text-neutral-50 sm:text-4xl">{product.name}</h1>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Badge variant={stockState.tone}>{stockState.label}</Badge>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Price</p>
                        <p className="text-4xl font-black text-accent-soft">{formatMoney(product.price)}</p>
                        <p className="text-sm text-neutral-400">VAT included where applicable.</p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {productActions}
                        <WishlistButton
                          productId={product.id}
                          wishlisted={wishlistIds.includes(product.id)}
                          authenticated={session?.user.role === 'CUSTOMER'}
                          action={toggleWishlistAction}
                          loginHref={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}
                          returnTo={currentHref}
                        />
                      </div>
                    </div>
                  </div>

                  {hasFreeDelivery || hasPurchaseLimit ? (
                    <div className="space-y-3 rounded-xl bg-accent/10 p-4">
                      <div className="flex flex-wrap gap-2">
                        {hasFreeDelivery ? <Badge variant="success">FREE UK STANDARD DELIVERY</Badge> : null}
                        {hasPurchaseLimit ? <Badge variant="accent">LIMIT {product.customerPurchaseLimit} PER HOUSEHOLD</Badge> : null}
                      </div>
                      {hasPurchaseLimit ? <p className="text-sm font-semibold text-neutral-50">Limited to {product.customerPurchaseLimit} per person or household.</p> : null}
                      <p className="text-sm leading-6 text-neutral-300">
                        Orders exceeding this limit, including multiple orders to the same household, may be cancelled and refunded.
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-2 border-t border-surface-line/70 pt-4 text-xs text-neutral-400 sm:grid-cols-2">
                    {['Free UK Delivery', 'Dispatch within one working day', 'Secure Checkout', 'Official UK Product', 'Factory Sealed', 'Purchase limit applies'].map((item) => (
                      <p key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                        {item}
                      </p>
                    ))}
                  </div>

                  <a href="/delivery-returns" className="inline-flex text-sm font-semibold text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent">
                    View delivery and returns
                  </a>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-12 rounded-2xl bg-surface-base/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7" aria-labelledby="product-information-heading">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Product information</p>
              <h2 id="product-information-heading" className="mt-2 text-2xl font-black text-neutral-50">{product.name}</h2>
            </div>
            <div className="divide-y divide-surface-line/80">
              <details name="product-information" className="group py-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent">
                  Overview
                  <span className="text-accent transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="mt-4 max-w-3xl space-y-4 text-base leading-8 text-neutral-200 sm:text-lg sm:leading-9">
                  {product.longDescription.split('\n').filter(Boolean).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </details>

              <details name="product-information" className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent">
                  What&rsquo;s Included
                  <span className="text-accent transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                {productContents ? (
                  <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-300">
                    <ul className="space-y-2">
                      {productContents.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-accent" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {productContents.notice ? <p className="text-neutral-400">{productContents.notice}</p> : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-neutral-300">Detailed contents will be added after checking the packaging or authorised product data.</p>
                )}
              </details>

              <details name="product-information" className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent">
                  Delivery &amp; Returns
                  <span className="text-accent transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-300">
                  <p>{hasFreeDelivery ? 'Free UK standard delivery is included for this product.' : 'Delivery options and charges are shown before checkout.'}</p>
                  <p>Orders are normally dispatched within one working day.</p>
                  <p>Returns are handled in line with our customer information page.</p>
                  <a href="/delivery-returns" className="inline-flex font-semibold text-accent-soft underline decoration-accent/50 underline-offset-4 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent">
                    Read Delivery &amp; Returns
                  </a>
                </div>
              </details>

              <details name="product-information" className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent">
                  Purchase Limit
                  <span className="text-accent transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-300">
                  <p>{hasPurchaseLimit ? `Limited to ${product.customerPurchaseLimit} per person or household.` : 'No product-specific purchase limit is currently published for this item.'}</p>
                  {hasPurchaseLimit ? <p>Orders exceeding this limit, including multiple orders to the same household, may be cancelled and refunded.</p> : null}
                </div>
              </details>

            </div>
          </section>

          {relatedProducts.length ? (
          <Section className="pb-0 pt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Related products</p>
              <h2 className="mt-2 text-2xl font-bold">More in {product.categoryName}</h2>
            </div>
            <Button asChild variant="ghost">
              <a href={`/catalogue?category=${product.categorySlug}`}>Browse category</a>
            </Button>
          </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  href={`/catalogue/${item.slug}`}
                  actionSlot={
                    <div className="flex items-center gap-2">
                      {item.releaseStatus && item.releaseStatus !== 'RELEASED' ? (
                        session?.user.role === 'CUSTOMER' ? (
                          <NotifyButton
                            productId={item.id}
                            subscribed={notificationIds.includes(item.id)}
                            preference={item.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                            action={toggleNotificationAction}
                            returnTo={`/catalogue/${item.slug}`}
                          />
                        ) : (
                          <Button asChild size="sm" variant="secondary">
                            <a href={`/login?callbackUrl=${encodeURIComponent(`/catalogue/${item.slug}`)}`}>Notify me</a>
                          </Button>
                        )
                      ) : item.inStock ? (
                        <AddToCartButton productId={item.id} returnTo={`/catalogue/${item.slug}`} />
                      ) : (
                        <Button disabled size="sm">
                          Out of stock
                        </Button>
                      )}
                      <WishlistButton
                        productId={item.id}
                        wishlisted={wishlistIds.includes(item.id)}
                        authenticated={session?.user.role === 'CUSTOMER'}
                        action={toggleWishlistAction}
                        loginHref={`/login?callbackUrl=${encodeURIComponent(`/catalogue/${item.slug}`)}`}
                        returnTo={`/catalogue/${item.slug}`}
                      />
                    </div>
                  }
                />
              ))}
            </div>
        </Section>
          ) : null}
      </Container>
      </main>
    </>
  );
}
