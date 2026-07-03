import type { CatalogueProduct, CatalogueProductDetail, Money, PaginationMeta } from '@tcg-hobby/types';
import type { HTMLAttributes, ReactNode } from 'react';
import { Button, buttonVariants } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { cn } from './lib/cn';

function formatMoney(value: Money, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
  }).format(value.amountMinor / 100);
}

export type PriceProps = HTMLAttributes<HTMLDivElement> & {
  value: Money;
  label?: string;
};

export function Price({ value, label, className, ...props }: PriceProps) {
  return (
    <div className={cn('flex items-baseline gap-2', className)} {...props}>
      {label ? <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span> : null}
      <span className="text-lg font-bold text-accent-soft">{formatMoney(value)}</span>
    </div>
  );
}

export type ProductCardProps = HTMLAttributes<HTMLDivElement> & {
  product: CatalogueProduct;
  href: string;
  actionSlot?: ReactNode;
};

export function ProductCard({ product, href, actionSlot, className, ...props }: ProductCardProps) {
  return (
    <Card className={cn('group h-full overflow-hidden transition-colors hover:border-accent/60', className)} {...props}>
      <CardContent className="flex h-full flex-col gap-4">
        <a className="flex h-full flex-col gap-4" href={href}>
          <div className="aspect-[5/4] rounded-md border border-surface-line bg-gradient-to-br from-surface-panel via-surface-ink to-accent/20 p-4 transition-transform group-hover:scale-[1.01]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={product.featured ? 'accent' : 'neutral'}>{product.featured ? 'Featured' : product.badge}</Badge>
                <Badge variant={product.inStock ? 'success' : 'warning'}>{product.inStock ? 'In stock' : 'Low stock'}</Badge>
              </div>
              <div className="self-start rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
                {product.imageLabel}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-neutral-400">{product.game}</p>
            <h3 className="min-h-14 text-lg font-bold leading-7 text-neutral-50">{product.name}</h3>
            <p className="line-clamp-3 text-sm leading-6 text-neutral-400">{product.description}</p>
          </div>
        </a>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">{product.categoryName}</p>
            <Price value={product.price} />
          </div>
          <div className="flex items-center gap-2">
            {actionSlot}
            <Button asChild size="sm" variant="secondary">
              <a href={href}>View</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)} {...props}>
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export type PaginationProps = HTMLAttributes<HTMLDivElement> & {
  meta: PaginationMeta;
  hrefForPage: (page: number) => string;
};

export function Pagination({ meta, hrefForPage, className, ...props }: PaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const start = Math.max(1, meta.page - 1);
  const end = Math.min(meta.totalPages, meta.page + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)} {...props}>
      <p className="text-sm text-neutral-400">
        Page {meta.page} of {meta.totalPages}
      </p>
      <div className="flex items-center gap-2">
        {meta.hasPreviousPage ? (
          <Button asChild size="sm" variant="outline">
            <a href={hrefForPage(meta.page - 1)}>Previous</a>
          </Button>
        ) : (
          <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'pointer-events-none opacity-50')}>
            Previous
          </span>
        )}
        {pages.map((page) => (
          <Button key={page} asChild size="sm" variant={page === meta.page ? 'primary' : 'outline'}>
            <a href={hrefForPage(page)} aria-current={page === meta.page ? 'page' : undefined}>
              {page}
            </a>
          </Button>
        ))}
        {meta.hasNextPage ? (
          <Button asChild size="sm" variant="outline">
            <a href={hrefForPage(meta.page + 1)}>Next</a>
          </Button>
        ) : (
          <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'pointer-events-none opacity-50')}>
            Next
          </span>
        )}
      </div>
    </div>
  );
}

export type ProductDetailHeroProps = HTMLAttributes<HTMLDivElement> & {
  product: CatalogueProductDetail;
  actionSlot?: ReactNode;
};

export function ProductDetailHero({ product, actionSlot, className, ...props }: ProductDetailHeroProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="grid gap-6 p-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-h-[420px] bg-[linear-gradient(135deg,#2a1710,#111113_55%,#29251d)] p-6">
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-black/15 p-6">
            <div className="flex items-center justify-between gap-4">
              <Badge variant="accent">{product.featured ? 'Featured' : product.badge}</Badge>
              <Badge variant={product.inStock ? 'success' : 'warning'}>{product.inStock ? 'In stock' : 'Limited'}</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">{product.imageLabel}</p>
              <h2 className="max-w-xl text-3xl font-black leading-tight text-neutral-50 sm:text-4xl">{product.name}</h2>
              <p className="max-w-2xl text-sm leading-6 text-neutral-300">{product.description}</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 p-6">
          <div>
            <p className="text-sm text-neutral-400">{product.game}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-neutral-50">{product.name}</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-400">{product.longDescription}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Category</p>
              <p className="mt-1 font-semibold text-neutral-50">{product.categoryName}</p>
            </div>
            <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Supplier</p>
              <p className="mt-1 font-semibold text-neutral-50">{product.supplierName}</p>
            </div>
            <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Condition</p>
              <p className="mt-1 font-semibold text-neutral-50">{product.condition}</p>
            </div>
            <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Available stock</p>
              <p className="mt-1 font-semibold text-neutral-50">{product.stockOnHand - product.reservedStock}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-line bg-surface-ink p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Price</p>
              <p className="text-2xl font-black text-accent-soft">{formatMoney(product.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              {actionSlot}
              <Button disabled>Add to cart</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
