import { notFound } from 'next/navigation';
import { Breadcrumbs, Button, Container, EmptyState, ProductCard, ProductDetailHero, Section, WishlistButton, NotifyButton } from '@tcg-hobby/ui';
import { getCatalogueCategories, getCatalogueProductBySlug, getCustomerNotificationSubscriptions, getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../../../components/site-header';
import { AddToCartButton, AddToCartWithQuantityForm } from '../../../components/cart-actions';
import { getCurrentCustomerSession } from '../../../lib/auth';
import { toggleWishlistAction } from '../../../lib/wishlist';
import { toggleNotificationAction } from '../../../lib/release-actions';

export const dynamic = 'force-dynamic';

type ParamsValue = { slug: string };

export async function generateMetadata({ params }: { params: Promise<ParamsValue> }) {
  const { slug } = await params;
  const product = await getCatalogueProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product not found | TCG Hobby',
    };
  }

  return {
    title: `${product.name} | TCG Hobby`,
    description: product.description,
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

  const categories = await getCatalogueCategories();
  const currentHref = `/catalogue/${slug}`;
  const availableQuantity = Math.max(product.stockOnHand - product.reservedStock, 0);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/70 py-8">
        <Container className="space-y-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Catalogue', href: '/catalogue' },
              { label: product.categoryName, href: `/catalogue?category=${product.categorySlug}` },
              { label: product.name },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Product detail</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{product.name}</h1>
            </div>
            <Button asChild variant="outline">
              <a href="/catalogue">Back to catalogue</a>
            </Button>
          </div>
        </Container>
      </Section>

      <Container className="py-8">
        <ProductDetailHero
          product={product}
          actionSlot={
            <div className="flex flex-wrap items-center gap-2">
              {session?.user.role === 'CUSTOMER' ? (
                product.releaseStatus && product.releaseStatus !== 'RELEASED' ? (
                  <NotifyButton
                    productId={product.id}
                    subscribed={notificationIds.includes(product.id)}
                    preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                    action={toggleNotificationAction}
                    returnTo={currentHref}
                  />
                ) : product.inStock ? (
                  <AddToCartWithQuantityForm productId={product.id} returnTo={currentHref} maxQuantity={availableQuantity} />
                ) : (
                  <Button disabled>Out of stock</Button>
                )
              ) : (
                <Button asChild>
                  <a href={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}>{product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'Notify me' : 'Add to cart'}</a>
                </Button>
              )}
              <WishlistButton
                productId={product.id}
                wishlisted={wishlistIds.includes(product.id)}
                authenticated={session?.user.role === 'CUSTOMER'}
                action={toggleWishlistAction}
                loginHref={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}
                returnTo={currentHref}
              />
            </div>
          }
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <a key={category.slug} href={`/catalogue?category=${category.slug}`} className="group block">
              <div className="rounded-lg border border-surface-line bg-surface-base p-5 transition-colors group-hover:border-accent/60">
                <p className="text-xs uppercase tracking-wide text-neutral-500">{category.productCount} products</p>
                <h2 className="mt-2 text-lg font-semibold text-neutral-50">{category.name}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{category.description}</p>
              </div>
            </a>
          ))}
        </div>

        <Section className="pb-0 pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Related products</p>
              <h2 className="mt-2 text-2xl font-bold">More in {product.categoryName}</h2>
            </div>
            <Button asChild variant="ghost">
              <a href={`/catalogue?category=${product.categorySlug}`}>Browse category</a>
            </Button>
          </div>
          {product.relatedProducts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {product.relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  href={`/catalogue/${item.slug}`}
                  actionSlot={
                    <div className="flex items-center gap-2">
                      {session?.user.role === 'CUSTOMER' ? (
                        item.releaseStatus && item.releaseStatus !== 'RELEASED' ? (
                          <NotifyButton
                            productId={item.id}
                            subscribed={notificationIds.includes(item.id)}
                            preference={item.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                            action={toggleNotificationAction}
                            returnTo={`/catalogue/${item.slug}`}
                          />
                        ) : item.inStock ? (
                          <AddToCartButton productId={item.id} returnTo={`/catalogue/${item.slug}`} />
                        ) : (
                          <Button disabled size="sm">
                            Out of stock
                          </Button>
                        )
                      ) : (
                        <Button asChild size="sm" variant="secondary">
                          <a href={`/login?callbackUrl=${encodeURIComponent(`/catalogue/${item.slug}`)}`}>{item.releaseStatus && item.releaseStatus !== 'RELEASED' ? 'Notify me' : 'Add to cart'}</a>
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
          ) : (
            <EmptyState
              title="No related products yet"
              description="This product is seeded, but its companion catalogue items are not available right now."
              action={
                <Button asChild>
                  <a href={`/catalogue?category=${product.categorySlug}`}>Browse category</a>
                </Button>
              }
            />
          )}
        </Section>
      </Container>
      </main>
    </>
  );
}
