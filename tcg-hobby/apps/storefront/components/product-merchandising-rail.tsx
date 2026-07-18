import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { MerchandisingRecommendation } from '@tcg-hobby/database';
import { Badge, Button, ProductImagePlaceholder, WishlistButton } from '@tcg-hobby/ui';
import { buildStorefrontProductPath, formatMoney } from '@tcg-hobby/utils';
import { toggleWishlistAction } from '../lib/wishlist';
import { AddToCartButton } from './cart-actions';
import { MerchandisingRailScroller } from './merchandising-rail-scroller';

export type ProductMerchandisingRailProps = {
  products: MerchandisingRecommendation[];
  eyebrow?: string;
  title?: string;
  description?: string;
  placement: 'PRODUCT_RELATED' | 'PRODUCT_ACCESSORIES' | 'HOMEPAGE_FEATURED' | 'HOMEPAGE_NEW_ARRIVALS';
  sourceProductId?: string;
  authenticated: boolean;
  wishlistProductIds: string[];
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

const STOCK_LABELS: Record<MerchandisingRecommendation['publicStockState'], { label: string; variant: 'success' | 'warning' }> = {
  IN_STOCK: { label: 'IN STOCK', variant: 'success' },
  LOW_STOCK: { label: 'LOW STOCK', variant: 'warning' },
  OUT_OF_STOCK: { label: 'OUT OF STOCK', variant: 'warning' },
};

export function ProductMerchandisingRail({
  products,
  eyebrow = 'Recommended',
  title = 'You may also like',
  description = 'More products selected for collectors like you.',
  placement,
  sourceProductId,
  authenticated,
  wishlistProductIds,
  actionHref = '/catalogue',
  actionLabel = 'View catalogue',
  className = 'mt-12',
}: ProductMerchandisingRailProps) {
  if (products.length === 0) {
    return null;
  }

  const headingId = `${placement.toLowerCase().replaceAll('_', '-')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;

  return (
    <section
      className={`${className} space-y-6`}
      aria-labelledby={headingId}
      data-merchandising-placement={placement}
      {...(sourceProductId ? { 'data-source-product-id': sourceProductId } : {})}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h2 id={headingId} className="mt-2 text-2xl font-black text-neutral-50">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        <Button asChild variant="ghost" className="w-fit">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>

      <MerchandisingRailScroller labelledBy={headingId}>
        {products.map((product, index) => (
          <RecommendationCard
            key={product.id}
            product={product}
            position={index + 1}
            placement={placement}
            authenticated={authenticated}
            wishlisted={wishlistProductIds.includes(product.id)}
          />
        ))}
      </MerchandisingRailScroller>
    </section>
  );
}

function RecommendationCard({
  product,
  position,
  placement,
  authenticated,
  wishlisted,
}: {
  product: MerchandisingRecommendation;
  position: number;
  placement: ProductMerchandisingRailProps['placement'];
  authenticated: boolean;
  wishlisted: boolean;
}) {
  const href = buildStorefrontProductPath(product.slug);
  const stock = STOCK_LABELS[product.publicStockState];

  return (
    <article
      role="listitem"
      className="group flex w-[82vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-surface-base/90 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(255,122,26,0.16)] focus-within:shadow-[0_22px_56px_rgba(255,122,26,0.16)] sm:w-[21rem] lg:w-[calc((100%_-_1.5rem)_/_2)] xl:w-[calc((100%_-_3rem)_/_4)] 2xl:w-[calc((100%_-_4rem)_/_5)]"
      data-recommended-product-id={product.id}
      data-recommendation-position={position}
      data-recommendation-strategy={product.strategyId}
      data-merchandising-placement={placement}
    >
      <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-ink" aria-label={`View ${product.name}`}>
        <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_center,rgba(255,122,26,0.12),transparent_56%),#111114] p-5">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt ?? product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 21rem, 82vw"
              className="object-contain p-5 transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <ProductImagePlaceholder label="Product image unavailable" compact />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{product.gameLabel}</p>
          <h3 className="line-clamp-2 min-h-[3.5rem] text-base font-black leading-7 text-neutral-50">
            <Link href={href} className="hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
              {product.name}
            </Link>
          </h3>
          <p className="text-sm text-neutral-400">{product.categoryLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={stock.variant}>{stock.label}</Badge>
          {product.freeUkStandardShipping ? <Badge variant="success">FREE UK DELIVERY</Badge> : null}
          {product.customerPurchaseLimit ? <Badge variant="accent">LIMIT {product.customerPurchaseLimit}</Badge> : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <p className="text-2xl font-black text-accent-soft">{formatMoney(product.price)}</p>
          <WishlistButton
            productId={product.id}
            wishlisted={wishlisted}
            authenticated={authenticated}
            action={toggleWishlistAction}
            loginHref={`/login?callbackUrl=${encodeURIComponent(href)}`}
            returnTo={href}
          />
        </div>

        {product.basketEligible ? (
          <AddToCartButton productId={product.id} returnTo={href} />
        ) : (
          <Button disabled size="sm" className="w-full">
            Unavailable
          </Button>
        )}
      </div>
    </article>
  );
}
