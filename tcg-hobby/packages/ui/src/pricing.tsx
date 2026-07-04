import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import type { BuylistStatus, PricingSnapshot } from '@tcg-hobby/types';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { cn } from './lib/cn';

function formatMoney(amountMinor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amountMinor / 100);
}

export type PriceBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  amountMinor: number;
  currency?: string;
  tone?: 'accent' | 'neutral' | 'success' | 'warning' | 'outline';
};

export function PriceBadge({ label, amountMinor, currency = 'GBP', tone = 'neutral', className, ...props }: PriceBadgeProps) {
  return (
    <Badge variant={tone} className={cn('normal-case tracking-normal', className)} {...props}>
      {label}: {formatMoney(amountMinor, currency)}
    </Badge>
  );
}

export type MarginIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  marginMinor: number;
  marginPercent: number;
  markupPercent?: number;
};

export function MarginIndicator({ label = 'Margin', marginMinor, marginPercent, markupPercent, className, ...props }: MarginIndicatorProps) {
  return (
    <div className={cn('rounded-lg border border-surface-line bg-surface-ink px-4 py-3', className)} {...props}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-neutral-50">{formatMoney(marginMinor)}</p>
      <p className="text-sm text-neutral-400">
        {marginPercent}% margin{markupPercent !== undefined ? ` / ${markupPercent}% markup` : ''}
      </p>
    </div>
  );
}

export type BuylistStatusBadgeProps = {
  status: BuylistStatus;
};

export function BuylistStatusBadge({ status }: BuylistStatusBadgeProps) {
  const labelMap: Record<BuylistStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    RECEIVED: 'Received',
    UNDER_REVIEW: 'Under review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PAID: 'Paid',
  };

  const variantMap: Record<BuylistStatus, 'accent' | 'neutral' | 'success' | 'warning' | 'outline'> = {
    DRAFT: 'neutral',
    SUBMITTED: 'warning',
    RECEIVED: 'neutral',
    UNDER_REVIEW: 'accent',
    APPROVED: 'success',
    REJECTED: 'warning',
    PAID: 'success',
  };

  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}

export type RuleBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  ruleName: string;
  source: string;
  manualOverride?: boolean;
};

export function RuleBadge({ ruleName, source, manualOverride, className, ...props }: RuleBadgeProps) {
  return (
    <Badge variant={manualOverride ? 'accent' : 'outline'} className={cn('normal-case tracking-normal', className)} {...props}>
      {manualOverride ? 'Manual override' : ruleName || source}
    </Badge>
  );
}

export type PricingCardProps = HTMLAttributes<HTMLDivElement> & {
  snapshot: PricingSnapshot;
  title?: string;
  description?: string;
  actionSlot?: ReactNode;
  ruleName?: string | null;
};

export function PricingCard({ snapshot, title = 'Pricing', description, actionSlot, ruleName, className, ...props }: PricingCardProps) {
  const marginPercent = snapshot.retailMinor > 0 ? Math.round((snapshot.marginMinor / snapshot.retailMinor) * 100) : 0;

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm leading-6 text-neutral-400">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Retail</p>
            <p className="mt-1 text-lg font-bold text-neutral-50">{formatMoney(snapshot.retailMinor)}</p>
          </div>
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Buy</p>
            <p className="mt-1 text-lg font-bold text-accent-soft">{formatMoney(snapshot.buyMinor)}</p>
          </div>
          <MarginIndicator marginMinor={snapshot.marginMinor} marginPercent={marginPercent} markupPercent={snapshot.markupPercent} />
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Source</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <RuleBadge ruleName={ruleName ?? snapshot.priceSource} source={snapshot.priceSource} manualOverride={snapshot.manualOverride} />
              <Badge variant={snapshot.priceStatus === 'MANUAL_OVERRIDE' ? 'accent' : snapshot.priceStatus === 'ACTIVE' ? 'success' : 'warning'}>
                {snapshot.priceStatus}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
          <PriceBadge label="Cost" amountMinor={snapshot.costMinor} tone="neutral" />
          <PriceBadge label="Profit" amountMinor={snapshot.profitMinor} tone="accent" />
          <span>Updated {new Date(snapshot.updatedAt).toLocaleString('en-GB')}</span>
        </div>
        {actionSlot ? <div>{actionSlot}</div> : null}
      </CardContent>
    </Card>
  );
}

export type MoneyInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function MoneyInput({ label, className, ...props }: MoneyInputProps) {
  return (
    <label className="space-y-2 text-sm text-neutral-300">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <Input type="number" min={0} step={1} className={cn('font-medium tabular-nums', className)} {...props} />
    </label>
  );
}

export type EmptyPricingStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyPricingState({ title, description, action, className, ...props }: EmptyPricingStateProps) {
  return (
    <Card className={cn('border-dashed', className)} {...props}>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
          <p className="text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </CardContent>
    </Card>
  );
}
