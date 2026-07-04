import type { HTMLAttributes, ReactNode } from 'react';
import type { NotificationPreference, ProductReleaseStatus, ReleaseCalendarEntry, ReleaseProduct, ReleaseSummary } from '@tcg-hobby/types';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { CountdownTimer } from './release-countdown';
import { cn } from './lib/cn';

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatPriceLabel(limit: number | null | undefined, allocated: number | null | undefined) {
  if (limit == null || allocated == null) {
    return 'Allocation not set';
  }

  return `${Math.max(limit - allocated, 0)} of ${limit} remaining`;
}

export function PreorderBadge({ status, className }: { status: ProductReleaseStatus; className?: string }) {
  const tone = status === 'PREORDER' ? 'warning' : status === 'COMING_SOON' ? 'accent' : 'neutral';
  const label = status === 'PREORDER' ? 'Pre-order' : status === 'COMING_SOON' ? 'Coming soon' : 'Released';

  return (
    <Badge variant={tone} className={className}>
      {label}
    </Badge>
  );
}

export type AllocationIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  allocationLimit: number | null;
  allocatedQuantity: number;
  lowAllocationThreshold: number | null;
};

export function AllocationIndicator({ allocationLimit, allocatedQuantity, lowAllocationThreshold, className, ...props }: AllocationIndicatorProps) {
  const remaining = allocationLimit == null ? null : Math.max(allocationLimit - allocatedQuantity, 0);
  const percentage = allocationLimit ? Math.max(Math.min((allocatedQuantity / allocationLimit) * 100, 100), 0) : 0;
  const isLow = remaining != null && lowAllocationThreshold != null && remaining <= lowAllocationThreshold;

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-400">Allocation</span>
        <span className={cn('font-semibold', isLow ? 'text-warning' : 'text-neutral-50')}>
          {remaining == null ? 'Allocation not set' : formatPriceLabel(allocationLimit, allocatedQuantity)}
        </span>
      </div>
      {remaining != null ? (
        <div className="h-2 overflow-hidden rounded-full bg-surface-line">
          <div className={cn('h-full rounded-full bg-accent transition-all', isLow && 'bg-warning')} style={{ width: `${percentage}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export type NotifyButtonProps = {
  productId: string;
  subscribed: boolean;
  preference: NotificationPreference;
  action: (formData: FormData) => void | Promise<void>;
  returnTo: string;
  className?: string;
};

export function NotifyButton({ productId, subscribed, preference, action, returnTo, className }: NotifyButtonProps) {
  return (
    <form action={action} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="preference" value={preference} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant={subscribed ? 'outline' : 'secondary'}>
        {subscribed ? 'Notification saved' : 'Notify me'}
      </Button>
    </form>
  );
}

export type AnnouncementBannerProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  message: string;
  action?: ReactNode;
};

export function AnnouncementBanner({ title, message, action, className, ...props }: AnnouncementBannerProps) {
  return (
    <Card className={cn('border-accent/30 bg-accent/8', className)} {...props}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{title}</p>
          <p className="max-w-3xl text-sm leading-6 text-neutral-300">{message}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export type ReleaseHeroProps = HTMLAttributes<HTMLDivElement> & {
  release: ReleaseSummary;
  actionSlot?: ReactNode;
};

export function ReleaseHero({ release, actionSlot, className, ...props }: ReleaseHeroProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5 bg-[linear-gradient(135deg,#2a1710,#111113_55%,#29251d)] p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <PreorderBadge status={release.products[0]?.releaseStatus ?? 'COMING_SOON'} />
            {release.featuredOnHomepage ? <Badge variant="accent">Featured release</Badge> : null}
          </div>
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">{release.brand}</p>
            <h2 className="max-w-2xl text-3xl font-black leading-tight text-neutral-50 sm:text-5xl">{release.name}</h2>
            <p className="max-w-2xl text-sm leading-6 text-neutral-300">{release.announcementText}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Release date</p>
              <p className="mt-1 font-semibold text-neutral-50">{formatDate(release.releaseDate)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Dispatch</p>
              <p className="mt-1 font-semibold text-neutral-50">{formatDate(release.expectedDispatchAt)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Arrival</p>
              <p className="mt-1 font-semibold text-neutral-50">{formatDate(release.expectedArrivalAt)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <CountdownTimer targetDate={release.releaseDate} />
          <AllocationIndicator
            allocationLimit={release.products[0]?.allocationLimit ?? null}
            allocatedQuantity={release.products[0]?.allocatedQuantity ?? 0}
            lowAllocationThreshold={release.products[0]?.lowAllocationThreshold ?? null}
          />
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4 text-sm leading-6 text-neutral-300">
            <p className="font-semibold text-neutral-50">Launch notes</p>
            <p className="mt-2">{release.releaseNotes ?? 'The release timeline is being prepared for launch.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">{actionSlot}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export type ReleaseCardProps = HTMLAttributes<HTMLDivElement> & {
  release:
    | (ReleaseSummary & {
        brand?: string;
      })
    | (ReleaseProduct & {
        brand?: string;
        featuredOnHomepage?: boolean;
        products?: ReleaseProduct[];
        name?: string;
        announcementText?: string | null;
      })
    | (ReleaseCalendarEntry & {
        featuredOnHomepage?: boolean;
      });
  actionSlot?: ReactNode;
  showCountdown?: boolean;
};

export function ReleaseCard({ release, actionSlot, showCountdown = true, className, ...props }: ReleaseCardProps) {
  const primaryProduct = 'products' in release ? release.products[0] : release;
  const title = 'name' in release ? release.name : release.productName;
  const description = 'announcementText' in release ? release.announcementText : release.availabilityMessage;

  return (
    <Card className={cn('h-full overflow-hidden transition-colors hover:border-accent/50', className)} {...props}>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <PreorderBadge status={primaryProduct?.releaseStatus ?? 'COMING_SOON'} />
          <Badge variant={release.featuredOnHomepage ? 'accent' : 'neutral'}>{release.brand ?? primaryProduct?.supplierName ?? 'Release'}</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{release.game}</p>
          <h3 className="text-xl font-bold text-neutral-50">{title}</h3>
          <p className="text-sm leading-6 text-neutral-400">{description ?? primaryProduct?.availabilityMessage}</p>
        </div>
        {showCountdown ? <CountdownTimer targetDate={release.releaseDate ?? new Date().toISOString()} compact /> : null}
        <div className="space-y-2 text-sm text-neutral-400">
          <p>Release: <span className="text-neutral-50">{formatDate(release.releaseDate)}</span></p>
          <p>Dispatch: <span className="text-neutral-50">{formatDate(release.expectedDispatchAt)}</span></p>
          <p>Arrival: <span className="text-neutral-50">{formatDate(release.expectedArrivalAt)}</span></p>
        </div>
        {primaryProduct ? (
          <AllocationIndicator
            allocationLimit={primaryProduct.allocationLimit ?? null}
            allocatedQuantity={primaryProduct.allocatedQuantity ?? 0}
            lowAllocationThreshold={primaryProduct.lowAllocationThreshold ?? null}
          />
        ) : null}
        {actionSlot ? <div className="mt-auto">{actionSlot}</div> : null}
      </CardContent>
    </Card>
  );
}

export type ReleaseTimelineProps = HTMLAttributes<HTMLDivElement> & {
  releases: ReleaseCalendarEntry[];
};

export function ReleaseTimeline({ releases, className, ...props }: ReleaseTimelineProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {releases.map((release) => (
        <Card key={release.id}>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PreorderBadge status={release.products[0]?.releaseStatus ?? 'COMING_SOON'} />
                <Badge variant={release.featuredOnHomepage ? 'accent' : 'neutral'}>{release.brand}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-neutral-50">{release.name}</h3>
              <p className="text-sm text-neutral-400">{release.announcementText}</p>
            </div>
            <div className="text-sm text-neutral-400">
              <p className="font-semibold text-neutral-50">{formatDate(release.releaseDate)}</p>
              <p>{release.products.length} products</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
