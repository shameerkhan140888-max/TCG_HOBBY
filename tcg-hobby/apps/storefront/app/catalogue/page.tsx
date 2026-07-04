import { Button, Container, EmptyState, Input, Pagination, ProductCard, WishlistButton, NotifyButton } from '@tcg-hobby/ui';
import { getCatalogueProducts, getCustomerNotificationSubscriptions, getWishlistProductIds } from '@tcg-hobby/database';
import type { CatalogueSort } from '@tcg-hobby/types';
import { SiteHeader } from '../../components/site-header';
import { AddToCartButton } from '../../components/cart-actions';
import { getCurrentCustomerSession } from '../../lib/auth';
import { toggleWishlistAction } from '../../lib/wishlist';
import { toggleNotificationAction } from '../../lib/release-actions';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

const pageSize = 4;

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function asSort(value: string | undefined): CatalogueSort {
  if (value === 'price-asc' || value === 'price-desc' || value === 'newest') {
    return value;
  }

  return 'featured';
}

function createHref(params: { search: string; category: string; sort: CatalogueSort; page: number }) {
  const query = new URLSearchParams();

  if (params.search) query.set('q', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort !== 'featured') query.set('sort', params.sort);
  if (params.page > 1) query.set('page', String(params.page));

  const queryString = query.toString();
  return queryString ? `/catalogue?${queryString}` : '/catalogue';
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsValue>;
}) {
  const params = (await searchParams) ?? {};
  const search = asString(params.q);
  const category = asString(params.category);
  const sort = asSort(asString(params.sort));
  const page = Math.max(Number(asString(params.page) || '1') || 1, 1);
  const currentHref = createHref({ search, category, sort, page });

  const [data, session] = await Promise.all([
    getCatalogueProducts({
      search,
      category,
      sort,
      page,
      pageSize,
    }),
    getCurrentCustomerSession(),
  ]);
  const wishlistIds = session?.user.role === 'CUSTOMER' ? await getWishlistProductIds(session.user.id) : [];
  const notificationIds =
    session?.user.role === 'CUSTOMER' ? (await getCustomerNotificationSubscriptions(session.user.id)).map((item) => item.productId) : [];

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <section className="border-b border-surface-line bg-surface-base/80">
        <Container className="py-8 sm:py-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Catalogue</p>
            <h1 className="text-3xl font-black sm:text-4xl">Browse products with search and filters</h1>
            <p className="max-w-3xl text-sm leading-6 text-neutral-400">
              Search the seeded commerce catalogue, switch categories, sort results, and page through the current stock assortment.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[1fr_220px_140px]">
          <Input name="q" defaultValue={search} placeholder="Search cards, sealed product, accessories, or events" />
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
          >
            <option value="featured">Featured first</option>
            <option value="newest">Newest first</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
          <Button type="submit">Search</Button>
          <input type="hidden" name="category" value={category} />
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={category ? 'outline' : 'primary'}>
            <a href={createHref({ search, category: '', sort, page: 1 })}>All</a>
          </Button>
          {data.categories.map((item) => (
            <Button key={item.slug} asChild size="sm" variant={category === item.slug ? 'primary' : 'outline'}>
              <a href={createHref({ search, category: item.slug, sort, page: 1 })}>{item.name}</a>
            </Button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">
              {data.pagination.totalItems} products found{search ? ` for "${search}"` : ''}
            </p>
            {category ? <p className="mt-1 text-sm text-neutral-500">Filtered by category: {category}</p> : null}
          </div>
          <Button asChild variant="ghost">
            <a href="/catalogue">Reset filters</a>
          </Button>
        </div>

        {data.products.length ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  href={`/catalogue/${product.slug}`}
                  actionSlot={
                    <div className="flex items-center gap-2">
                      {session?.user.role === 'CUSTOMER' ? (
                        product.releaseStatus && product.releaseStatus !== 'RELEASED' ? (
                          <NotifyButton
                            productId={product.id}
                            subscribed={notificationIds.includes(product.id)}
                            preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                            action={toggleNotificationAction}
                            returnTo={currentHref}
                          />
                        ) : (
                          <AddToCartButton productId={product.id} returnTo={currentHref} />
                        )
                      ) : (
                        <Button asChild size="sm" variant="secondary">
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
              ))}
            </div>
            <div className="mt-8">
              <Pagination meta={data.pagination} hrefForPage={(nextPage) => createHref({ search, category, sort, page: nextPage })} />
            </div>
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No products match those filters"
              description="Try a different search term or open another category. The seeded catalogue has plenty more to browse."
              action={
                <Button asChild>
                  <a href="/catalogue">Clear search</a>
                </Button>
              }
            />
          </div>
        )}
      </Container>
      </main>
    </>
  );
}
