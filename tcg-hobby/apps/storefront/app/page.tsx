import { Badge, Button, Card, CardContent, Container, PageShell, ProductCard, Price, Section, WishlistButton } from '@tcg-hobby/ui';
import { getCatalogueHomeData } from '@tcg-hobby/database';
import { getWishlistProductIds } from '@tcg-hobby/database';
import { SiteHeader } from '../components/site-header';
import { getCurrentCustomerSession } from '../lib/auth';
import { toggleWishlistAction } from '../lib/wishlist';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [homeData, session] = await Promise.all([
    getCatalogueHomeData(),
    getCurrentCustomerSession(),
  ]);
  const wishlistIds = session?.user.role === 'CUSTOMER' ? await getWishlistProductIds(session.user.id) : [];
  const { categories, featuredProducts } = homeData;
  const heroProduct = featuredProducts[0];

  return (
    <PageShell>
      <SiteHeader />

      <main>
        <Section className="overflow-hidden border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.18),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_55%,#17120e_100%)] py-14 sm:py-20">
          <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl space-y-7">
              <Badge variant="accent">Premium dark commerce for TCG retailers</Badge>
              <div className="space-y-5">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
                  Cards, sealed product, events, and player tools in one polished storefront.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  Browse featured products, manage wishlists, prepare decks, submit buylists, and register for tournaments with a fast retail experience built for collectors and players.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="/catalogue">Browse catalogue</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/catalogue?category=events">View events</a>
                </Button>
              </div>
            </div>

            {heroProduct ? (
              <Card className="shadow-glow">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] rounded-t-lg bg-[linear-gradient(135deg,#2a1710,#111113_55%,#29251d)] p-5">
                    <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-black/15 p-6">
                      <div className="flex items-center justify-between gap-4">
                        <Badge variant="accent">{heroProduct.featured ? 'Featured' : heroProduct.badge}</Badge>
                        <Badge variant={heroProduct.inStock ? 'success' : 'warning'}>{heroProduct.inStock ? 'In stock' : 'Low stock'}</Badge>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">{heroProduct.imageLabel}</p>
                        <h2 className="max-w-xl text-3xl font-black leading-tight text-neutral-50">{heroProduct.name}</h2>
                        <p className="max-w-2xl text-sm leading-6 text-neutral-300">{heroProduct.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-neutral-400">Price</p>
                      <Price value={heroProduct.price} />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-400">Stock</p>
                      <p className="text-lg font-bold text-neutral-50">{heroProduct.stockOnHand - heroProduct.reservedStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-400">Supplier</p>
                      <p className="text-lg font-bold text-neutral-50">{heroProduct.supplierName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </Container>
        </Section>

        <Section id="catalogue">
          <Container>
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Featured categories</p>
                <h2 className="mt-2 text-3xl font-bold">Shop by hobby workflow</h2>
              </div>
              <Button variant="ghost" asChild>
                <a href="/catalogue">View all categories</a>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <a key={category.id} href={`/catalogue?category=${category.slug}`} className="group block">
                  <Card className="h-full transition-colors hover:border-accent/60">
                    <CardContent className="space-y-4">
                      <Badge variant="outline">{category.productCount} products</Badge>
                      <div>
                        <h3 className="text-xl font-bold">{category.name}</h3>
                        <p className="mt-3 text-sm leading-6 text-neutral-400">{category.description}</p>
                      </div>
                      <p className="text-sm text-accent-soft transition-colors group-hover:text-accent">Browse category</p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </Container>
        </Section>

        <Section className="border-t border-surface-line bg-surface-base" id="featured-products">
          <Container>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Featured products</p>
                <h2 className="mt-2 text-3xl font-bold">Retail-ready product cards</h2>
              </div>
              <Button asChild variant="outline">
                <a href="/catalogue">Open catalogue</a>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  href={`/catalogue/${product.slug}`}
                  actionSlot={
                    <WishlistButton
                      productId={product.id}
                      wishlisted={wishlistIds.includes(product.id)}
                      authenticated={session?.user.role === 'CUSTOMER'}
                      action={toggleWishlistAction}
                      loginHref={`/login?callbackUrl=${encodeURIComponent('/')}`}
                      returnTo="/"
                    />
                  }
                />
              ))}
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
