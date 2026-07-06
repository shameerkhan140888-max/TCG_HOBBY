import type {
  CartLineItem as CartLineItemType,
  FulfilmentStatus,
  CatalogueProduct,
  CatalogueProductDetail,
  Money,
  OrderSummary as OrderSummaryType,
  PaginationMeta,
  PaymentStatus,
  ShippingMethod,
} from '@tcg-hobby/types';
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
  const releaseBadge =
    product.releaseStatus && product.releaseStatus !== 'RELEASED'
      ? product.releaseStatus === 'PREORDER'
        ? product.preorderBadgeLabel ?? 'Pre-order'
        : product.comingSoonBadgeLabel ?? 'Coming soon'
      : product.featured
        ? 'Featured'
        : product.badge;

  return (
    <Card className={cn('group h-full overflow-hidden transition-colors hover:border-accent/60', className)} {...props}>
      <CardContent className="flex h-full flex-col gap-4">
        <a className="flex h-full flex-col gap-4" href={href}>
          <div className="aspect-[5/4] rounded-md border border-surface-line bg-gradient-to-br from-surface-panel via-surface-ink to-accent/20 p-4 transition-transform group-hover:scale-[1.01]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'warning' : product.featured ? 'accent' : 'neutral'}>
                  {releaseBadge}
                </Badge>
                <Badge variant={product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'accent' : product.inStock ? 'success' : 'warning'}>
                  {product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'Release soon' : product.inStock ? 'In stock' : 'Low stock'}
                </Badge>
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
            {product.availabilityMessage ? <p className="text-xs leading-5 text-neutral-500">{product.availabilityMessage}</p> : null}
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
  const releaseBadge =
    product.releaseStatus && product.releaseStatus !== 'RELEASED'
      ? product.releaseStatus === 'PREORDER'
        ? product.preorderBadgeLabel ?? 'Pre-order'
        : product.comingSoonBadgeLabel ?? 'Coming soon'
      : product.featured
        ? 'Featured'
        : product.badge;

  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="grid gap-6 p-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-h-[420px] bg-[linear-gradient(135deg,#2a1710,#111113_55%,#29251d)] p-6">
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-black/15 p-6">
            <div className="flex items-center justify-between gap-4">
              <Badge variant={product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'warning' : 'accent'}>{releaseBadge}</Badge>
              <Badge variant={product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'accent' : product.inStock ? 'success' : 'warning'}>
                {product.releaseStatus && product.releaseStatus !== 'RELEASED' ? 'Release soon' : product.inStock ? 'In stock' : 'Limited'}
              </Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">{product.imageLabel}</p>
              <h2 className="max-w-xl text-3xl font-black leading-tight text-neutral-50 sm:text-4xl">{product.name}</h2>
              <p className="max-w-2xl text-sm leading-6 text-neutral-300">{product.description}</p>
              {product.availabilityMessage ? <p className="max-w-2xl text-sm leading-6 text-neutral-400">{product.availabilityMessage}</p> : null}
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
            {product.releaseDate ? (
              <div className="rounded-lg border border-surface-line bg-surface-ink p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Release date</p>
                <p className="mt-1 font-semibold text-neutral-50">{new Date(product.releaseDate).toLocaleDateString('en-GB')}</p>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-line bg-surface-ink p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Price</p>
              <p className="text-2xl font-black text-accent-soft">{formatMoney(product.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              {actionSlot}
              {actionSlot ? null : <Button disabled>Add to cart</Button>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type QuantitySelectorProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
};

export function QuantitySelector({
  name,
  value,
  min = 1,
  max,
  disabled,
  label = 'Quantity',
  className,
  ...props
}: QuantitySelectorProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={value}
        disabled={disabled}
        className="h-10 w-24 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

export type CartLineItemProps = HTMLAttributes<HTMLDivElement> & {
  item: CartLineItemType;
  actionSlot?: ReactNode;
};

export function CartLineItem({ item, actionSlot, className, ...props }: CartLineItemProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-50">{item.productName}</h3>
            <Badge variant={item.inStock ? 'success' : 'warning'}>{item.inStock ? 'In stock' : 'Limited'}</Badge>
          </div>
          <p className="text-sm text-neutral-400">{item.productSlug}</p>
          <p className="text-sm text-neutral-400">
            {item.quantity} x {formatMoney({ amountMinor: item.unitPriceMinor, currency: 'GBP' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Line total</p>
            <p className="text-lg font-bold text-accent-soft">{formatMoney({ amountMinor: item.totalMinor, currency: 'GBP' })}</p>
          </div>
          {actionSlot}
        </div>
      </CardContent>
    </Card>
  );
}

export type OrderSummaryProps = HTMLAttributes<HTMLDivElement> & {
  summary: Pick<OrderSummaryType, 'currency' | 'subtotalMinor' | 'shippingMinor' | 'taxMinor' | 'totalMinor'>;
  actionSlot?: ReactNode;
};

export function OrderSummary({ summary, actionSlot, className, ...props }: OrderSummaryProps) {
  const rows = [
    { label: 'Subtotal', value: summary.subtotalMinor },
    { label: 'Delivery', value: summary.shippingMinor },
    { label: 'VAT', value: summary.taxMinor },
  ];

  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">{row.label}</span>
              <span className="font-medium text-neutral-50">{formatMoney({ amountMinor: row.value, currency: summary.currency })}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-surface-line pt-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-neutral-300">Total</span>
            <span className="text-2xl font-black text-accent-soft">{formatMoney({ amountMinor: summary.totalMinor, currency: summary.currency })}</span>
          </div>
        </div>
        {actionSlot}
      </CardContent>
    </Card>
  );
}

export type CheckoutProgressStep = 'basket' | 'delivery' | 'payment' | 'confirmation';

export type CheckoutProgressProps = HTMLAttributes<HTMLDivElement> & {
  currentStep: CheckoutProgressStep;
};

const checkoutProgressSteps: Array<{
  key: CheckoutProgressStep;
  label: string;
  helper: string;
}> = [
  { key: 'basket', label: 'Basket', helper: 'Review items' },
  { key: 'delivery', label: 'Delivery', helper: 'Address and shipping' },
  { key: 'payment', label: 'Payment', helper: 'Stripe test mode' },
  { key: 'confirmation', label: 'Confirmation', helper: 'Order receipt' },
];

export function CheckoutProgress({ currentStep, className, ...props }: CheckoutProgressProps) {
  const currentIndex = checkoutProgressSteps.findIndex((step) => step.key === currentStep);

  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="p-4 sm:p-5">
        <ol className="grid gap-3 md:grid-cols-4">
          {checkoutProgressSteps.map((step, index) => {
            const isCurrent = step.key === currentStep;
            const isCompleted = currentIndex > index;

            return (
              <li
                key={step.key}
                className={cn(
                  'rounded-xl border px-4 py-3 transition-colors',
                  isCurrent
                    ? 'border-accent bg-accent/10'
                    : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-surface-line bg-surface-ink/70',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold',
                      isCurrent
                        ? 'bg-accent text-neutral-950'
                        : isCompleted
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'border border-surface-line bg-surface-base text-neutral-400',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">{step.label}</p>
                    <p className="mt-1 text-sm font-medium text-neutral-50">{step.helper}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export type CheckoutStepProps = HTMLAttributes<HTMLDivElement> & {
  number: string;
  title: string;
  description?: string;
};

export function CheckoutStep({ number, title, description, className, ...props }: CheckoutStepProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-accent/40 bg-accent/15 text-xs font-bold text-accent">{number}</span>
        <h3 className="text-base font-semibold text-neutral-50">{title}</h3>
      </div>
      {description ? <p className="text-sm leading-6 text-neutral-400">{description}</p> : null}
    </div>
  );
}

export type ShippingMethodCardProps = HTMLAttributes<HTMLLabelElement> & {
  method: ShippingMethod;
  name: string;
  checked?: boolean;
  disabled?: boolean;
};

export function ShippingMethodCard({ method, name, checked, disabled, className, ...props }: ShippingMethodCardProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
        checked ? 'border-accent bg-accent/10' : 'border-surface-line bg-surface-ink hover:border-accent/50',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
      {...props}
    >
      <input type="radio" name={name} value={method.code} defaultChecked={checked} disabled={disabled} className="mt-1" />
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-neutral-50">{method.name}</h4>
          <span className="text-sm font-semibold text-accent-soft">{formatMoney({ amountMinor: method.amountMinor, currency: method.currency })}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-neutral-400">{method.description}</p>
        <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">{method.etaLabel}</p>
      </div>
    </label>
  );
}

export type PaymentStatusBadgeProps = {
  status: PaymentStatus;
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const labelMap: Record<PaymentStatus, string> = {
    REQUIRES_PAYMENT: 'Requires payment',
    PROCESSING: 'Processing',
    SUCCEEDED: 'Paid',
    FAILED: 'Failed',
    CANCELED: 'Canceled',
    REFUNDED: 'Refunded',
  };

  const variantMap: Record<PaymentStatus, 'accent' | 'success' | 'warning' | 'neutral'> = {
    REQUIRES_PAYMENT: 'warning',
    PROCESSING: 'neutral',
    SUCCEEDED: 'success',
    FAILED: 'warning',
    CANCELED: 'neutral',
    REFUNDED: 'accent',
  };

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}

export type OrderStatusBadgeProps = {
  status: FulfilmentStatus;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const labelMap: Record<FulfilmentStatus, string> = {
    PENDING: 'Pending',
    PICKING: 'Picking',
    PACKED: 'Packed',
    SHIPPED: 'Shipped',
    CANCELLED: 'Cancelled',
  };

  const variantMap: Record<FulfilmentStatus, 'accent' | 'success' | 'warning' | 'neutral'> = {
    PENDING: 'warning',
    PICKING: 'neutral',
    PACKED: 'neutral',
    SHIPPED: 'success',
    CANCELLED: 'accent',
  };

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}

export function SecureCheckoutNotice() {
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm leading-6 text-neutral-200">
      Secure checkout is processed through Stripe test mode with PCI-compliant payment handling.
    </div>
  );
}
