import React from 'react';
import { Button, Container, EmptyState, Input, Pagination, ProductCard, WishlistButton, NotifyButton } from '@tcg-hobby/ui';
import { getCatalogueMasterDataOptions, getCatalogueProducts, getCustomerNotificationSubscriptions, getWishlistProductIds } from '@tcg-hobby/database';
import type { CatalogueSort } from '@tcg-hobby/types';
import { buildStorefrontProductPath } from '@tcg-hobby/utils';
import { SiteHeader } from '../../components/site-header';
import { AddToCartButton } from '../../components/cart-actions';
import { getCurrentCustomerSession } from '../../lib/auth';
import { toggleWishlistAction } from '../../lib/wishlist';
import { toggleNotificationAction } from '../../lib/release-actions';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

const pageSize = 10;
const emptyMasterData = {
  games: [],
  brands: [],
  productTypes: [],
  languages: [],
  sets: [],
  categories: [],
};

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

function createHref(params: {
  search: string;
  category: string;
  game: string;
  productType: string;
  set: string;
  language: string;
  sort: CatalogueSort;
  page: number;
}) {
  const query = new URLSearchParams();

  if (params.search) query.set('q', params.search);
  if (params.category) query.set('category', params.category);
  if (params.game) query.set('game', params.game);
  if (params.productType) query.set('productType', params.productType);
  if (params.set) query.set('set', params.set);
  if (params.language) query.set('language', params.language);
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
  const game = asString(params.game);
  const productType = asString(params.productType);
  const set = asString(params.set);
  const language = asString(params.language);
  const sort = asSort(asString(params.sort));
  const page = Math.max(Number(asString(params.page) || '1') || 1, 1);
  const currentHref = createHref({ search, category, game, productType, set, language, sort, page });

  const [data, session, masterData] = await Promise.all([
    getCatalogueProducts({
      search,
      category,
      game,
      productType,
      set,
      language,
      sort,
      page,
      pageSize,
    }),
    getCurrentCustomerSession(),
    getCatalogueMasterDataOptions().catch(() => emptyMasterData),
  ]);
  const wishlistIds = session?.user.role === 'CUSTOMER' ? await getWishlistProductIds(session.user.id) : [];
  const notificationIds =
    session?.user.role === 'CUSTOMER' ? (await getCustomerNotificationSubscriptions(session.user.id)).map((item) => item.productId) : [];
  const selectedGameRecord = masterData.games.find((item) => item.slug === game);

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
              Search the current TCG Hobby catalogue, switch categories, sort results, and page through the available assortment.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-8">
        <form className="grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[minmax(18rem,1fr)_repeat(5,minmax(8.75rem,0.5fr))_minmax(8rem,0.42fr)]">
          <Input name="q" defaultValue={search} placeholder="Search cards, sealed product, accessories, or events" />
          <select
            name="game"
            defaultValue={game}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
            aria-label="Filter by game"
          >
            <option value="">All games</option>
            {masterData.games.filter((item) => item.active).map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <select
            name="productType"
            defaultValue={productType}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
            aria-label="Filter by product type"
          >
            <option value="">All types</option>
            {masterData.productTypes.filter((item) => item.active).map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <select
            name="set"
            defaultValue={set}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
            aria-label="Filter by set"
          >
            <option value="">All sets</option>
            {masterData.sets.filter((item) => item.active && (!selectedGameRecord || item.gameId === selectedGameRecord.id)).map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <select
            name="language"
            defaultValue={language}
            className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
            aria-label="Filter by language"
          >
            <option value="">All languages</option>
            {masterData.languages.filter((item) => item.active).map((item) => (
              <option key={item.id} value={item.code ?? item.slug}>{item.name}</option>
            ))}
          </select>
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

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-400">
              {data.pagination.totalItems} products found{search ? ` for "${search}"` : ''}
            </p>
            {[category, game, productType, set, language].some(Boolean) ? (
              <p className="mt-1 text-sm text-neutral-500">Filters applied. Use reset to browse everything.</p>
            ) : null}
          </div>
          <Button asChild variant="ghost">
            <a href="/catalogue">Reset filters</a>
          </Button>
        </div>

        {data.products.length ? (
          <>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-6">
              {data.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  href={buildStorefrontProductPath(product.slug)}
                  actionSlot={
                    <div className="flex items-center gap-2">
                      {product.releaseStatus && product.releaseStatus !== 'RELEASED' ? (
                        session?.user.role === 'CUSTOMER' ? (
                          <NotifyButton
                            productId={product.id}
                            subscribed={notificationIds.includes(product.id)}
                            preference={product.releaseStatus === 'PREORDER' ? 'PREORDER' : 'RELEASE'}
                            action={toggleNotificationAction}
                            returnTo={currentHref}
                          />
                        ) : (
                          <Button asChild size="sm" variant="secondary">
                            <a href={`/login?callbackUrl=${encodeURIComponent(currentHref)}`}>Notify me</a>
                          </Button>
                        )
                      ) : (
                        product.inStock ? (
                          <AddToCartButton productId={product.id} returnTo={currentHref} />
                        ) : (
                          <Button disabled size="sm">
                            Out of stock
                          </Button>
                        )
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
              <Pagination meta={data.pagination} hrefForPage={(nextPage) => createHref({ search, category, game, productType, set, language, sort, page: nextPage })} />
            </div>
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No products match those filters"
              description="Try a different search term or open another category."
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
