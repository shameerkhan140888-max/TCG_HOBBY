import type { HTMLAttributes, ReactNode } from 'react';
import type { MarketTrend, NotificationType, WatchlistSubjectType } from '@tcg-hobby/types';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from './lib/cn';

function formatMoney(amountMinor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amountMinor / 100);
}

function trendLabel(trend: MarketTrend) {
  switch (trend) {
    case 'UP':
      return 'Trending up';
    case 'DOWN':
      return 'Trending down';
    case 'FLAT':
      return 'Stable';
    case 'VOLATILE':
      return 'Volatile';
    default:
      return trend;
  }
}

function trendTone(trend: MarketTrend): 'accent' | 'success' | 'warning' | 'neutral' {
  switch (trend) {
    case 'UP':
      return 'success';
    case 'DOWN':
      return 'warning';
    case 'VOLATILE':
      return 'warning';
    default:
      return 'neutral';
  }
}

function notificationLabel(notificationType: NotificationType) {
  switch (notificationType) {
    case 'PRICE_MOVEMENT':
      return 'Price movement';
    case 'UPCOMING_RELEASE':
      return 'Upcoming release';
    case 'WISHLIST_AVAILABILITY':
      return 'Wishlist availability';
    case 'COLLECTION_UPDATES':
      return 'Collection updates';
    case 'BUYLIST_UPDATES':
      return 'Buylist updates';
    default:
      return notificationType;
  }
}

export type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string;
  helper?: string;
};

export function StatTile({ label, value, helper, className, ...props }: StatTileProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-2xl font-black text-neutral-50">{value}</p>
        {helper ? <p className="text-sm text-neutral-400">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export type InsightCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  actionSlot?: ReactNode;
};

export function InsightCard({ title, description, actionSlot, className, ...props }: InsightCardProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardHeader className="space-y-2">
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm leading-6 text-neutral-400">{description}</p> : null}
      </CardHeader>
      {actionSlot ? <CardContent>{actionSlot}</CardContent> : null}
    </Card>
  );
}

export type TrendBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  trend: MarketTrend;
  label?: string;
};

export function TrendBadge({ trend, label, className, ...props }: TrendBadgeProps) {
  return (
    <Badge variant={trendTone(trend)} className={cn('normal-case tracking-normal', className)} {...props}>
      {label ?? trendLabel(trend)}
    </Badge>
  );
}

export type MarketValueProps = HTMLAttributes<HTMLDivElement> & {
  currentEstimateMinor: number;
  yesterdayMinor?: number;
  currency?: string;
  trend: MarketTrend;
  confidenceScore?: number;
};

export function MarketValue({ currentEstimateMinor, yesterdayMinor, currency = 'GBP', trend, confidenceScore, className, ...props }: MarketValueProps) {
  const deltaMinor = yesterdayMinor == null ? 0 : currentEstimateMinor - yesterdayMinor;
  const deltaPercent = yesterdayMinor && yesterdayMinor > 0 ? Math.round((deltaMinor / yesterdayMinor) * 100) : 0;

  return (
    <div className={cn('rounded-lg border border-surface-line bg-surface-ink p-4', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Approximate market value</p>
          <p className="text-2xl font-black text-neutral-50">{formatMoney(currentEstimateMinor, currency)}</p>
        </div>
        <TrendBadge trend={trend} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span>{deltaPercent >= 0 ? '+' : ''}{deltaPercent}% vs yesterday</span>
        {confidenceScore != null ? <span>Confidence {confidenceScore}%</span> : null}
      </div>
    </div>
  );
}

export type ValueSparklineProps = HTMLAttributes<HTMLDivElement> & {
  points: Array<{ label: string; valueMinor: number }>;
};

export function ValueSparkline({ points, className, ...props }: ValueSparklineProps) {
  const values = points.map((point) => point.valueMinor);
  const max = Math.max(...values, 1);

  return (
    <div className={cn('space-y-3', className)} {...props}>
      <div className="flex h-20 items-end gap-2">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t bg-gradient-to-t from-accent to-orange-300"
              style={{ height: `${Math.max(8, Math.round((point.valueMinor / max) * 100))}%` }}
            />
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">{point.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export type WatchButtonProps = {
  subjectType: WatchlistSubjectType;
  subjectKey: string;
  subjectLabel: string;
  watched: boolean;
  action: (formData: FormData) => void | Promise<void>;
  returnTo: string;
  notificationType?: NotificationType;
  className?: string;
};

export function WatchButton({ subjectType, subjectKey, subjectLabel, watched, action, returnTo, notificationType = 'PRICE_MOVEMENT', className }: WatchButtonProps) {
  return (
    <form action={action} className={className}>
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectKey" value={subjectKey} />
      <input type="hidden" name="subjectLabel" value={subjectLabel} />
      <input type="hidden" name="notificationType" value={notificationType} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant={watched ? 'outline' : 'secondary'}>
        {watched ? 'Unwatch' : 'Watch'}
      </Button>
    </form>
  );
}

export type NotificationPreferenceProps = HTMLAttributes<HTMLSpanElement> & {
  notificationType: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
};

export function NotificationPreference({ notificationType, emailEnabled, pushEnabled, inAppEnabled, className, ...props }: NotificationPreferenceProps) {
  const activeChannels = [emailEnabled ? 'Email' : null, pushEnabled ? 'Push' : null, inAppEnabled ? 'In-app' : null].filter(Boolean);

  return (
    <Badge variant="neutral" className={cn('normal-case tracking-normal', className)} {...props}>
      {notificationLabel(notificationType)} · {activeChannels.length ? activeChannels.join(' / ') : 'Disabled'}
    </Badge>
  );
}

export type CollectionHealthProps = HTMLAttributes<HTMLDivElement> & {
  score: number;
  label?: string;
};

export function CollectionHealth({ score, label = 'Collection health', className, ...props }: CollectionHealthProps) {
  const toned = score >= 80 ? 'success' : score >= 60 ? 'accent' : 'warning';

  return (
    <div className={cn('rounded-lg border border-surface-line bg-surface-ink p-4', className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-neutral-50">{score}/100</p>
        </div>
        <Badge variant={toned}>{toned === 'success' ? 'Healthy' : toned === 'accent' ? 'Steady' : 'Needs attention'}</Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-line">
        <div className={cn('h-full rounded-full', toned === 'warning' ? 'bg-warning' : 'bg-accent')} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}

export type PortfolioCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  currentEstimateMinor: number;
  previousEstimateMinor?: number;
  trend: MarketTrend;
  confidenceScore?: number;
  currency?: string;
  actionSlot?: ReactNode;
};

export function PortfolioCard({ title, currentEstimateMinor, previousEstimateMinor, trend, confidenceScore, currency = 'GBP', actionSlot, className, ...props }: PortfolioCardProps) {
  const deltaMinor = previousEstimateMinor == null ? 0 : currentEstimateMinor - previousEstimateMinor;

  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{title}</p>
            <p className="text-2xl font-black text-neutral-50">{formatMoney(currentEstimateMinor, currency)}</p>
          </div>
          <TrendBadge trend={trend} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
          <span>{deltaMinor >= 0 ? '+' : ''}{formatMoney(Math.abs(deltaMinor), currency)} vs previous</span>
          {confidenceScore != null ? <span>Confidence {confidenceScore}%</span> : null}
        </div>
        {actionSlot ? <div>{actionSlot}</div> : null}
      </CardContent>
    </Card>
  );
}
