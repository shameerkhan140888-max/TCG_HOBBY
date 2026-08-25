import {
  getIronSprueAdminDashboard,
  getIronSprueAdminReferenceData,
  getIronSprueAdminStorefrontControls,
  getIronSprueAdminWorkspaceCards,
  IRON_SPRUE_HERO_MERCHANDISING_BADGES,
  IRON_SPRUE_TYPOGRAPHY_OPTIONS,
  IRON_SPRUE_COURIERS,
  isIronSprueDisplayableImageAsset,
  isIronSprueStorefrontContentReviewField,
  listIronSprueAdminContentReviews,
  listIronSprueAdminInventory,
  listIronSprueAdminMediaAssets,
  listIronSprueAdminOrders,
  listIronSprueAdminProducts,
} from '@tcg-hobby/database';
import { Button, Card, CardContent, Container, PageHeader, Section, StatusBadge } from '@tcg-hobby/ui';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { IronSprueAdminDatabaseUnavailable, isIronSprueAdminDatabaseUnavailable } from './iron-sprue-admin-database-unavailable';
import {
  adjustIronSprueStockAction,
  cancelIronSprueOrderAction,
  processIronSprueReturnAction,
  receiveIronSprueStockAction,
  resolveIronSprueCustomerRequestAction,
  resendIronSprueOrderEmailAction,
  saveIronSprueTypographySettingsAction,
  saveIronSprueOrderNotesAction,
  saveIronSprueDiscountCodeAction,
  saveIronSprueHeroAction,
  saveIronSprueFeaturedProductPlacementAction,
  saveIronSprueHomepagePlacementAction,
  saveIronSprueHomepageProductSectionAction,
  saveIronSprueSpecialOfferAction,
  updateIronSprueCategoryControlsAction,
  updateIronSprueBrandControlsAction,
  updateIronSprueContentReviewAction,
  updateIronSprueMediaApprovalAction,
  updateIronSprueOrderFulfilmentAction,
  updateIronSprueProductFlagsAction,
  updateIronSpruePublicationStateAction,
  approveIronSprueProductReviewAction,
  attachIronSprueExistingR2MediaAction,
  reconcileIronSprueExistingR2MediaAction,
  uploadIronSprueProductMediaAction,
  bulkApproveIronSprueContentReviewsAction,
  bulkApproveIronSprueMediaAction,
  bulkPublishIronSprueProductsAction,
  createIronSprueManualOrderAction,
  publishIronSprueProductAction,
} from '../lib/iron-sprue-admin-actions.server';
import { ironSprueAdminPreviewUrl, listIronSprueR2Objects } from '../lib/iron-sprue-media-storage.server';
import { IronSprueBulkApprovalControls } from './iron-sprue-bulk-approval-controls';

type SearchParams = Record<string, string | string[] | undefined>;

function money(value: number | null | undefined, currency = 'GBP') {
  if (value == null) return 'Not set';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

function date(value: Date | string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ironSprueMediaPreviewUrl(asset: { url: string | null; storageKey: string | null; mimeType?: string | null }) {
  if (!isIronSprueDisplayableImageAsset(asset)) return null;
  return ironSprueAdminPreviewUrl(asset.url, asset.storageKey);
}

function StatePill({ children }: { children: string }) {
  const value = children.toUpperCase();
  const tone = value === 'APPROVED' || value === 'READY' || value === 'READY_TO_PUBLISH' || value === 'PUBLISHED' || value === 'ACTIVE' || value === 'PRIMARY'
    ? 'success'
    : value === 'FAILED' || value === 'REJECTED' || value === 'CONFLICT'
      ? 'warning'
      : value === 'REVIEW_REQUIRED'
        ? 'accent'
        : 'neutral';
  return <StatusBadge tone={tone}>{children}</StatusBadge>;
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-surface-line bg-surface-ink p-4 text-sm text-neutral-400">{children}</p>;
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function AdminDisclosure({
  children,
  defaultOpen = false,
  summary,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  summary: ReactNode;
}) {
  return (
    <details open={defaultOpen || undefined} className="group rounded-md border border-surface-line bg-surface-ink">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-neutral-100 outline-none focus:ring-2 focus:ring-accent">
        <span>{summary}</span>
        <span className="text-xs uppercase tracking-wide text-accent group-open:hidden">Open</span>
        <span className="hidden text-xs uppercase tracking-wide text-accent group-open:inline">Close</span>
      </summary>
      <div className="border-t border-surface-line p-4">{children}</div>
    </details>
  );
}

function param(searchParams: SearchParams | undefined, name: string) {
  const value = searchParams?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function StatusMessage({ searchParams }: { searchParams?: SearchParams }) {
  const saved = param(searchParams, 'saved');
  const error = param(searchParams, 'error');
  const message = error ?? saved;
  if (!message) return null;

  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm font-semibold ${
        error
          ? 'border-red-500/40 bg-red-950/40 text-red-100'
          : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
      }`}
      role={error ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

const fieldClass = 'rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-100';
const compactSecondaryButtonClass = 'rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm font-bold text-neutral-100 transition hover:border-brand-gold';

type FullReviewMode = 'pending' | 'approved' | 'rejected' | 'all';

function fullReviewModeFromSearch(searchParams: SearchParams | undefined): FullReviewMode {
  const status = param(searchParams, 'status');
  if (status === 'approved' || status === 'rejected' || status === 'all') return status;
  return 'pending';
}

function ReviewTabs({
  baseHref,
  pendingCount,
  approvedCount,
  rejectedCount = 0,
  allCount,
  mode,
}: {
  baseHref: string;
  pendingCount: number;
  approvedCount: number;
  rejectedCount?: number;
  allCount?: number;
  mode: FullReviewMode;
}) {
  const tabs = [
    { key: 'pending' as const, href: baseHref, label: 'Approval Required', count: pendingCount, activeClass: 'border-accent bg-accent/20 text-accent' },
    { key: 'approved' as const, href: `${baseHref}?status=approved`, label: 'Approved', count: approvedCount, activeClass: 'border-emerald-500 bg-emerald-950/30 text-emerald-200' },
    { key: 'rejected' as const, href: `${baseHref}?status=rejected`, label: 'Rejected', count: rejectedCount, activeClass: 'border-red-500 bg-red-950/30 text-red-100' },
    ...(typeof allCount === 'number' ? [{ key: 'all' as const, href: `${baseHref}?status=all`, label: 'All', count: allCount, activeClass: 'border-neutral-400 bg-neutral-900 text-neutral-100' }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Review status">
      {tabs.map((tab) => (
        <a
          key={tab.key}
          href={tab.href}
          aria-current={mode === tab.key ? 'page' : undefined}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${mode === tab.key ? tab.activeClass : 'border-surface-line text-neutral-300'}`}
        >
          {tab.label} ({tab.count})
        </a>
      ))}
    </div>
  );
}

function reviewableIronSprueMediaAssets(media: Awaited<ReturnType<typeof listIronSprueAdminMediaAssets>>, mode: FullReviewMode) {
  const currentByProductStage = new Map<string, (typeof media)[number]>();
  const rank = (asset: (typeof media)[number]) => {
    if (asset.approvalState === 'APPROVED' && asset.isPrimary) return 0;
    if (asset.approvalState === 'APPROVED') return 1;
    if (asset.approvalState === 'REVIEW_REQUIRED') return 2;
    if (asset.approvalState === 'PENDING') return 3;
    return 4;
  };

  for (const asset of media) {
    if (asset.approvalState === 'FAILED') continue;
    if (mode === 'pending' && !['REVIEW_REQUIRED', 'PENDING'].includes(asset.approvalState)) continue;
    if (mode === 'approved' && asset.approvalState !== 'APPROVED') continue;
    if (mode === 'rejected' && asset.approvalState !== 'REJECTED') continue;
    const key = `${asset.product?.id ?? asset.id}:${asset.role}`;
    const current = currentByProductStage.get(key);
    if (!current || rank(asset) < rank(current) || (rank(asset) === rank(current) && asset.updatedAt > current.updatedAt)) {
      currentByProductStage.set(key, asset);
    }
  }

  const roleOrder = new Map([
    ['catalogue-primary', 0],
    ['workshop-photography', 1],
    ['manufacturer-original', 2],
    ['completed-result', 3],
  ]);

  return [...currentByProductStage.values()].sort((left, right) => {
    const leftRole = roleOrder.get(left.role) ?? 99;
    const rightRole = roleOrder.get(right.role) ?? 99;
    return leftRole - rightRole || left.product?.sku.localeCompare(right.product?.sku ?? '') || left.updatedAt.getTime() - right.updatedAt.getTime();
  });
}

function bestMediaForRole(media: Awaited<ReturnType<typeof listIronSprueAdminMediaAssets>>, productId: string | undefined, role: string, mode: FullReviewMode) {
  const stateRank = (asset: (typeof media)[number]) => {
    if (asset.approvalState === 'APPROVED' && asset.isPrimary) return 0;
    if (asset.approvalState === 'APPROVED') return 1;
    if (asset.approvalState === 'REVIEW_REQUIRED') return 2;
    if (asset.approvalState === 'PENDING') return 3;
    return 4;
  };

  return media
    .filter((asset) => {
      if (asset.product?.id !== productId || asset.role !== role || asset.approvalState === 'FAILED') return false;
      if (mode === 'pending') return ['REVIEW_REQUIRED', 'PENDING'].includes(asset.approvalState);
      if (mode === 'approved') return asset.approvalState === 'APPROVED';
      if (mode === 'rejected') return asset.approvalState === 'REJECTED';
      return true;
    })
    .sort((left, right) => stateRank(left) - stateRank(right) || right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
}

function groupMediaByProduct(
  visibleMedia: ReturnType<typeof reviewableIronSprueMediaAssets>,
  allMedia: Awaited<ReturnType<typeof listIronSprueAdminMediaAssets>>,
  mode: FullReviewMode,
) {
  const groups = new Map<string, { product: (typeof visibleMedia)[number]['product']; assets: typeof visibleMedia }>();

  for (const asset of visibleMedia) {
    const key = asset.product?.id ?? `unassigned:${asset.id}`;
    const group = groups.get(key) ?? { product: asset.product, assets: [] };
    if (mode === 'all') {
      for (const role of ['catalogue-primary', 'workshop-photography', 'manufacturer-original', 'completed-result'] as const) {
        const roleAsset = bestMediaForRole(allMedia, asset.product?.id, role, mode);
        if (roleAsset && !group.assets.some((item) => item.id === roleAsset.id)) {
          group.assets.push(roleAsset);
        }
      }
    } else if (!group.assets.some((item) => item.id === asset.id)) {
      group.assets.push(asset);
    }
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) => {
    return (left.product?.sku ?? 'zz').localeCompare(right.product?.sku ?? 'zz');
  });
}

type ReviewProductSummary = {
  id: string;
  sku: string;
  customerTitle: string;
  publicationState: string;
};

function productCanAttemptPublish(product: ReviewProductSummary | null | undefined): product is ReviewProductSummary {
  return Boolean(product && !['PUBLISHED', 'ARCHIVED'].includes(product.publicationState));
}

function ReviewProductPublishControls({
  bulkFormId,
  product,
}: {
  bulkFormId: string;
  product: ReviewProductSummary | null | undefined;
}) {
  if (!product) return null;
  const canAttemptPublish = productCanAttemptPublish(product);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canAttemptPublish ? (
        <label className="flex items-center gap-2 rounded-md border border-surface-line bg-black/30 px-2 py-1 text-xs font-bold text-neutral-200">
          <input
            aria-label={`Select ${product.customerTitle} for bulk publishing`}
            data-bulk-group={bulkFormId}
            form={bulkFormId}
            name="productId"
            type="checkbox"
            value={product.id}
          />
          Select product
        </label>
      ) : null}
      <form action={publishIronSprueProductAction}>
        <input type="hidden" name="productId" value={product.id} />
        <Button type="submit" disabled={!canAttemptPublish} size="sm" variant={canAttemptPublish ? 'primary' : 'outline'}>Publish product</Button>
      </form>
      {canAttemptPublish ? <p className="text-xs text-neutral-500">Publishing will stop if media, content or conflict blockers remain.</p> : null}
    </div>
  );
}

function ProductFlagForm({ product }: { product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number] }) {
  const flags = [
    ['featured', 'Featured', product.featured],
    ['newArrival', 'New', product.newArrival],
    ['comingSoon', 'Coming soon', product.comingSoon],
    ['specialOffer', 'Offer', product.specialOffer],
    ['hideWhenOutOfStock', 'Hide OOS', product.hideWhenOutOfStock],
  ] as const;

  return (
    <form action={updateIronSprueProductFlagsAction} className="grid gap-2 text-xs sm:grid-cols-5">
      <input type="hidden" name="productId" value={product.id} />
      {flags.map(([name, label, checked]) => (
        <label key={name} className="flex items-center gap-2 rounded-md border border-surface-line bg-surface-ink px-2 py-1">
          <input name={name} type="checkbox" defaultChecked={checked} />
          <span>{label}</span>
        </label>
      ))}
      <Button type="submit" size="sm" variant="outline" className="sm:col-span-5">Save flags</Button>
    </form>
  );
}

function ProductReviewActionPanel({
  product,
  reason,
}: {
  product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number];
  reason: { code: string; category: string; message: string; source: string; actionable: boolean; actionHref?: string };
}) {
  const sourceField = reason.source.startsWith('contentReviews.') ? reason.source.replace('contentReviews.', '') : null;
  const review = sourceField
    ? product.contentReviews.find((item) => item.fieldName === sourceField && item.status !== 'APPROVED')
    : null;
  const primaryMediaCandidates = product.mediaAssets.filter((asset) =>
    asset.role === 'catalogue-primary' && isIronSprueDisplayableImageAsset(asset),
  );
  const pendingPrimaryMedia = primaryMediaCandidates.find((asset) => asset.approvalState !== 'APPROVED')
    ?? primaryMediaCandidates.find((asset) => asset.approvalState === 'APPROVED' && !asset.isPrimary);
  const unusablePrimaryMedia = product.mediaAssets.find((asset) => asset.role === 'catalogue-primary' && !isIronSprueDisplayableImageAsset(asset));

  if (review) {
    return (
      <form action={approveIronSprueProductReviewAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="productSku" value={product.sku} />
        <input type="hidden" name="reviewId" value={review.id} />
        <Button type="submit" size="sm" variant="primary">Approve {reason.category} review</Button>
        <span className="text-xs text-amber-200/80">Approves {review.fieldName} and refreshes product readiness.</span>
      </form>
    );
  }

  if (reason.category === 'media') {
    if (pendingPrimaryMedia) {
      return (
        <form action={approveIronSprueProductReviewAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="productSku" value={product.sku} />
          <input type="hidden" name="mediaId" value={pendingPrimaryMedia.id} />
          <Button type="submit" size="sm" variant="primary">Approve primary image</Button>
          <span className="text-xs text-amber-200/80">Marks this catalogue-primary image as approved and primary.</span>
        </form>
      );
    }

    return (
      <div className="mt-2 grid gap-2">
        {unusablePrimaryMedia ? (
          <p className="text-xs text-amber-200/80">
            The current catalogue-primary record is not an image file ({unusablePrimaryMedia.mimeType ?? 'unknown type'}). Upload a real product image below.
          </p>
        ) : null}
        <ProductMediaUploadForm product={product} role="catalogue-primary" />
      </div>
    );
  }

  return reason.actionHref ? <a className="mt-1 inline-block text-xs font-bold text-accent" href={reason.actionHref}>Open correction area</a> : null;
}

function ProductMediaReadinessPanel({
  product,
  r2Candidates,
}: {
  product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number];
  r2Candidates: Map<string, IronSprueR2Object[]>;
}) {
  const displayableAssets = product.mediaAssets.filter(isIronSprueDisplayableImageAsset);
  const placeholderAssets = product.mediaAssets.filter((asset) => !isIronSprueDisplayableImageAsset(asset));
  const linkedStorageKeys = new Set(product.mediaAssets.map((asset) => asset.storageKey).filter((key): key is string => Boolean(key)));
  const roles = ['catalogue-primary', 'workshop-photography', 'completed-result', 'manufacturer-original'] as const;

  return (
    <div className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-neutral-100">Product media</p>
        <div className="flex flex-wrap gap-2">
          {displayableAssets.length ? <StatePill>{`${displayableAssets.length} IMAGE${displayableAssets.length === 1 ? '' : 'S'}`}</StatePill> : <StatePill>NO IMAGE ROWS</StatePill>}
          {placeholderAssets.length ? <StatePill>{`${placeholderAssets.length} PLACEHOLDER${placeholderAssets.length === 1 ? '' : 'S'}`}</StatePill> : null}
        </div>
      </div>
      {displayableAssets.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {displayableAssets.map((asset) => {
            const previewUrl = ironSprueMediaPreviewUrl(asset);
            return (
              <div key={asset.id} className="grid gap-2 rounded-md border border-surface-line bg-black/30 p-2">
                <div className="flex h-40 items-center justify-center rounded-md border border-surface-line bg-white p-2">
                  {previewUrl ? (
                    <img src={previewUrl} alt={asset.altText ?? product.customerTitle} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-center text-sm text-neutral-500">No preview URL</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatePill>{asset.approvalState}</StatePill>
                  <StatePill>{asset.role}</StatePill>
                  {asset.isPrimary ? <StatePill>PRIMARY</StatePill> : null}
                </div>
                <p className="break-all text-xs text-neutral-500">{asset.storageKey ?? asset.url ?? 'No storage key'}</p>
                <MediaActionForms mediaId={asset.id} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-sm text-amber-100">
          No real displayable image row is currently linked to this product in Railway.
        </p>
      )}
      {placeholderAssets.length ? (
        <details className="rounded-md border border-surface-line bg-black/20 p-2 text-xs text-neutral-400">
          <summary className="cursor-pointer font-semibold text-neutral-200">Source/placeholder records</summary>
          <div className="mt-2 grid gap-1">
            {placeholderAssets.map((asset) => (
              <p key={asset.id} className="break-all">{asset.role} - {asset.approvalState} - {asset.mimeType ?? 'unknown'} - {asset.storageKey ?? asset.url ?? 'No key'}</p>
            ))}
          </div>
        </details>
      ) : null}
      {roles.map((role) => (
        <ExistingR2MediaCandidates
          key={role}
          candidates={r2Candidates.get(`${normalizedProductSku(product.sku)}:${role}`) ?? []}
          linkedStorageKeys={linkedStorageKeys}
          product={product}
          role={role}
        />
      ))}
    </div>
  );
}

function ProductCommercialInventoryPanel({ product }: { product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number] }) {
  const available = product.inventory?.availableStock ?? 0;
  const reserved = product.inventory?.reservedStock ?? 0;
  const sellable = Math.max(available - reserved, 0);
  return (
    <div className="grid gap-2 rounded-md border border-surface-line bg-surface-ink p-3 text-sm text-neutral-300 md:grid-cols-2">
      <p><span className="font-semibold text-neutral-100">Sell price:</span> {money(product.grossPriceMinor, product.currency)}</p>
      <p><span className="font-semibold text-neutral-100">VAT rate:</span> {product.vatRate}%</p>
      <p><span className="font-semibold text-neutral-100">Supplier cost:</span> {money(product.supplierUnitCostMinor, product.currency)}</p>
      <p><span className="font-semibold text-neutral-100">Landed cost:</span> {money(product.landedCostMinor, product.currency)}</p>
      <p><span className="font-semibold text-neutral-100">Stock on hand:</span> {available}</p>
      <p><span className="font-semibold text-neutral-100">Reserved:</span> {reserved}</p>
      <p><span className="font-semibold text-neutral-100">Sellable:</span> {sellable}</p>
      <p><span className="font-semibold text-neutral-100">Hide when out of stock:</span> {product.hideWhenOutOfStock ? 'Yes' : 'No'}</p>
    </div>
  );
}

function ProductReviewRowsPanel({ product }: { product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number] }) {
  if (!product.contentReviews.length) return <EmptyNote>No review/import rows recorded for this product.</EmptyNote>;
  return (
    <div className="grid gap-2 rounded-md border border-surface-line bg-surface-ink p-3">
      <p className="text-sm font-bold text-neutral-100">Review and import rows</p>
      {product.contentReviews.map((review) => (
        <div key={review.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-surface-line bg-black/30 p-2 text-sm">
          <span className="text-neutral-300">{review.fieldName}</span>
          <div className="flex flex-wrap gap-2">
            <StatePill>{review.status}</StatePill>
            {review.conflictReason ? <span className="text-amber-200">{review.conflictReason}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductAdminCard({
  product,
  r2Candidates,
}: {
  product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number];
  r2Candidates: Map<string, IronSprueR2Object[]>;
}) {
  const readiness = 'readiness' in product && product.readiness && typeof product.readiness === 'object'
    ? product.readiness as {
        status: string;
        isReadyToPublish: boolean;
        blockingReasons: Array<{ code: string; category: string; message: string; source: string; actionable: boolean; actionHref?: string }>;
      }
    : null;
  const blockers = 'readinessBlockers' in product && Array.isArray(product.readinessBlockers)
    ? product.readinessBlockers as string[]
    : [];
  const canPublish = readiness
    ? Boolean(readiness.isReadyToPublish && ['READY_TO_PUBLISH', 'READY'].includes(product.publicationState))
    : ['READY_TO_PUBLISH', 'READY'].includes(product.publicationState) && blockers.length === 0;
  const blockerCount = readiness?.blockingReasons.length ?? blockers.length;

  return (
    <details className="group rounded-md border border-surface-line bg-surface-ink">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 outline-none focus:ring-2 focus:ring-accent lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {canPublish ? (
              <label className="flex items-center gap-2 rounded-md border border-surface-line bg-black/30 px-2 py-1 text-xs font-bold text-neutral-200">
                <input
                  aria-label={`Select ${product.customerTitle} for bulk publishing`}
                  data-bulk-group="iron-sprue-product-bulk-publish"
                  form="iron-sprue-product-bulk-publish"
                  name="productId"
                  type="checkbox"
                  value={product.id}
                />
                Select
              </label>
            ) : null}
            <h2 className="text-lg font-bold">{product.customerTitle}</h2>
            <StatePill>{product.publicationState}</StatePill>
            <StatePill>{product.publicationState === 'PUBLISHED' ? 'PUBLISHED' : blockerCount ? `BLOCKED - ${blockerCount} outstanding` : 'READY TO PUBLISH'}</StatePill>
          </div>
          <p className="mt-1 text-sm text-neutral-400">{product.sku} - {product.brand?.name ?? 'No brand'} - {product.category?.name ?? 'No category'} - {money(product.grossPriceMinor, product.currency)}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-sm text-neutral-400">
          <p>Stock <strong className="block text-neutral-100">{product.inventory?.availableStock ?? 0}</strong></p>
          <p>Media <strong className="block text-neutral-100">{product.mediaAssets.length}</strong></p>
          <p>Reviews <strong className="block text-neutral-100">{product.contentReviews.length}</strong></p>
        </div>
      </summary>
      <div className="grid gap-4 border-t border-surface-line p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-3">
          <p className="max-w-4xl text-sm leading-6 text-neutral-300">{product.shortDescription ?? 'No short description recorded.'}</p>
          <ProductDescriptorContentPreview product={product} />
          <ProductCommercialInventoryPanel product={product} />
          <ProductReviewRowsPanel product={product} />
          {readiness?.blockingReasons.length ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-950/20 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Outstanding actions</p>
              <ul className="mt-2 grid gap-2 text-sm text-amber-100">
                {readiness.blockingReasons.map((reason) => (
                  <li key={`${reason.code}:${reason.source}`} className="rounded border border-amber-500/20 bg-black/20 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-amber-300">{reason.category}</span>
                      <span>{reason.message}</span>
                    </div>
                    <p className="mt-1 text-xs text-amber-200/80">Source: {reason.source}</p>
                    <ProductReviewActionPanel product={product} reason={reason} />
                  </li>
                ))}
              </ul>
            </div>
          ) : blockers.length ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-950/20 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Outstanding actions</p>
              <ul className="mt-2 grid gap-1 text-sm text-amber-100">
                {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </div>
          ) : (
            <p className="rounded-md border border-emerald-500/40 bg-emerald-950/20 p-3 text-sm font-semibold text-emerald-100">Ready to publish.</p>
          )}
          <ProductFlagForm product={product} />
        </div>
        <div className="grid content-start gap-3">
          <ProductMediaReadinessPanel product={product} r2Candidates={r2Candidates} />
          <form action={publishIronSprueProductAction} className="grid gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <Button type="submit" disabled={!canPublish} variant={canPublish ? 'primary' : 'outline'}>Publish product</Button>
            {!canPublish && product.publicationState !== 'PUBLISHED' ? <p className="text-xs text-neutral-500">Publishing unlocks when all mandatory review checks pass.</p> : null}
          </form>
          <form action={updateIronSpruePublicationStateAction} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-3">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Manual override">
              <select name="publicationState" defaultValue={product.publicationState === 'READY' ? 'READY_TO_PUBLISH' : product.publicationState} className={fieldClass}>
                {['DRAFT', 'CONTENT_PENDING', 'MEDIA_PENDING', 'REVIEW_REQUIRED', 'READY_TO_PUBLISH', 'ARCHIVED'].map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </Field>
            <Button type="submit" variant="outline">Update non-public state</Button>
          </form>
        </div>
      </div>
    </details>
  );
}

async function ProductsSection({ searchParams }: { searchParams?: SearchParams }) {
  const search = param(searchParams, 'q');
  const brandId = param(searchParams, 'brandId');
  const categoryId = param(searchParams, 'categoryId');
  const supplierId = param(searchParams, 'supplierId');
  const publicationState = param(searchParams, 'state');
  const normalizedPublicationState = publicationState === 'READY' ? 'READY_TO_PUBLISH' : publicationState;
  const [{ categories, brands, suppliers }, result, r2ProductObjects, r2ArchiveProductObjects] = await Promise.all([
    getIronSprueAdminReferenceData(),
    listIronSprueAdminProducts({
      ...(search ? { search } : {}),
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(normalizedPublicationState && ['DRAFT', 'CONTENT_PENDING', 'MEDIA_PENDING', 'REVIEW_REQUIRED', 'READY_TO_PUBLISH', 'PUBLISHED', 'ARCHIVED'].includes(normalizedPublicationState)
        ? { publicationState: normalizedPublicationState as 'DRAFT' | 'CONTENT_PENDING' | 'MEDIA_PENDING' | 'REVIEW_REQUIRED' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED' }
        : {}),
      pageSize: 81,
    }),
    listIronSprueR2Objects('products/', 1000).catch(() => []),
    listIronSprueR2Objects('archive/products/', 1000).catch(() => []),
  ]);
  if (!result.products.length) return <EmptyNote>No Iron Sprue products found.</EmptyNote>;
  const r2Candidates = r2CandidatesByProductRole([...r2ProductObjects, ...r2ArchiveProductObjects]);
  const r2CandidateCount = [...r2Candidates.values()].reduce((total, candidates) => total + candidates.length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="mb-4 grid gap-3 rounded-md border border-emerald-500/30 bg-emerald-950/10 p-3 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="font-bold text-emerald-100">Existing R2 product images detected: {r2CandidateCount}</p>
              <p className="mt-1 text-sm text-neutral-400">Confident SKU-matched images can be reconciled into canonical Railway media rows from here. JSON/source manifests stay visible as placeholders but do not satisfy media readiness.</p>
            </div>
            <form action={reconcileIronSprueExistingR2MediaAction} className="self-end">
              <Button type="submit" variant="primary">Reconcile R2 media</Button>
            </form>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['READY_TO_PUBLISH', 'Ready to publish'],
              ['MEDIA_PENDING', 'Media pending'],
              ['CONTENT_PENDING', 'Content pending'],
              ['REVIEW_REQUIRED', 'Review required'],
              ['PUBLISHED', 'Published'],
            ].map(([state, label]) => (
              <a
                aria-current={publicationState === state ? 'page' : undefined}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${publicationState === state ? 'border-accent bg-accent/20 text-accent' : 'border-surface-line text-neutral-300'}`}
                href={`/iron-sprue-admin/products?state=${state}`}
                key={state}
              >
                {label}
              </a>
            ))}
          </div>
          <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(150px,1fr))_auto]">
            <Field label="Search">
              <input name="q" defaultValue={param(searchParams, 'q') ?? ''} className={fieldClass} placeholder="SKU, title, barcode or MPN" />
            </Field>
            <Field label="State">
              <select name="state" defaultValue={publicationState ?? ''} className={fieldClass}>
                <option value="">All states</option>
                {['DRAFT', 'CONTENT_PENDING', 'MEDIA_PENDING', 'REVIEW_REQUIRED', 'READY_TO_PUBLISH', 'PUBLISHED', 'ARCHIVED'].map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <select name="brandId" defaultValue={param(searchParams, 'brandId') ?? ''} className={fieldClass}>
                <option value="">All brands</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select name="categoryId" defaultValue={param(searchParams, 'categoryId') ?? ''} className={fieldClass}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <Field label="Supplier">
              <select name="supplierId" defaultValue={param(searchParams, 'supplierId') ?? ''} className={fieldClass}>
                <option value="">All suppliers</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </Field>
            <Button type="submit" className="self-end">Filter</Button>
          </form>
          <p className="mt-3 text-sm text-neutral-400">{result.pagination.total} product{result.pagination.total === 1 ? '' : 's'} match the current filters.</p>
        </CardContent>
      </Card>
      <AdminDisclosure
        defaultOpen
        summary={
          <span>
            Product results <span className="text-neutral-500">({result.pagination.total})</span>
          </span>
        }
      >
        <div className="space-y-3">
          <form id="iron-sprue-product-bulk-publish" action={bulkPublishIronSprueProductsAction} />
          <IronSprueBulkApprovalControls
            actions={[{ label: 'Publish selected', value: 'PUBLISHED' }]}
            formId="iron-sprue-product-bulk-publish"
            itemLabel="eligible products"
            totalCount={result.products.filter((product) => ['READY_TO_PUBLISH', 'READY'].includes(product.publicationState)).length}
          />
          {result.products.map((product) => <ProductAdminCard key={product.id} product={product} r2Candidates={r2Candidates} />)}
        </div>
      </AdminDisclosure>
    </div>
  );
}

async function InventorySection() {
  const rows = await listIronSprueAdminInventory();
  return (
    <Card>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="p-2">SKU</th><th className="p-2">Product</th><th className="p-2">Expected</th><th className="p-2">Received</th><th className="p-2">Damaged</th><th className="p-2">Missing</th><th className="p-2">On hand</th><th className="p-2">Reserved</th><th className="p-2">Available to sell</th><th className="p-2">Location</th><th className="p-2">Operations</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-surface-line">
                <td className="p-2 font-semibold">{row.product.sku}</td>
                <td className="p-2">{row.product.customerTitle}</td>
                <td className="p-2">{row.expectedQuantity}</td>
                <td className="p-2">{row.receivedQuantity}</td>
                <td className="p-2">{row.damagedQuantity}</td>
                <td className="p-2">{row.missingQuantity}</td>
                <td className="p-2">{row.availableStock}</td>
                <td className="p-2">{row.reservedStock}</td>
                <td className="p-2 font-semibold">{Math.max(row.availableStock - row.reservedStock, 0)}</td>
                <td className="p-2">{row.locationCode}</td>
                <td className="min-w-[360px] p-2">
                  <details className="rounded-md border border-surface-line bg-black/20 p-2">
                    <summary className="cursor-pointer font-semibold text-accent">Stock controls</summary>
                    <div className="mt-3 grid gap-3">
                      <form action={receiveIronSprueStockAction} className="grid gap-2 rounded-md border border-surface-line p-2">
                        <input type="hidden" name="productId" value={row.productId} />
                        <p className="font-semibold text-neutral-200">Receive stock</p>
                        <div className="grid grid-cols-3 gap-2">
                          <input name="receivedQuantity" type="number" min="0" className={fieldClass} placeholder="Received" />
                          <input name="damagedQuantity" type="number" min="0" className={fieldClass} placeholder="Damaged" />
                          <input name="missingQuantity" type="number" min="0" className={fieldClass} placeholder="Missing" />
                        </div>
                        <input name="batchReference" className={fieldClass} placeholder="Batch/reference" />
                        <input name="reason" className={fieldClass} placeholder="Reason" defaultValue="Stock received" />
                        <Button type="submit" size="sm" variant="outline">Save receipt</Button>
                      </form>
                      <form action={adjustIronSprueStockAction} className="grid gap-2 rounded-md border border-surface-line p-2">
                        <input type="hidden" name="productId" value={row.productId} />
                        <p className="font-semibold text-neutral-200">Manual adjustment</p>
                        <div className="grid grid-cols-[1fr_1fr] gap-2">
                          <input name="quantityDelta" type="number" className={fieldClass} placeholder="+/- quantity" />
                          <select name="movementType" className={fieldClass} defaultValue="STOCK_CORRECTION">
                            <option value="STOCK_CORRECTION">Correction</option>
                            <option value="DAMAGE_WRITE_OFF">Damage/write-off</option>
                            <option value="FOUND_STOCK">Found stock</option>
                          </select>
                        </div>
                        <input name="reason" className={fieldClass} placeholder="Required adjustment reason" />
                        <input name="batchReference" className={fieldClass} placeholder="Reference (optional)" />
                        <Button type="submit" size="sm" variant="outline">Apply adjustment</Button>
                      </form>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

async function ReferenceSection({ section }: { section: string }) {
  const { categories, brands, suppliers } = await getIronSprueAdminReferenceData();
  const rows = section === 'categories' ? categories : section === 'brands' ? brands : suppliers;
  if (!rows.length) return <EmptyNote>No Iron Sprue {section} found.</EmptyNote>;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const logoPreview = 'logoUrl' in row ? ironSprueAdminPreviewUrl(row.logoUrl) : null;
        const logoAltText = 'logoAltText' in row ? row.logoAltText : row.name;
        return (
        <Card key={row.id}>
          <CardContent className="space-y-2">
            {logoPreview ? <img src={logoPreview} alt={logoAltText ?? row.name} className="max-h-16 max-w-48 object-contain" /> : null}
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">{row.name}</h2>
              <StatePill>{row.active ? 'ACTIVE' : 'INACTIVE'}</StatePill>
            </div>
            <p className="text-sm text-neutral-400">{row.slug}</p>
            {'featured' in row ? <p className="text-sm text-neutral-400">Featured: {row.featured ? 'Yes' : 'No'}</p> : null}
            {'website' in row && row.website ? <a className="text-sm text-accent" href={row.website} target="_blank" rel="noreferrer">Website</a> : null}
            <p className="text-sm text-neutral-400">{row._count.products} products</p>
            {section === 'categories' ? (() => {
              const categoryRow = row as typeof categories[number];
              return (
              <form action={updateIronSprueCategoryControlsAction} className="mt-3 grid gap-2 rounded-md border border-surface-line bg-black/30 p-3">
                <input type="hidden" name="categoryId" value={categoryRow.id} />
                <Field label="Storefront order">
                  <input name="sortOrder" type="number" defaultValue={categoryRow.sortOrder} className={fieldClass} />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input name="active" type="checkbox" defaultChecked={categoryRow.active} />
                  Visible on storefront
                </label>
                {categoryRow._count.products === 0 ? (
                  <p className="text-xs text-amber-200">Categories with no active customer-visible products should stay hidden unless there is a deliberate launch reason.</p>
                ) : null}
                <Button type="submit" size="sm" variant="outline">Save category visibility</Button>
              </form>
              );
            })() : null}
          </CardContent>
        </Card>
      );
      })}
    </div>
  );
}

function MediaActionForms({ mediaId }: { mediaId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['APPROVED', 'REVIEW_REQUIRED', 'REJECTED'] as const).map((state) => (
        <form key={state} action={updateIronSprueMediaApprovalAction}>
          <input type="hidden" name="mediaId" value={mediaId} />
          <input type="hidden" name="approvalState" value={state} />
          <Button type="submit" size="sm" variant={state === 'APPROVED' ? 'primary' : 'outline'}>{state === 'APPROVED' ? 'Approve' : state === 'REJECTED' ? 'Reject' : 'Needs review'}</Button>
        </form>
      ))}
    </div>
  );
}

function ProductDescriptorContentPreview({
  product,
}: {
  product: {
    customerTitle: string;
    shortDescription: string | null;
    fullDescription: string | null;
    featureBullets: unknown;
    specifications: unknown;
    seoTitle: string | null;
    metaDescription: string | null;
    buildType: string | null;
    publicationState: string;
    brand: { name: string } | null;
    category: { name: string } | null;
  };
}) {
  const featureBullets = Array.isArray(product.featureBullets) ? product.featureBullets.filter(Boolean) : [];
  const specifications = product.specifications && typeof product.specifications === 'object'
    ? Object.entries(product.specifications as Record<string, unknown>).filter(([, value]) => value != null && String(value).trim())
    : [];

  return (
    <div className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-3 text-sm text-neutral-200">
      <p><span className="font-semibold text-neutral-100">PDP title:</span> {product.customerTitle}</p>
      <p><span className="font-semibold text-neutral-100">Short description:</span> {product.shortDescription ?? 'Not populated'}</p>
      <div>
        <p className="font-semibold text-neutral-100">Full description</p>
        <p className="mt-1 leading-6 text-neutral-300">{product.fullDescription ?? 'Not populated'}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="font-semibold text-neutral-100">Feature bullets</p>
          {featureBullets.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-300">
              {featureBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          ) : <p className="mt-1 text-neutral-500">Not populated</p>}
        </div>
        <div>
          <p className="font-semibold text-neutral-100">Specifications</p>
          {specifications.length ? (
            <dl className="mt-1 grid gap-1 text-neutral-300">
              {specifications.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
                  <dt className="text-neutral-500">{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="mt-1 text-neutral-500">Not populated</p>}
        </div>
      </div>
      <div className="grid gap-2 rounded-md border border-surface-line bg-black/30 p-3 md:grid-cols-2">
        <p><span className="font-semibold text-neutral-100">Brand:</span> {product.brand?.name ?? 'Not assigned'}</p>
        <p><span className="font-semibold text-neutral-100">Category:</span> {product.category?.name ?? 'Not assigned'}</p>
        <p><span className="font-semibold text-neutral-100">Product type:</span> {product.buildType ?? 'Not populated'}</p>
        <p><span className="font-semibold text-neutral-100">State:</span> {product.publicationState}</p>
        <p><span className="font-semibold text-neutral-100">SEO title:</span> {product.seoTitle ?? 'Not populated'}</p>
        <p><span className="font-semibold text-neutral-100">Meta description:</span> {product.metaDescription ?? 'Not populated'}</p>
      </div>
    </div>
  );
}

function ContentReviewCard({
  bulkPublishFormId,
  review,
}: {
  bulkPublishFormId: string;
  review: Awaited<ReturnType<typeof listIronSprueAdminContentReviews>>[number];
}) {
  return (
    <Card key={review.id}>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold">{review.product.customerTitle}</h2><p className="text-sm text-neutral-400">{review.product.sku} - {review.fieldName}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {review.status !== 'APPROVED' ? (
              <label className="flex items-center gap-2 rounded-md border border-surface-line bg-black/30 px-2 py-1 text-xs font-bold text-neutral-200">
                <input
                  aria-label={`Select ${review.product.customerTitle} ${review.fieldName} for bulk approval`}
                  data-bulk-group="iron-sprue-content-bulk-approval"
                  form="iron-sprue-content-bulk-approval"
                  name="reviewId"
                  type="checkbox"
                  value={review.id}
                />
                Select
              </label>
            ) : null}
            <StatePill>{review.status}</StatePill>
          </div>
        </div>
        <ReviewProductPublishControls bulkFormId={bulkPublishFormId} product={review.product} />
        <ProductDescriptorContentPreview product={review.product} />
        {review.sourceReference ? <p className="text-sm text-neutral-400">Source: {review.sourceReference}</p> : null}
        <div className="flex flex-wrap gap-2">
          {(['APPROVED', 'PENDING', 'CONFLICT', 'REJECTED'] as const).map((status) => (
            <form key={status} action={updateIronSprueContentReviewAction}>
              <input type="hidden" name="reviewId" value={review.id} />
              <input type="hidden" name="status" value={status} />
              <Button type="submit" size="sm" variant={status === 'APPROVED' ? 'primary' : 'outline'}>{status}</Button>
            </form>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function descriptorMissingFields(product: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'][number]) {
  const fields: string[] = [];
  const hasText = (value: string | null | undefined) => Boolean(value?.trim());
  const featureBullets = Array.isArray(product.featureBullets) ? product.featureBullets.filter(Boolean) : [];
  const specifications = product.specifications && typeof product.specifications === 'object'
    ? Object.entries(product.specifications as Record<string, unknown>).filter(([, value]) => value != null && String(value).trim())
    : [];

  if (!hasText(product.customerTitle)) fields.push('PDP title');
  if (!hasText(product.shortDescription)) fields.push('short description');
  if (!hasText(product.fullDescription)) fields.push('full description');
  if (!featureBullets.length) fields.push('feature bullets');
  if (!specifications.length) fields.push('specifications');
  if (!hasText(product.seoTitle)) fields.push('SEO title');
  if (!hasText(product.metaDescription)) fields.push('meta description');
  if (!product.brand?.name) fields.push('brand');
  if (!product.category?.name) fields.push('category');
  if (!hasText(product.buildType)) fields.push('product type');

  return fields;
}

function ProductDescriptorCoverage({
  bulkPublishFormId,
  products,
}: {
  bulkPublishFormId: string;
  products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'];
}) {
  const rows = products
    .map((product) => ({ product, missingFields: descriptorMissingFields(product) }))
    .filter(({ product, missingFields }) => product.publicationState === 'CONTENT_PENDING' || product.publicationState === 'REVIEW_REQUIRED' || missingFields.length)
    .slice(0, 24);

  if (!rows.length) {
    return (
      <Card>
        <CardContent>
          <h2 className="font-bold">PDP descriptor coverage</h2>
          <EmptyNote>All loaded products have the core PDP descriptor fields populated. No customer-facing descriptor gaps were found in the current page of products.</EmptyNote>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-bold">PDP descriptor coverage</h2>
          <p className="text-sm text-neutral-400">Product-level view of the customer-facing title, descriptions, bullets, specifications, SEO, brand, category and type that populate PDPs.</p>
        </div>
        <div className="grid gap-3">
          {rows.map(({ product, missingFields }) => (
            <div key={product.id} className="rounded-md border border-surface-line bg-black/30 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{product.customerTitle}</h3>
                  <p className="text-sm text-neutral-400">{product.sku} - {product.publicationState}</p>
                </div>
                <StatusBadge tone={missingFields.length ? 'warning' : 'success'}>
                  {missingFields.length ? `${missingFields.length} DESCRIPTOR GAPS` : 'DESCRIPTORS POPULATED'}
                </StatusBadge>
              </div>
              {missingFields.length ? (
                <p className="mt-2 text-sm text-amber-100">Missing: {missingFields.join(', ')}</p>
              ) : null}
              <div className="mt-3">
                <ReviewProductPublishControls bulkFormId={bulkPublishFormId} product={product} />
              </div>
              <div className="mt-3">
                <ProductDescriptorContentPreview product={product} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductMediaUploadForm({
  product,
  role,
}: {
  product: { id: string; sku: string; customerTitle: string } | null;
  role: 'catalogue-primary' | 'workshop-photography' | 'manufacturer-original' | 'completed-result';
}) {
  if (!product) return null;
  return (
    <form action={uploadIronSprueProductMediaAction} className="mt-4 grid gap-2 rounded-md border border-surface-line bg-black/30 p-3">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="sku" value={product.sku} />
      <input type="hidden" name="role" value={role} />
      <Field label={`${role === 'catalogue-primary' ? 'Image 2' : role === 'workshop-photography' ? 'Workshop' : role} upload`}>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={fieldClass} />
      </Field>
      <Field label="Alt text">
        <input name="altText" defaultValue={`${product.customerTitle} ${role.replace('-', ' ')}`} className={fieldClass} />
      </Field>
      <Button type="submit" size="sm" variant="outline">Upload review candidate</Button>
    </form>
  );
}

type IronSprueMediaRole = 'catalogue-primary' | 'workshop-photography' | 'manufacturer-original' | 'completed-result';
type IronSprueR2Object = Awaited<ReturnType<typeof listIronSprueR2Objects>>[number];

function normalizedProductSku(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function r2RoleFromProductKey(key: string): IronSprueMediaRole | null {
  const parts = key.split('/');
  if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(key)) return null;
  if (parts[0] === 'archive' && parts[1] === 'products' && parts.length >= 5) {
    if (parts[3] === 'original' || parts[3] === 'manufacturer-original') return 'manufacturer-original';
    return null;
  }
  if (parts[0] !== 'products' || parts.length < 4) return null;
  if (parts[2] === 'image-2') return 'catalogue-primary';
  if (parts[2] === 'workshop') return 'workshop-photography';
  if (parts[2] === 'original' || parts[2] === 'manufacturer-original') return 'manufacturer-original';
  if (parts[2] === 'completed-result') return 'completed-result';
  return null;
}

function r2CandidatesByProductRole(objects: IronSprueR2Object[]) {
  const candidates = new Map<string, IronSprueR2Object[]>();
  for (const object of objects) {
    const role = r2RoleFromProductKey(object.key);
    if (!role) continue;
    const parts = object.key.split('/');
    const sku = normalizedProductSku(parts[0] === 'archive' && parts[1] === 'products' ? parts[2] : parts[1]);
    const mapKey = `${sku}:${role}`;
    candidates.set(mapKey, [...(candidates.get(mapKey) ?? []), object]);
  }

  for (const [key, values] of candidates) {
    candidates.set(key, [...values].sort((left, right) => (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0) || left.key.localeCompare(right.key)));
  }
  return candidates;
}

function ExistingR2MediaCandidates({
  candidates,
  linkedStorageKeys,
  product,
  role,
}: {
  candidates: IronSprueR2Object[];
  linkedStorageKeys?: Set<string>;
  product: { id: string; sku: string; customerTitle: string } | null | undefined;
  role: IronSprueMediaRole;
}) {
  const unlinkedCandidates = candidates.filter((candidate) => !linkedStorageKeys?.has(candidate.key));
  if (!product || !unlinkedCandidates.length) return null;

  return (
    <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-950/10 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Existing R2 image candidates</p>
      <p className="mt-1 text-xs text-neutral-400">These files already exist in the Iron Sprue R2 bucket but are not linked as canonical Railway media rows for this role.</p>
      <div className="mt-3 grid gap-3">
        {unlinkedCandidates.slice(0, 4).map((candidate) => (
          <div key={candidate.key} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-2 sm:grid-cols-[96px_1fr]">
            <div className="flex h-24 w-24 items-center justify-center rounded-md border border-surface-line bg-white p-1">
              <img src={candidate.previewUrl} alt={`${product.customerTitle} ${role}`} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="space-y-2">
              <p className="break-all text-xs text-neutral-400">{candidate.key}</p>
              <form action={attachIronSprueExistingR2MediaAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="role" value={role} />
                <input type="hidden" name="storageKey" value={candidate.key} />
                <input type="hidden" name="altText" value={`${product.customerTitle} ${role.replace('-', ' ')}`} />
                <Button type="submit" size="sm" variant="outline">Attach R2 image for review</Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function MediaSection({ searchParams }: { searchParams?: SearchParams }) {
  const [media, r2ProductObjects, r2ArchiveProductObjects] = await Promise.all([
    listIronSprueAdminMediaAssets({ pageSize: 500 }),
    listIronSprueR2Objects('products/', 500).catch(() => []),
    listIronSprueR2Objects('archive/products/', 500).catch(() => []),
  ]);
  const mode = fullReviewModeFromSearch(searchParams);
  const pendingCount = reviewableIronSprueMediaAssets(media, 'pending').length;
  const approvedCount = media.filter((asset) => asset.approvalState === 'APPROVED').length;
  const rejectedCount = media.filter((asset) => asset.approvalState === 'REJECTED').length;
  const reviewableMedia = reviewableIronSprueMediaAssets(media, mode);
  const productGroups = groupMediaByProduct(reviewableMedia, media, mode);
  const r2Candidates = r2CandidatesByProductRole([...r2ProductObjects, ...r2ArchiveProductObjects]);
  const r2CandidateCount = [...r2Candidates.values()].reduce((total, items) => total + items.length, 0);
  const hiddenCount = media.length - reviewableMedia.length;
  const bulkApprovableMediaCount = reviewableMedia.filter((asset) => asset.approvalState !== 'APPROVED').length;
  const bulkPublishableProductCount = new Set(productGroups
    .map((group) => group.product)
    .filter(productCanAttemptPublish)
    .map((product) => product?.id)).size;

  return (
    <div className="space-y-4">
      <ReviewTabs baseHref="/iron-sprue-admin/media" mode={mode} pendingCount={pendingCount} approvedCount={approvedCount} rejectedCount={rejectedCount} allCount={media.length} />
      <form id="iron-sprue-media-bulk-approval" action={bulkApproveIronSprueMediaAction} />
      <form id="iron-sprue-media-product-bulk-publish" action={bulkPublishIronSprueProductsAction} />
      <IronSprueBulkApprovalControls
        actions={[
          { label: 'Approve selected', value: 'APPROVED' },
          { label: 'Needs review', value: 'REVIEW_REQUIRED', tone: 'secondary' },
          { label: 'Reject selected', value: 'REJECTED', tone: 'warning' },
        ]}
        formId="iron-sprue-media-bulk-approval"
        itemLabel="media records"
        totalCount={bulkApprovableMediaCount}
      />
      <IronSprueBulkApprovalControls
        actions={[{ label: 'Publish selected products', value: 'PUBLISHED' }]}
        formId="iron-sprue-media-product-bulk-publish"
        itemLabel="products"
        totalCount={bulkPublishableProductCount}
      />
      {!reviewableMedia.length ? (
        <EmptyNote>{mode === 'approved' ? 'No approved Iron Sprue media assets found.' : mode === 'rejected' ? 'No rejected Iron Sprue media assets found.' : mode === 'all' ? 'No Iron Sprue media assets found.' : 'No Iron Sprue media assets currently require approval.'}</EmptyNote>
      ) : null}
      {hiddenCount > 0 ? (
        <p className="rounded-md border border-surface-line bg-surface-ink p-3 text-sm text-neutral-400">
          Hidden from this review tab: {hiddenCount} record{hiddenCount === 1 ? '' : 's'} outside the selected approval state.
        </p>
      ) : null}
      {r2CandidateCount > 0 ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-950/10 p-3 text-sm text-emerald-100">
          R2 product image inventory found: {r2CandidateCount} image object{r2CandidateCount === 1 ? '' : 's'} in the Iron Sprue bucket. Unlinked images are shown beside matching products so they can be attached for review.
        </p>
      ) : null}
      {productGroups.map((group) => (
        <Card key={group.product?.id ?? group.assets[0]?.id}>
          <CardContent className="space-y-4">
            <div>
              <h2 className="font-bold">{group.product?.customerTitle ?? 'Unassigned media'}</h2>
              <p className="text-sm text-neutral-400">{group.product?.sku ?? 'No SKU'} - {group.product?.publicationState ?? 'No product state'}</p>
            </div>
            <ReviewProductPublishControls bulkFormId="iron-sprue-media-product-bulk-publish" product={group.product} />
            <div className="grid gap-4 xl:grid-cols-2">
              {(mode === 'all'
                ? (['catalogue-primary', 'workshop-photography', 'manufacturer-original', 'completed-result'] as const)
                : Array.from(new Set(group.assets.map((asset) => asset.role))) as Array<'catalogue-primary' | 'workshop-photography' | 'manufacturer-original' | 'completed-result'>
              ).map((role) => {
                const asset = group.assets.find((item) => item.role === role);
                if (!asset) {
                  const existingR2Candidates = group.product
                    ? r2Candidates.get(`${normalizedProductSku(group.product.sku)}:${role}`) ?? []
                    : [];
                  const linkedStorageKeys = new Set(group.assets.map((item) => item.storageKey).filter((key): key is string => Boolean(key)));
                  return (
                    <div key={role} className="rounded-md border border-dashed border-surface-line bg-surface-ink p-4">
                      <StatePill>{role}</StatePill>
                      <p className="mt-4 text-sm text-neutral-400">No current {role === 'catalogue-primary' ? 'Image 2' : 'workshop'} media record is available for this product.</p>
                      <ExistingR2MediaCandidates candidates={existingR2Candidates} linkedStorageKeys={linkedStorageKeys} product={group.product} role={role} />
                      <ProductMediaUploadForm product={group.product} role={role} />
                    </div>
                  );
                }
                const previewUrl = ironSprueMediaPreviewUrl(asset);
                const displayableImage = isIronSprueDisplayableImageAsset(asset);
                const existingR2Candidates = group.product
                  ? r2Candidates.get(`${normalizedProductSku(group.product.sku)}:${role}`) ?? []
                  : [];
                const linkedStorageKeys = new Set(group.assets.map((item) => item.storageKey).filter((key): key is string => Boolean(key)));
                return (
                  <div key={asset.id} className="grid gap-4 rounded-md border border-surface-line bg-surface-ink p-3 sm:grid-cols-[220px_1fr]">
                    <div className="rounded-md border border-surface-line bg-white p-2">
                      {previewUrl ? (
                        <img src={previewUrl} alt={asset.altText ?? asset.product?.customerTitle ?? asset.role} className="h-52 w-full object-contain" />
                      ) : (
                        <div className="flex h-52 items-center justify-center px-4 text-center text-sm text-neutral-500">
                          {asset.storageKey || asset.url ? 'No displayable image preview' : 'No storage key'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {asset.approvalState !== 'APPROVED' ? (
                          <label className="flex items-center gap-2 rounded-md border border-surface-line bg-black/30 px-2 py-1 text-xs font-bold text-neutral-200">
                            <input
                              aria-label={`Select ${asset.product?.customerTitle ?? asset.role} ${asset.role} for bulk approval`}
                              data-bulk-group="iron-sprue-media-bulk-approval"
                              form="iron-sprue-media-bulk-approval"
                              name="mediaId"
                              type="checkbox"
                              value={asset.id}
                            />
                            Select
                          </label>
                        ) : null}
                        <StatePill>{asset.approvalState}</StatePill><StatePill>{asset.role}</StatePill>{asset.isPrimary ? <StatePill>PRIMARY</StatePill> : null}
                      </div>
                      <p className="text-sm text-neutral-400">{asset.width ?? '?'}x{asset.height ?? '?'} - {asset.mimeType ?? 'unknown'}</p>
                      <p className="break-all text-xs text-neutral-500">{asset.storageKey ?? asset.url ?? 'No storage key'}</p>
                      {!displayableImage ? (
                        <p className="rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-xs font-semibold text-amber-100">
                          This record is metadata or a placeholder, not a displayable product image. It cannot satisfy storefront media readiness.
                        </p>
                      ) : (
                        <MediaActionForms mediaId={asset.id} />
                      )}
                      <ExistingR2MediaCandidates candidates={existingR2Candidates} linkedStorageKeys={linkedStorageKeys} product={asset.product} role={role} />
                      <ProductMediaUploadForm product={asset.product} role={role} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function ContentReviewSection({ searchParams }: { searchParams?: SearchParams }) {
  const mode = fullReviewModeFromSearch(searchParams);
  const [allReviews, productPage] = await Promise.all([
    listIronSprueAdminContentReviews({ pageSize: 100 }),
    listIronSprueAdminProducts({ pageSize: 100 }),
  ]);
  const storefrontAllReviews = allReviews.filter((review) => isIronSprueStorefrontContentReviewField(review.fieldName));
  const pendingReviews = storefrontAllReviews.filter((review) => review.status === 'PENDING' || review.status === 'CONFLICT');
  const approvedReviews = storefrontAllReviews.filter((review) => review.status === 'APPROVED');
  const rejectedReviews = storefrontAllReviews.filter((review) => review.status === 'REJECTED');
  const selectedReviews = mode === 'approved'
    ? approvedReviews
    : mode === 'rejected'
      ? rejectedReviews
      : mode === 'all'
        ? storefrontAllReviews
        : pendingReviews;
  const reviews = selectedReviews;
  const bulkApprovableReviewCount = reviews.filter((review) => review.status !== 'APPROVED').length;
  const bulkPublishableProductCount = new Set(reviews
    .map((review) => review.product)
    .filter(productCanAttemptPublish)
    .map((product) => product.id)).size;

  return (
    <div className="space-y-3">
      <ReviewTabs baseHref="/iron-sprue-admin/content-review" mode={mode} pendingCount={pendingReviews.length} approvedCount={approvedReviews.length} rejectedCount={rejectedReviews.length} allCount={storefrontAllReviews.length} />
      <form id="iron-sprue-content-bulk-approval" action={bulkApproveIronSprueContentReviewsAction} />
      <form id="iron-sprue-content-product-bulk-publish" action={bulkPublishIronSprueProductsAction} />
      <IronSprueBulkApprovalControls
        actions={[
          { label: 'Approve selected', value: 'APPROVED' },
          { label: 'Needs review', value: 'PENDING', tone: 'secondary' },
          { label: 'Reject selected', value: 'REJECTED', tone: 'warning' },
        ]}
        formId="iron-sprue-content-bulk-approval"
        itemLabel="content review records"
        totalCount={bulkApprovableReviewCount}
      />
      <IronSprueBulkApprovalControls
        actions={[{ label: 'Publish selected products', value: 'PUBLISHED' }]}
        formId="iron-sprue-content-product-bulk-publish"
        itemLabel="products"
        totalCount={bulkPublishableProductCount}
      />
      {!reviews.length ? <EmptyNote>{mode === 'approved' ? 'No approved Iron Sprue content reviews found.' : mode === 'rejected' ? 'No rejected Iron Sprue content reviews found.' : mode === 'all' ? 'No Iron Sprue content review records found.' : 'No Iron Sprue content reviews currently require approval.'}</EmptyNote> : null}
      <ProductDescriptorCoverage bulkPublishFormId="iron-sprue-content-product-bulk-publish" products={productPage.products} />
      {reviews.map((review) => <ContentReviewCard bulkPublishFormId="iron-sprue-content-product-bulk-publish" key={review.id} review={review} />)}
    </div>
  );
}

function HomepagePlacementForm({
  defaultPlacementKey = 'homepage-main',
  record,
  submitLabel,
}: {
  defaultPlacementKey?: string;
  record?: Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['homepagePlacements'][number];
  submitLabel?: string;
}) {
  const previewUrl = ironSprueAdminPreviewUrl(record?.imageUrl ?? null);
  const placementKey = record?.placementKey ?? defaultPlacementKey;
  const label = homepagePlacementLabel(placementKey);
  const isStripPlacement = isPromoStripPlacementKey(placementKey);
  return (
    <form action={saveIronSprueHomepagePlacementAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-2">
      <input type="hidden" name="id" value={record?.id ?? ''} />
      <div className="md:col-span-2">
        <h3 className="font-bold">{record ? `Edit ${label}` : `Create ${label.toLowerCase()}`}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {record ? 'Updates this saved homepage control.' : 'Add a homepage strip or banner that the storefront can render.'}
        </p>
      </div>
      {previewUrl ? <img src={previewUrl} alt={record?.title ?? 'Homepage placement'} className="h-40 w-full rounded-md border border-surface-line object-cover md:col-span-2" /> : null}
      <Field label="Internal placement key"><input name="placementKey" defaultValue={record?.placementKey ?? defaultPlacementKey} className={fieldClass} /></Field>
      <Field label="Title"><input name="title" defaultValue={record?.title ?? ''} required className={fieldClass} /></Field>
      {isStripPlacement ? (
        <Field label="Strip icon">
          <select name="ctaLabel" defaultValue={record?.ctaLabel ?? 'DELIVERY'} className={fieldClass}>
            {promoStripIconOptions.map((icon) => <option key={icon} value={icon}>{icon.toLowerCase().replaceAll('_', ' ')}</option>)}
          </select>
        </Field>
      ) : (
        <Field label="CTA label"><input name="ctaLabel" defaultValue={record?.ctaLabel ?? ''} className={fieldClass} /></Field>
      )}
      <Field label="CTA href"><input name="ctaHref" defaultValue={record?.ctaHref ?? ''} className={fieldClass} /></Field>
      <Field label="Image URL"><input name="imageUrl" defaultValue={record?.imageUrl ?? ''} className={fieldClass} /></Field>
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={record?.sortOrder ?? 0} className={fieldClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.active ?? false} /> Active</label>
      <Button type="submit">{submitLabel ?? (record ? 'Save placement' : 'Create placement')}</Button>
    </form>
  );
}

type HeroLibraryItem = Awaited<ReturnType<typeof listIronSprueR2Objects>>[number];
type HomepagePlacementRecord = Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['homepagePlacements'][number];
type HeroRecord = Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['heroes'][number];
type TypographySettingsRecord = Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['typographySettings'];
const promoStripIconOptions = ['DELIVERY', 'PARCEL', 'ANNOUNCEMENT', 'OFFER', 'INFORMATION', 'SECURITY'] as const;

const heroBadgeLabels: Record<typeof IRON_SPRUE_HERO_MERCHANDISING_BADGES[number], string> = {
  NONE: 'No badge',
  IN_STOCK: 'In stock',
  NEW: 'New',
  SALE: 'Sale',
  COMING_SOON: 'Coming soon',
  PRE_ORDER: 'Pre-order',
  FEATURED: 'Featured',
  EXCLUSIVE: 'Exclusive',
};

const typographyLabels: Record<string, string> = {
  IMPACT_CONDENSED: 'Iron Sprue condensed display',
  SYSTEM_SANS: 'System sans',
  SERIF_DISPLAY: 'Classic serif display',
  HUMANIST_SANS: 'Humanist sans',
  SERIF: 'Serif',
  BOLD: 'Bold',
  BLACK: 'Black',
  REGULAR: 'Regular',
  MEDIUM: 'Medium',
  COMPACT: 'Compact',
  STANDARD: 'Standard',
  LARGE: 'Large',
  COMFORTABLE: 'Comfortable',
};

function optionLabel(value: string) {
  return typographyLabels[value] ?? value.replaceAll('_', ' ').toLowerCase();
}

function RecordMeta({ active, sortOrder }: { active: boolean; sortOrder: number | null | undefined }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatePill>{active ? 'ACTIVE' : 'INACTIVE'}</StatePill>
      <StatusBadge tone="neutral">ORDER {sortOrder ?? 0}</StatusBadge>
    </div>
  );
}

function homepagePlacementLabel(placementKey: string) {
  const labels: Record<string, string> = {
    'featured-products': 'Opening bench picks heading',
    'promo-banner': 'Promo banner',
    'promo-strip-delivery': 'Delivery promo strip',
    'brand-carousel': 'Brand carousel heading',
    'newsletter-banner': 'Newsletter banner',
  };
  return labels[placementKey] ?? placementKey
    .replace(/^product-section:/, '')
    .replace(/^featured-product:/, '')
    .replaceAll(':', ' / ')
    .replaceAll('-', ' ');
}

function isFeaturedProductPlacement(placement: HomepagePlacementRecord) {
  return placement.placementKey.startsWith('featured-product:');
}

function isProductSectionPlacement(placement: HomepagePlacementRecord) {
  return placement.placementKey.startsWith('product-section:');
}

function isPromoOrBannerPlacement(placement: HomepagePlacementRecord) {
  return placement.placementKey !== 'featured-products'
    && placement.placementKey !== 'brand-carousel'
    && !isFeaturedProductPlacement(placement)
    && !isProductSectionPlacement(placement);
}

function isPromoStripPlacementKey(placementKey: string) {
  return /^promo-banner$|promo-strip|strip/i.test(placementKey);
}

function productSlugFromPlacement(placement: HomepagePlacementRecord, prefix: string) {
  return placement.ctaHref?.replace('/products/', '').split(/[?#]/)[0] ?? placement.placementKey.replace(prefix, '');
}

function productPrimaryPreview(product: { mediaAssets?: Array<{ approvalState: string; role: string; url: string | null; storageKey: string | null; mimeType?: string | null }> }) {
  return product.mediaAssets?.find((asset) => asset.approvalState === 'APPROVED' && asset.role === 'catalogue-primary' && isIronSprueDisplayableImageAsset(asset))
    ?? product.mediaAssets?.find((asset) => asset.role === 'catalogue-primary' && isIronSprueDisplayableImageAsset(asset))
    ?? null;
}

function openingBenchFallbackProducts(products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products']) {
  const withImages = products.filter((product) => productPrimaryPreview(product));
  const withoutImages = products.filter((product) => !productPrimaryPreview(product));
  return [...withImages, ...withoutImages].slice(0, 4);
}

function isR2Reference(value: string | null | undefined) {
  return Boolean(value?.trim().startsWith('r2://'));
}

function canRenderOnPublicStorefront(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return false;
  if (raw.startsWith('r2://')) return true;
  return raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/');
}

function HeroForm({
  heroLibrary,
  products,
  record,
}: {
  heroLibrary: HeroLibraryItem[];
  products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'];
  record?: HeroRecord;
}) {
  const previewUrl = ironSprueAdminPreviewUrl(record?.imageUrl ?? null);
  const linkedProductSlug = record?.ctaHref?.match(/\/products\/([^/?#]+)/)?.[1] ?? '';
  return (
    <form action={saveIronSprueHeroAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-2">
      <input type="hidden" name="id" value={record?.id ?? ''} />
      <div className="md:col-span-2">
        <h3 className="font-bold">{record ? `Edit hero: ${record.headline}` : 'Create a new hero'}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {record ? 'This form edits an existing carousel record, including active state and display order.' : 'Create a new hero only after selecting approved artwork from the library or uploading a new approved asset.'}
        </p>
      </div>
      {previewUrl ? <img src={previewUrl} alt={record?.headline ?? 'Iron Sprue hero'} className="h-64 w-full rounded-md border border-surface-line object-cover md:col-span-2" /> : null}
      <Field label="Headline"><input name="headline" defaultValue={record?.headline ?? ''} required className={fieldClass} /></Field>
      <Field label="Strapline"><input name="strapline" defaultValue={record?.strapline ?? ''} className={fieldClass} /></Field>
      <Field label="CTA label"><input name="ctaLabel" defaultValue={record?.ctaLabel ?? ''} className={fieldClass} /></Field>
      <Field label="Hero product target">
        <select name="productSlug" defaultValue={linkedProductSlug} className={fieldClass}>
          <option value="">Use CTA href below</option>
          {products.map((product) => <option key={product.id} value={product.slug}>{product.sku} - {product.customerTitle}</option>)}
        </select>
      </Field>
      <Field label="CTA href"><input name="ctaHref" defaultValue={record?.ctaHref ?? ''} className={fieldClass} /></Field>
      <Field label="Image URL"><input name="imageUrl" defaultValue={record?.imageUrl ?? ''} className={fieldClass} placeholder="Optional public URL or r2:// key" /></Field>
      <Field label="Existing hero artwork">
        <select name="existingR2Key" defaultValue="" className={fieldClass}>
          <option value="">Keep current image URL</option>
          {heroLibrary.map((asset) => <option key={asset.key} value={asset.key}>{asset.key.replace('marketing/heroes/', '')}</option>)}
        </select>
      </Field>
      <Field label="Upload hero artwork">
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={fieldClass} />
      </Field>
      <Field label="Merchandising badge">
        <select name="merchandisingBadge" defaultValue={record?.merchandisingBadge ?? 'NONE'} className={fieldClass}>
          {IRON_SPRUE_HERO_MERCHANDISING_BADGES.map((badge) => (
            <option key={badge} value={badge}>{heroBadgeLabels[badge]}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">Applies only to promotional hero merchandising labels, not product stock badges.</span>
      </Field>
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={record?.sortOrder ?? 0} className={fieldClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.active ?? false} /> Active</label>
      <Button type="submit">{record ? 'Save hero' : 'Create hero'}</Button>
    </form>
  );
}

function heroProductSlug(hero: HeroRecord) {
  return hero.ctaHref?.match(/\/products\/([^/?#]+)/)?.[1] ?? null;
}

function heroHasValidTarget(hero: HeroRecord, products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products']) {
  const slug = heroProductSlug(hero);
  if (!slug) return Boolean(hero.ctaHref);
  return products.some((product) => product.slug === slug);
}

function CurrentHeroOverview({
  heroes,
  products,
}: {
  heroes: HeroRecord[];
  products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'];
}) {
  const ordered = [...heroes].sort((left, right) => Number(right.active) - Number(left.active) || (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const activeHeroes = ordered.filter((hero) => hero.active);
  const publicRenderableHeroes = activeHeroes.filter((hero) => canRenderOnPublicStorefront(hero.imageUrl) && heroHasValidTarget(hero, products));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Current hero carousel</h2>
            <p className="text-sm text-neutral-400">Active heroes render first only when their image URL is public-renderable. Edit the cards below to change copy, CTA, image source or active state.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <StatusBadge tone={activeHeroes.length ? 'success' : 'warning'}>{activeHeroes.length} DATABASE ACTIVE</StatusBadge>
            <StatusBadge tone={publicRenderableHeroes.length ? 'success' : 'warning'}>{publicRenderableHeroes.length} PUBLIC EFFECTIVE</StatusBadge>
          </div>
        </div>
        {!publicRenderableHeroes.length ? (
          <EmptyNote>The public storefront is using the approved static fallback hero carousel because no active Admin hero has both a renderable image and a valid Iron Sprue product target.</EmptyNote>
        ) : null}
        {ordered.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ordered.map((hero) => {
              const previewUrl = ironSprueAdminPreviewUrl(hero.imageUrl);
              const publicRenderable = canRenderOnPublicStorefront(hero.imageUrl);
              const validTarget = heroHasValidTarget(hero, products);
              return (
                <div key={hero.id} className="rounded-md border border-surface-line bg-surface-ink p-3">
                  {previewUrl ? <img src={previewUrl} alt={hero.headline} className="h-32 w-full rounded-md border border-surface-line object-cover" /> : null}
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <h3 className="font-bold">{hero.headline}</h3>
                    <RecordMeta active={hero.active} sortOrder={hero.sortOrder} />
                  </div>
                  {hero.active && (!publicRenderable || !validTarget) ? (
                    <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs font-semibold text-amber-200">
                      Not public-effective: {!validTarget ? 'CTA product target is missing from the Iron Sprue catalogue.' : isR2Reference(hero.imageUrl) ? 'R2 object key is not valid for Iron Sprue media delivery.' : 'Image URL is missing or invalid.'}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-neutral-400">{hero.strapline || 'No strapline set.'}</p>
                  <p className="mt-2 text-xs text-neutral-500">CTA: {hero.ctaLabel || 'No CTA label'} {hero.ctaHref ? `-> ${hero.ctaHref}` : ''}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyNote>No Iron Sprue hero records exist yet. Use the create form after the hero artwork library.</EmptyNote>
        )}
      </CardContent>
    </Card>
  );
}

function HeroLibrary({ items }: { items: HeroLibraryItem[] }) {
  if (!items.length) {
    return <EmptyNote>No existing hero artwork was found under marketing/heroes/. Upload a hero artwork above or check the R2 hero upload pipeline.</EmptyNote>;
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-bold">Available hero artwork</h2>
          <p className="text-sm text-neutral-400">R2-backed hero masters can be selected in the hero form above. These are not product-media review assets.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.key} className="rounded-md border border-surface-line bg-surface-ink p-3">
              <img src={item.previewUrl} alt={item.key} className="h-36 w-full rounded-md bg-black object-cover" />
              <p className="mt-2 break-all text-xs text-neutral-400">{item.key}</p>
              <p className="mt-1 text-xs text-neutral-500">{Math.round(item.size / 1024)} KB</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentPromoBannerOverview({ placements }: { placements: HomepagePlacementRecord[] }) {
  const promoPlacements = placements
    .filter((placement) => /promo|banner|strip/i.test(placement.placementKey))
    .sort((left, right) => Number(right.active) - Number(left.active) || (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const activePromo = promoPlacements.filter((placement) => placement.active);
  const fallbackStrip = ['Free UK delivery on orders over £75', 'Fast dispatch on stocked lines', 'Safe and secure checkout'];

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Current promo banner state</h2>
            <p className="text-sm text-neutral-400">Database-backed promo/banner records are shown here. Active promo, banner or strip placements feed the public storefront strip in sort order.</p>
          </div>
          <StatusBadge tone={activePromo.length ? 'success' : 'warning'}>{activePromo.length ? `${activePromo.length} ADMIN ACTIVE` : 'FALLBACK ACTIVE'}</StatusBadge>
        </div>
        {promoPlacements.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {promoPlacements.map((placement) => (
              <div key={placement.id} className="rounded-md border border-surface-line bg-surface-ink p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{placement.title}</h3>
                    <p className="text-xs text-neutral-500">{placement.placementKey}</p>
                  </div>
                  <RecordMeta active={placement.active} sortOrder={placement.sortOrder} />
                </div>
                <p className="mt-2 text-sm text-neutral-400">CTA: {placement.ctaLabel || 'No CTA label'} {placement.ctaHref ? `-> ${placement.ctaHref}` : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/30 bg-amber-950/15 p-3">
            <p className="text-sm font-semibold text-amber-100">No Admin-backed promo/banner placement currently exists. The public storefront is using the fallback promo strip below.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {fallbackStrip.map((item) => (
                <div key={item} className="rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm font-semibold">{item}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BrandCarouselManager({ brands }: { brands: Awaited<ReturnType<typeof getIronSprueAdminReferenceData>>['brands'] }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-bold">Brands we stock carousel</h2>
          <p className="text-sm text-neutral-400">Set featured brands, display order and logo URLs used by the Iron Sprue storefront carousel.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {brands.map((brand) => {
            const logoPreview = ironSprueAdminPreviewUrl(brand.logoUrl);
            return (
              <form key={brand.id} action={updateIronSprueBrandControlsAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-3">
                <input type="hidden" name="brandId" value={brand.id} />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{brand.name}</h3>
                    <p className="text-xs text-neutral-500">{brand._count.products} product{brand._count.products === 1 ? '' : 's'}</p>
                  </div>
                  {logoPreview ? <img src={logoPreview} alt={brand.logoAltText ?? brand.name} className="h-12 max-w-32 object-contain" /> : null}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Logo URL"><input name="logoUrl" defaultValue={brand.logoUrl ?? ''} className={fieldClass} /></Field>
                  <Field label="Logo alt"><input name="logoAltText" defaultValue={brand.logoAltText ?? brand.name} className={fieldClass} /></Field>
                  <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={brand.sortOrder} className={fieldClass} /></Field>
                  <div className="grid content-end gap-2">
                    <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={brand.active} /> Active</label>
                    <label className="flex items-center gap-2 text-sm"><input name="featured" type="checkbox" defaultChecked={brand.featured} /> Featured in carousel</label>
                  </div>
                </div>
                <Button type="submit" size="sm" variant="outline">Save brand controls</Button>
              </form>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedProductsManager({
  placements,
  products,
}: {
  placements: HomepagePlacementRecord[];
  products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'];
}) {
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const sectionHeading = placements.find((placement) => placement.placementKey === 'featured-products');
  const featuredPlacements = placements
    .filter(isFeaturedProductPlacement)
    .sort((left, right) => Number(right.active) - Number(left.active) || (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const activeFeaturedPlacements = featuredPlacements.filter((placement) => placement.active);
  const fallbackProducts = openingBenchFallbackProducts(products);
  const effectiveProductCount = activeFeaturedPlacements.length || fallbackProducts.length;
  const usingFallbackProducts = activeFeaturedPlacements.length === 0 && fallbackProducts.length > 0;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Opening bench picks row</h2>
            <p className="text-sm text-neutral-400">Controls the first product row after the promo cards on the public homepage.</p>
          </div>
          <StatusBadge tone={activeFeaturedPlacements.length ? 'success' : usingFallbackProducts ? 'warning' : 'neutral'}>
            {activeFeaturedPlacements.length ? `${activeFeaturedPlacements.length} ADMIN ACTIVE` : `${effectiveProductCount} FALLBACK EFFECTIVE`}
          </StatusBadge>
        </div>

        {sectionHeading ? (
          <HomepagePlacementForm
            defaultPlacementKey="featured-products"
            record={sectionHeading}
            submitLabel="Save opening row heading"
          />
        ) : (
          <HomepagePlacementForm
            defaultPlacementKey="featured-products"
            submitLabel="Create opening row heading"
          />
        )}

        {activeFeaturedPlacements.length ? (
          <div className="rounded-md border border-surface-line bg-black/30 p-3">
            <h3 className="text-sm font-bold">Current products in this row</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeFeaturedPlacements.map((placement) => {
                const slug = productSlugFromPlacement(placement, 'featured-product:');
                const product = productBySlug.get(slug);
                return <StatusBadge key={placement.id} tone="neutral">{product?.customerTitle ?? slug}</StatusBadge>;
              })}
            </div>
          </div>
        ) : usingFallbackProducts ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-950/15 p-3">
            <h3 className="text-sm font-bold text-amber-100">Current products in this row are storefront fallback</h3>
            <p className="mt-1 text-sm text-amber-100/80">Add saved products below to replace this fallback row.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {fallbackProducts.map((product) => {
                const image = productPrimaryPreview(product);
                const previewUrl = image ? ironSprueMediaPreviewUrl(image) : null;
                return (
                  <div key={product.id} className="rounded-md border border-surface-line bg-surface-ink p-3">
                    <div className="rounded-md border border-surface-line bg-white p-2">
                      {previewUrl ? <img src={previewUrl} alt={product.customerTitle} className="h-24 w-full object-contain" /> : <div className="grid h-24 place-items-center text-xs text-neutral-500">No preview</div>}
                    </div>
                    <p className="mt-2 text-sm font-bold">{product.customerTitle}</p>
                    <p className="mt-1 text-xs text-neutral-500">{product.sku}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {featuredPlacements.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {featuredPlacements.map((placement) => {
              const slug = productSlugFromPlacement(placement, 'featured-product:');
              const product = productBySlug.get(slug);
              const image = product ? productPrimaryPreview(product) : null;
              const previewUrl = image ? ironSprueMediaPreviewUrl(image) : ironSprueAdminPreviewUrl(placement.imageUrl);

              return (
                <form key={placement.id} action={saveIronSprueFeaturedProductPlacementAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-3">
                  <input type="hidden" name="id" value={placement.id} />
                  <input type="hidden" name="productSlug" value={slug} />
                  <input type="hidden" name="productTitle" value={product?.customerTitle ?? placement.title} />
                  <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                    <div className="rounded-md border border-surface-line bg-white p-2">
                      {previewUrl ? <img src={previewUrl} alt={product?.customerTitle ?? placement.title} className="h-28 w-full object-contain" /> : <div className="grid h-28 place-items-center text-xs text-neutral-500">No preview</div>}
                    </div>
                    <div>
                      <h3 className="font-bold">{product?.customerTitle ?? placement.title}</h3>
                      <p className="mt-1 text-xs text-neutral-500">{slug}</p>
                      <RecordMeta active={placement.active} sortOrder={placement.sortOrder} />
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={placement.sortOrder ?? 0} className={fieldClass} /></Field>
                    <label className="flex items-end gap-2 pb-2 text-sm"><input name="active" type="checkbox" defaultChecked={placement.active} /> Active on homepage</label>
                  </div>
                  <Button type="submit" size="sm" variant="outline">Save row product</Button>
                </form>
              );
            })}
          </div>
        ) : (
          <EmptyNote>No opening bench products are saved yet. The public homepage will use the catalogue fallback until products are added below.</EmptyNote>
        )}

        <form action={saveIronSprueFeaturedProductPlacementAction} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-3 md:grid-cols-[minmax(220px,1fr)_120px_140px]">
          <Field label="Add product">
            <select name="productSlug" className={fieldClass} required>
              <option value="">Select a product</option>
              {products.map((product) => <option key={product.id} value={product.slug}>{product.sku} - {product.customerTitle}</option>)}
            </select>
          </Field>
          <input type="hidden" name="productTitle" value="" />
          <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={featuredPlacements.length} className={fieldClass} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
          <Button type="submit" className="md:col-span-3">Add product to opening row</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HomepageProductSectionsManager({
  placements,
  products,
}: {
  placements: HomepagePlacementRecord[];
  products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'];
}) {
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const sectionPlacements = placements
    .map((placement) => {
      const match = placement.placementKey.match(/^product-section:([^:]+):(.+)$/);
      if (!match) return null;
      return { placement, sectionKey: match[1]!, productSlug: match[2]! };
    })
    .filter((entry): entry is { placement: HomepagePlacementRecord; sectionKey: string; productSlug: string } => Boolean(entry))
    .sort((left, right) => left.sectionKey.localeCompare(right.sectionKey) || (left.placement.sortOrder ?? 0) - (right.placement.sortOrder ?? 0));
  const sectionKeys = [...new Set(sectionPlacements.map((entry) => entry.sectionKey))];

  function sectionHeading(records: Array<{ placement: HomepagePlacementRecord }>) {
    return records.find((record) => record.placement.title?.trim())?.placement.title?.trim() ?? 'Untitled product row';
  }

  function renderSectionForm(record?: { placement: HomepagePlacementRecord; sectionKey: string; productSlug: string }) {
    const product = record ? productBySlug.get(record.productSlug) : null;
    const isNewRecord = !record;
    const previewAsset = product?.mediaAssets.find((asset) => asset.approvalState === 'APPROVED' && asset.role === 'catalogue-primary') ?? product?.mediaAssets.find((asset) => asset.role === 'catalogue-primary');
    const previewUrl = previewAsset ? ironSprueMediaPreviewUrl(previewAsset) : ironSprueAdminPreviewUrl(record?.placement.imageUrl);

    return (
      <form key={record?.placement.id ?? 'new-section-product'} action={saveIronSprueHomepageProductSectionAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-3 md:grid-cols-2">
        <input type="hidden" name="id" value={record?.placement.id ?? ''} />
        <div className="md:col-span-2">
          <h3 className="font-bold">{record ? `Edit product in ${record.placement.title || record.sectionKey}` : 'Add products to a homepage row'}</h3>
          <p className="mt-1 text-xs text-neutral-500">These rows appear after the opening bench picks row.</p>
        </div>
        {previewUrl ? <img src={previewUrl} alt={product?.customerTitle ?? record?.placement.title ?? 'Section product'} className="h-32 w-full rounded-md border border-surface-line bg-white object-contain p-2 md:col-span-2" /> : null}
        <Field label="Row key"><input name="sectionKey" list="homepage-section-keys" defaultValue={record?.sectionKey ?? ''} placeholder="our-aoshima-picks" required className={fieldClass} /></Field>
        <Field label="Homepage heading"><input name="sectionHeading" defaultValue={record?.placement.title ?? ''} placeholder="Our favourite Aoshima kits" required className={fieldClass} /></Field>
        <Field label="Product">
          <select name="productSlug" defaultValue={record?.productSlug ?? ''} required className={fieldClass}>
            <option value="">Select a product</option>
            {products.map((candidate) => <option key={candidate.id} value={candidate.slug}>{candidate.sku} - {candidate.customerTitle}</option>)}
          </select>
        </Field>
        <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={record?.placement.sortOrder ?? 0} className={fieldClass} /></Field>
        <Field label="Section CTA label"><input name="ctaLabel" defaultValue={record?.placement.ctaLabel ?? ''} className={fieldClass} /></Field>
        <Field label="Section CTA href"><input name="ctaHref" defaultValue={record?.placement.ctaHref ?? ''} className={fieldClass} /></Field>
        <input type="hidden" name="imageUrl" value={record?.placement.imageUrl ?? ''} />
        <label className="flex items-end gap-2 pb-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.placement.active ?? true} /> Active on homepage</label>
        <Button type="submit" size="sm" variant={record ? 'outline' : 'primary'}>{record ? 'Save section product' : 'Add product to row'}</Button>
      </form>
    );
  }
  const sectionGroups = sectionKeys.map((sectionKey) => ({
    sectionKey,
    records: sectionPlacements.filter((record) => record.sectionKey === sectionKey),
  }));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-bold">Additional homepage product rows</h2>
          <p className="mt-1 text-sm text-neutral-400">Controls extra product rows that appear below the opening bench picks on the public homepage.</p>
        </div>
        <datalist id="homepage-section-keys">
          {sectionKeys.map((key) => <option key={key} value={key} />)}
        </datalist>
        {sectionGroups.length ? (
          <div className="space-y-3">
            {sectionGroups.map((group) => (
              <details key={group.sectionKey} className="rounded-md border border-surface-line bg-surface-ink p-3" open>
                <summary className="cursor-pointer text-sm font-bold text-accent">
                  {sectionHeading(group.records)} <span className="text-neutral-500">({group.records.length})</span>
                </summary>
                <div className="mt-3 rounded-md border border-surface-line bg-black/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Current products</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.records.some((record) => record.placement.active)
                      ? group.records.filter((record) => record.placement.active).map((record) => (
                        <StatusBadge key={record.placement.id} tone="neutral">
                          {productBySlug.get(record.productSlug)?.customerTitle ?? record.productSlug}
                        </StatusBadge>
                      ))
                      : <span className="text-sm text-neutral-500">No active products in this row.</span>}
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">Row key: {group.sectionKey}</p>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {group.records.map((record) => renderSectionForm(record))}
                </div>
              </details>
            ))}
          </div>
        ) : <EmptyNote>No additional product rows exist yet. Use the form below when the homepage needs a second curated row.</EmptyNote>}
        {renderSectionForm()}
      </CardContent>
    </Card>
  );
}

function SpecialOfferForm({
  products,
  record,
}: {
  products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'];
  record?: Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['specialOffers'][number];
}) {
  return (
    <form action={saveIronSprueSpecialOfferAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-2">
      <input type="hidden" name="id" value={record?.id ?? ''} />
      <Field label="Title"><input name="title" defaultValue={record?.title ?? ''} required className={fieldClass} /></Field>
      <Field label="Product"><select name="productId" defaultValue={record?.productId ?? ''} className={fieldClass}><option value="">No linked product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.customerTitle}</option>)}</select></Field>
      <Field label="Badge"><input name="badge" defaultValue={record?.badge ?? ''} className={fieldClass} /></Field>
      <Field label="Normal price minor"><input name="normalPriceMinor" type="number" defaultValue={record?.normalPriceMinor ?? ''} className={fieldClass} /></Field>
      <Field label="Offer price minor"><input name="offerPriceMinor" type="number" defaultValue={record?.offerPriceMinor ?? ''} className={fieldClass} /></Field>
      <Field label="CTA label"><input name="ctaLabel" defaultValue={record?.ctaLabel ?? ''} className={fieldClass} /></Field>
      <Field label="CTA href"><input name="ctaHref" defaultValue={record?.ctaHref ?? ''} className={fieldClass} /></Field>
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={record?.sortOrder ?? 0} className={fieldClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.active ?? false} /> Active</label>
      <Button type="submit">{record ? 'Save offer' : 'Create offer'}</Button>
    </form>
  );
}

function DiscountCodeForm({ record }: { record?: Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['discountCodes'][number] }) {
  const fixed = record?.discountType === 'FIXED';
  return (
    <form action={saveIronSprueDiscountCodeAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-2">
      <input type="hidden" name="id" value={record?.id ?? ''} />
      <Field label="Code"><input name="code" defaultValue={record?.code ?? ''} required className={fieldClass} placeholder="WELCOME5" /></Field>
      <Field label="Discount type">
        <select name="discountType" defaultValue={record?.discountType ?? 'PERCENT'} className={fieldClass}>
          <option value="PERCENT">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </Field>
      <Field label={fixed ? 'Amount (£)' : 'Amount (%)'}>
        <input name="amount" type="number" min="0" step={fixed ? '0.01' : '1'} defaultValue={record ? (fixed ? record.amount / 100 : record.amount) : ''} className={fieldClass} />
      </Field>
      <Field label="Minimum spend (£)">
        <input name="minimumSpendMinor" type="number" min="0" step="0.01" defaultValue={record?.minimumSpendMinor != null ? record.minimumSpendMinor / 100 : ''} className={fieldClass} />
      </Field>
      <Field label="Expires"><input name="expiresAt" type="date" defaultValue={record?.expiresAt ? new Date(record.expiresAt).toISOString().slice(0, 10) : ''} className={fieldClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={record?.enabled ?? true} /> Enabled</label>
      <label className="flex items-center gap-2 text-sm"><input name="oneUsePerCustomer" type="checkbox" defaultChecked={record?.oneUsePerCustomer ?? false} /> One use per customer/email</label>
      <Button type="submit">{record ? 'Save discount code' : 'Create discount code'}</Button>
    </form>
  );
}

function TypographySettingsForm({ settings }: { settings: TypographySettingsRecord }) {
  const selectField = (
    name: keyof typeof IRON_SPRUE_TYPOGRAPHY_OPTIONS,
    label: string,
    value: string | null | undefined,
  ) => (
    <Field label={label}>
      <select name={name} defaultValue={value ?? ''} className={fieldClass}>
        {IRON_SPRUE_TYPOGRAPHY_OPTIONS[name].map((option) => (
          <option key={option} value={option}>{optionLabel(option)}</option>
        ))}
      </select>
    </Field>
  );

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-bold">Storefront typography</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Persisted Iron Sprue design-system typography controls. Options are constrained so Admin changes cannot inject arbitrary CSS or external font URLs.
          </p>
        </div>
        <form action={saveIronSprueTypographySettingsAction} className="grid gap-3 md:grid-cols-2">
          {selectField('headingFamily', 'Heading typography', settings.headingFamily)}
          {selectField('bodyFamily', 'Body typography', settings.bodyFamily)}
          {selectField('headingWeight', 'Heading weight', settings.headingWeight)}
          {selectField('bodyWeight', 'Body weight', settings.bodyWeight)}
          {selectField('headingScale', 'Heading scale', settings.headingScale)}
          {selectField('bodyScale', 'Body scale', settings.bodyScale)}
          <div className="md:col-span-2">
            <Button type="submit">Save typography controls</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

async function StorefrontSection({ section }: { section: string }) {
  const { homepagePlacements, heroes, specialOffers, discountCodes, typographySettings, auditLog } = await getIronSprueAdminStorefrontControls();
  const { brands } = await getIronSprueAdminReferenceData();
  const productOptions = ['homepage', 'heroes', 'special-offers'].includes(section) ? (await listIronSprueAdminProducts({ pageSize: 100 })).products : [];
  const heroLibrary = section === 'heroes'
    ? await listIronSprueR2Objects('marketing/heroes/', 80).catch(() => [] as HeroLibraryItem[])
    : [];

  if (section === 'homepage') {
    const promoPlacements = homepagePlacements.filter(isPromoOrBannerPlacement);

    return (
      <div className="space-y-4">
        <div id="promotions"><CurrentPromoBannerOverview placements={homepagePlacements} /></div>
        <Card>
          <CardContent>
            <h2 className="font-bold">Promo strips and banners</h2>
            <p className="mt-1 text-sm text-neutral-400">Controls the short promotional strips and image panels near the top of the public homepage.</p>
          </CardContent>
        </Card>
        {promoPlacements.map((record) => <HomepagePlacementForm key={record.id} record={record} />)}
        <HomepagePlacementForm defaultPlacementKey="promo-banner" submitLabel="Create promo banner" />
        <div id="featured-products"><FeaturedProductsManager placements={homepagePlacements} products={productOptions} /></div>
        <div id="homepage-product-sections"><HomepageProductSectionsManager placements={homepagePlacements} products={productOptions} /></div>
        <div id="brand-presentation"><BrandCarouselManager brands={brands} /></div>
        <TypographySettingsForm settings={typographySettings} />
      </div>
    );
  }

  if (section === 'heroes') {
    return (
      <div className="space-y-4">
        <CurrentHeroOverview heroes={heroes} products={productOptions} />
        <AdminDisclosure
          defaultOpen={heroes.length <= 3}
          summary={
            <span>
              Edit existing hero records <span className="text-neutral-500">({heroes.length})</span>
            </span>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-400">These are the saved Iron Sprue carousel records. Active state and sort order control what appears first.</p>
            {heroes.length ? heroes.map((record) => <HeroForm key={record.id} record={record} heroLibrary={heroLibrary} products={productOptions} />) : <EmptyNote>No saved hero records exist.</EmptyNote>}
          </div>
        </AdminDisclosure>
        <AdminDisclosure summary={<span>Available hero artwork <span className="text-neutral-500">({heroLibrary.length})</span></span>}>
          <HeroLibrary items={heroLibrary} />
        </AdminDisclosure>
        <AdminDisclosure summary="Create a new hero">
          <HeroForm heroLibrary={heroLibrary} products={productOptions} />
        </AdminDisclosure>
      </div>
    );
  }

  if (section === 'special-offers') {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div>
              <h2 className="font-bold">Discount codes</h2>
              <p className="mt-1 text-sm text-neutral-400">Simple server-validated promotional codes for Iron Sprue launch offers.</p>
            </div>
            <DiscountCodeForm />
            {discountCodes.map((record) => <DiscountCodeForm key={record.id} record={record} />)}
          </CardContent>
        </Card>
        <SpecialOfferForm products={productOptions} />
        {specialOffers.map((record) => <SpecialOfferForm key={record.id} record={record} products={productOptions} />)}
      </div>
    );
  }

  if (section === 'import-batches') {
    return <EmptyNote>Import batch history is counted on the dashboard, but detailed retry/skip controls are not implemented in this Admin surface yet.</EmptyNote>;
  }

  const rows = section === 'heroes' ? heroes : section === 'special-offers' ? specialOffers : section === 'audit-log' ? auditLog : homepagePlacements;
  if (!rows.length) return <EmptyNote>No Iron Sprue {section} records found.</EmptyNote>;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row) => {
        const record = row as Record<string, unknown>;
        const displayTitle = String(record.headline ?? record.title ?? record.action ?? record.placementKey ?? 'Iron Sprue record');
        return (
          <Card key={row.id}>
            <CardContent className="space-y-2">
              {'imageUrl' in row && row.imageUrl ? <img src={ironSprueAdminPreviewUrl(row.imageUrl) ?? row.imageUrl} alt={'headline' in row ? row.headline : 'Iron Sprue placement'} className="h-36 w-full rounded-md object-cover" /> : null}
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold">{displayTitle}</h2>
                {'active' in row ? <StatePill>{row.active ? 'ACTIVE' : 'INACTIVE'}</StatePill> : null}
              </div>
              {'summary' in row ? <p className="text-sm text-neutral-400">{row.summary}</p> : null}
              {'ctaHref' in row && row.ctaHref ? <p className="text-sm text-neutral-400">CTA: {row.ctaLabel ?? 'Link'} - {row.ctaHref}</p> : null}
              {'createdAt' in row ? <p className="text-xs text-neutral-500">Updated: {date('updatedAt' in row ? row.updatedAt : row.createdAt)}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

async function SettingsSection() {
  const dashboard = await getIronSprueAdminDashboard();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent>
          <h2 className="font-bold">Admin database target</h2>
          <p className="mt-2"><StatePill>{dashboard.databaseTarget.label}</StatePill></p>
          <p className="mt-3 break-all text-sm text-neutral-400">{dashboard.databaseTarget.source}: {dashboard.databaseTarget.host}/{dashboard.databaseTarget.database}</p>
        </CardContent>
      </Card>
      <Card><CardContent><h2 className="font-bold">Worker read</h2><p className="mt-2"><StatePill>{dashboard.workerReadStatus}</StatePill></p></CardContent></Card>
      <Card><CardContent><h2 className="font-bold">R2</h2><p className="mt-2"><StatePill>{dashboard.r2Status}</StatePill></p></CardContent></Card>
      <Card><CardContent><h2 className="font-bold">Warnings</h2>{dashboard.warnings.length ? <ul className="mt-2 list-disc pl-5 text-sm text-amber-200">{dashboard.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-400">No warnings.</p>}</CardContent></Card>
    </div>
  );
}

type IronSprueAdminOrder = Awaited<ReturnType<typeof listIronSprueAdminOrders>>[number];
type OrderView = 'action-required' | 'processing' | 'dispatched' | 'completed' | 'unpaid' | 'cancelled' | 'refunded' | 'failed' | 'all';

const orderViews: { key: OrderView; label: string }[] = [
  { key: 'action-required', label: 'Action required' },
  { key: 'processing', label: 'Processing' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'completed', label: 'Completed' },
  { key: 'unpaid', label: 'Unpaid / pending' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'failed', label: 'Failed / expired' },
  { key: 'all', label: 'All' },
];

function isPaidOrder(order: IronSprueAdminOrder) {
  return order.paymentStatus === 'SUCCEEDED'
    && !['CANCELLED', 'CANCELED', 'FAILED', 'REFUNDED'].includes(order.status)
    && order.fulfilmentStatus !== 'CANCELLED'
    && !order.cancelledAt;
}

function orderMatchesView(order: IronSprueAdminOrder, view: OrderView) {
  if (view === 'all') return true;
  if (view === 'action-required') return isPaidOrder(order) && ['PENDING', 'PICKING', 'PACKED'].includes(order.fulfilmentStatus);
  if (view === 'processing') return isPaidOrder(order) && ['PICKING', 'PACKED'].includes(order.fulfilmentStatus);
  if (view === 'dispatched') return isPaidOrder(order) && ['SHIPPED', 'DELIVERED'].includes(order.fulfilmentStatus);
  if (view === 'completed') return isPaidOrder(order) && (order.status === 'COMPLETED' || order.fulfilmentStatus === 'COMPLETED');
  if (view === 'unpaid') return ['REQUIRES_PAYMENT', 'PROCESSING'].includes(order.paymentStatus) && !order.cancelledAt;
  if (view === 'cancelled') return order.paymentStatus === 'CANCELED' || ['CANCELLED', 'CANCELED'].includes(order.status) || order.fulfilmentStatus === 'CANCELLED' || Boolean(order.cancelledAt);
  if (view === 'refunded') return order.paymentStatus === 'REFUNDED' || order.status === 'REFUNDED';
  return order.paymentStatus === 'FAILED' || order.status === 'FAILED';
}

function inactiveOrderReason(order: IronSprueAdminOrder) {
  if (order.paymentStatus === 'SUCCEEDED'
    && order.fulfilmentStatus !== 'CANCELLED'
    && !order.cancelledAt
    && !['CANCELLED', 'CANCELED', 'FAILED', 'REFUNDED'].includes(order.status)) return null;
  if (order.paymentStatus === 'CANCELED' || ['CANCELLED', 'CANCELED'].includes(order.status) || order.fulfilmentStatus === 'CANCELLED' || order.cancelledAt) return 'Cancelled or abandoned orders are not fulfilment-actionable.';
  if (order.paymentStatus === 'FAILED' || order.status === 'FAILED') return 'Failed payments are not fulfilment-actionable.';
  if (order.paymentStatus === 'REFUNDED' || order.status === 'REFUNDED') return 'Refunded orders are not fulfilment-actionable.';
  return 'Payment has not completed, so fulfilment controls are disabled.';
}

function canCancelOrder(order: IronSprueAdminOrder) {
  if (['CANCELLED', 'CANCELED', 'REFUNDED'].includes(order.status)) return false;
  if (['CANCELED', 'REFUNDED'].includes(order.paymentStatus)) return false;
  if (order.fulfilmentStatus === 'CANCELLED') return false;
  if (['SHIPPED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.fulfilmentStatus)) return false;
  return true;
}

function cancellationActionLabel(order: IronSprueAdminOrder) {
  return order.paymentStatus === 'SUCCEEDED' ? 'Refund and cancel order' : 'Cancel checkout attempt';
}

function ManualOrderForm({ products }: { products: Awaited<ReturnType<typeof listIronSprueAdminProducts>>['products'] }) {
  return (
    <AdminDisclosure summary="Create manual / offline order">
      <form action={createIronSprueManualOrderAction} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Sales channel">
            <select name="sourceChannel" className={fieldClass} defaultValue="MANUAL">
              <option value="MANUAL">Manual Admin</option>
              <option value="PHONE">Phone</option>
              <option value="EVENT">Event / show</option>
              <option value="EMAIL">Email</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </Field>
          <Field label="Payment method label"><input name="paymentMethodLabel" className={fieldClass} defaultValue="Manual payment" /></Field>
          <Field label="External reference"><input name="externalReference" className={fieldClass} placeholder="Till, invoice or note reference" /></Field>
          <Field label="Placed at"><input name="placedAt" type="datetime-local" className={fieldClass} /></Field>
        </div>

        <div className="grid gap-3 rounded-md border border-surface-line bg-black/20 p-3">
          <p className="text-sm font-semibold text-neutral-200">Line items</p>
          {[0, 1, 2].map((index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_110px_140px]">
              <select name={`productId:${index}`} className={fieldClass} defaultValue="">
                <option value="">{index === 0 ? 'Select product' : 'Optional additional product'}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.customerTitle} ({Math.max((product.inventory?.availableStock ?? 0) - (product.inventory?.reservedStock ?? 0), 0)} sellable)
                  </option>
                ))}
              </select>
              <input name={`quantity:${index}`} type="number" min="0" className={fieldClass} placeholder="Qty" />
              <input name={`unitPrice:${index}`} type="number" min="0" step="0.01" className={fieldClass} placeholder="Unit price £" />
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full name"><input name="shippingFullName" className={fieldClass} required /></Field>
          <Field label="Email"><input name="shippingEmail" type="email" className={fieldClass} required /></Field>
          <Field label="Address line 1"><input name="shippingLine1" className={fieldClass} required /></Field>
          <Field label="Address line 2"><input name="shippingLine2" className={fieldClass} /></Field>
          <Field label="Town / city"><input name="shippingCity" className={fieldClass} required /></Field>
          <Field label="Region"><input name="shippingRegion" className={fieldClass} /></Field>
          <Field label="Postcode"><input name="shippingPostalCode" className={fieldClass} required /></Field>
          <Field label="Country"><input name="shippingCountry" className={fieldClass} defaultValue="GB" required /></Field>
          <Field label="Delivery method"><input name="shippingMethodName" className={fieldClass} defaultValue="Manual delivery" /></Field>
          <Field label="Delivery charge (£)"><input name="shippingMinor" type="number" min="0" step="0.01" className={fieldClass} defaultValue="0.00" /></Field>
        </div>

        <p className="text-xs text-neutral-500">Manual orders create a paid Iron Sprue order, snapshot product prices/images and allocate sellable stock immediately. Use only for genuinely captured offline payments.</p>
        <Button type="submit">Create manual order</Button>
      </form>
    </AdminDisclosure>
  );
}

async function OrdersSection({ searchParams }: { searchParams?: SearchParams }) {
  const orderSearch = paramValue(searchParams?.orderSearch)?.trim() ?? '';
  const [orders, productOptions] = await Promise.all([
    listIronSprueAdminOrders({ search: orderSearch }),
    listIronSprueAdminProducts({ pageSize: 100 }),
  ]);
  if (!orders.length) {
    return (
      <div className="space-y-3">
        <ManualOrderForm products={productOptions.products} />
        <form className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-[1fr_auto]">
          <input name="orderSearch" className={fieldClass} defaultValue={orderSearch} placeholder="Search order number, customer, email, SKU or product" />
          <Button type="submit">Search</Button>
        </form>
        <EmptyNote>{orderSearch ? 'No Iron Sprue orders match this search.' : 'No Iron Sprue orders have been placed yet.'}</EmptyNote>
      </div>
    );
  }

  const fulfilmentStates = ['PENDING', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
  const selectedView = orderViews.some((view) => view.key === paramValue(searchParams?.orderView))
    ? paramValue(searchParams?.orderView) as OrderView
    : 'action-required';
  const counts = Object.fromEntries(orderViews.map((view) => [view.key, orders.filter((order) => orderMatchesView(order, view.key)).length])) as Record<OrderView, number>;
  const visibleOrders = orders.filter((order) => orderMatchesView(order, selectedView));

  return (
    <div className="space-y-4">
      <ManualOrderForm products={productOptions.products} />
      <form className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-[1fr_auto]">
        <input type="hidden" name="orderView" value={selectedView} />
        <input name="orderSearch" className={fieldClass} defaultValue={orderSearch} placeholder="Search order number, customer, email, SKU or product" />
        <Button type="submit">Search orders</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {orderViews.map((view) => (
          <a
            key={view.key}
            href={`/iron-sprue-admin/orders?orderView=${view.key}${orderSearch ? `&orderSearch=${encodeURIComponent(orderSearch)}` : ''}`}
            className={`rounded-md border px-3 py-2 text-sm font-bold ${selectedView === view.key ? 'border-accent bg-accent/20 text-accent' : 'border-surface-line text-neutral-300 hover:border-accent'}`}
          >
            {view.label} ({counts[view.key]})
          </a>
        ))}
      </div>
      {!visibleOrders.length ? <EmptyNote>No Iron Sprue orders in this state.</EmptyNote> : null}
      {visibleOrders.map((order) => {
        const inactiveReason = inactiveOrderReason(order);
        return (
        <Card key={order.id}>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{order.orderNumber}</h2>
                  <StatePill>{order.paymentStatus}</StatePill>
                  <StatePill>{order.fulfilmentStatus}</StatePill>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  Created {date(order.createdAt)}
                  {order.paidAt ? ` - Paid ${date(order.paidAt)}` : ''}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
                  {order.sourceChannel ?? 'ONLINE'}{order.paymentMethodLabel ? ` - ${order.paymentMethodLabel}` : ''}{order.externalReference ? ` - Ref ${order.externalReference}` : ''}
                </p>
              </div>
              <div className="text-right text-sm text-neutral-300">
                <p>Subtotal <strong>{money(order.subtotalMinor, order.currency)}</strong></p>
                <p>Delivery <strong>{money(order.shippingMinor, order.currency)}</strong></p>
                <p className="text-lg font-bold text-neutral-100">Total {money(order.totalMinor, order.currency)}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                {order.items.map((item) => {
                  const preview = ironSprueAdminPreviewUrl(item.imageUrl, item.imageStorageKey);
                  return (
                    <div key={item.id} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-3 sm:grid-cols-[80px_1fr_auto]">
                      <div className="flex h-20 w-20 items-center justify-center rounded-md border border-surface-line bg-white p-1">
                        {preview ? <img src={preview} alt={item.imageAlt ?? item.productName} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-neutral-500">No image</span>}
                      </div>
                      <div>
                        <p className="font-semibold">{item.productName}</p>
                        <p className="text-sm text-neutral-400">{item.productSku} - Qty {item.quantity}</p>
                        <p className="text-sm text-neutral-400">{money(item.unitPriceMinor, order.currency)} each</p>
                      </div>
                      <p className="font-bold">{money(item.totalMinor, order.currency)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="rounded-md border border-surface-line bg-black/30 p-3 text-sm">
                  <h3 className="font-bold">Delivery</h3>
                  <p className="mt-2 text-neutral-300">{order.shippingFullName}</p>
                  <p className="text-neutral-400">{order.shippingEmail}</p>
                  <p className="mt-2 text-neutral-400">
                    {order.shippingLine1}
                    {order.shippingLine2 ? <><br />{order.shippingLine2}</> : null}
                    <br />{order.shippingCity}
                    {order.shippingRegion ? <><br />{order.shippingRegion}</> : null}
                    <br />{order.shippingPostalCode}
                    <br />{order.shippingCountry}
                  </p>
                  <p className="mt-2 text-neutral-400">{order.shippingMethodName}</p>
                </div>

                <form action={saveIronSprueOrderNotesAction} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-3 text-sm">
                  <input type="hidden" name="orderId" value={order.id} />
                  <h3 className="font-bold text-neutral-100">Internal notes</h3>
                  <textarea name="internalNotes" className={fieldClass} rows={3} defaultValue={order.internalNotes ?? ''} placeholder="Operational notes visible to Admin only." />
                  <Button type="submit" size="sm" variant="outline">Save notes</Button>
                </form>

                <div className="rounded-md border border-surface-line bg-black/30 p-3 text-sm">
                  <h3 className="font-bold text-neutral-100">Transactional emails</h3>
                  <p className="mt-1 text-neutral-400">Resend or verify customer transactional emails without using the email provider dashboard.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={resendIronSprueOrderEmailAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="purpose" value="confirmation" />
                      <Button type="submit" size="sm" variant="outline">Confirmation email</Button>
                    </form>
                    <form action={resendIronSprueOrderEmailAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="purpose" value="dispatch" />
                      <Button type="submit" size="sm" variant="outline">Dispatch email</Button>
                    </form>
                    <form action={resendIronSprueOrderEmailAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="purpose" value="cancellation" />
                      <Button type="submit" size="sm" variant="outline">Cancellation/refund email</Button>
                    </form>
                  </div>
                </div>

                {order.returns.length ? (
                  <div className="rounded-md border border-surface-line bg-black/30 p-3 text-sm">
                    <h3 className="font-bold text-neutral-100">Return / refund history</h3>
                    <div className="mt-2 space-y-2">
                      {order.returns.map((returnRecord) => (
                        <div key={returnRecord.id} className="rounded-md border border-surface-line p-2 text-neutral-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatePill>{returnRecord.status}</StatePill>
                            <StatePill>{returnRecord.refundStatus}</StatePill>
                            <span>{money(returnRecord.refundAmountMinor, order.currency)}</span>
                          </div>
                          <p className="mt-1">Reference: {returnRecord.reference ?? 'Not set'}</p>
                          <p>Received: {date(returnRecord.receivedAt)}</p>
                          <ul className="mt-1 list-disc pl-5">
                            {returnRecord.lines.map((line) => (
                              <li key={line.id}>{line.orderItem.productSku} x {line.quantity}{line.restock ? ' - restocked' : ' - not restocked'}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {order.customerRequests.length ? (
                  <div className="rounded-md border border-surface-line bg-black/30 p-3 text-sm">
                    <h3 className="font-bold text-neutral-100">Customer requests</h3>
                    <div className="mt-2 space-y-2">
                      {order.customerRequests.map((request) => (
                        <div key={request.id} className="rounded-md border border-surface-line p-2 text-neutral-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatePill>{request.requestType}</StatePill>
                            <StatePill>{request.status}</StatePill>
                            <span>{date(request.createdAt)}</span>
                          </div>
                          <p className="mt-1 font-semibold text-neutral-200">{request.reason}</p>
                          {request.customerMessage ? <p className="mt-1">{request.customerMessage}</p> : null}
                          {request.adminNotes ? <p className="mt-1">Admin note: {request.adminNotes}</p> : null}
                          {request.status === 'OPEN' ? (
                            <form action={resolveIronSprueCustomerRequestAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                              <input type="hidden" name="requestId" value={request.id} />
                              <input
                                name="adminNotes"
                                className={fieldClass}
                                placeholder="Resolution note"
                              />
                              <button name="status" value="RESOLVED" className={compactSecondaryButtonClass}>Mark resolved</button>
                              <button name="status" value="DECLINED" className={compactSecondaryButtonClass}>Decline</button>
                            </form>
                          ) : request.resolvedAt ? (
                            <p className="mt-1">Resolved: {date(request.resolvedAt)}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {inactiveReason ? (
                  <div className="rounded-md border border-surface-line bg-black/30 p-3 text-sm text-neutral-400">
                    <h3 className="font-bold text-neutral-100">Fulfilment locked</h3>
                    <p className="mt-2">{inactiveReason}</p>
                  </div>
                ) : (
                  <form action={updateIronSprueOrderFulfilmentAction} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <Field label="Fulfilment status">
                      <select name="fulfilmentStatus" defaultValue={order.fulfilmentStatus} className={fieldClass}>
                        {fulfilmentStates.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </Field>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Courier">
                        <select
                          name="trackingCarrier"
                          className={fieldClass}
                          defaultValue={order.trackingCarrier ?? ''}
                        >
                          <option value="">Select courier</option>
                          {IRON_SPRUE_COURIERS.map((courier) => (
                            <option key={courier.code} value={courier.code}>{courier.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Tracking number">
                        <input
                          name="trackingNumber"
                          className={fieldClass}
                          defaultValue={order.trackingNumber ?? ''}
                          placeholder="Tracking reference"
                        />
                      </Field>
                      <Field label="Tracking URL">
                        <input
                          name="trackingUrl"
                          className={fieldClass}
                          defaultValue={order.trackingUrl ?? ''}
                          placeholder="https://..."
                        />
                      </Field>
                    </div>
                    <p className="text-xs text-neutral-500">Courier and tracking number are required when marking an order shipped. Royal Mail and Evri tracking links are generated automatically; custom courier can use an override URL.</p>
                    <Button type="submit" variant="outline">Save fulfilment</Button>
                  </form>
                )}

                {order.paymentStatus === 'REFUNDED' || order.cancelledAt ? (
                  <div className="rounded-md border border-surface-line bg-black/30 p-3 text-sm text-neutral-400">
                    <h3 className="font-bold text-neutral-100">Cancellation / refund</h3>
                    <p className="mt-2">Status: {order.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Cancelled'}</p>
                    {order.cancelledAt ? <p>Cancelled {date(order.cancelledAt)}</p> : null}
                  </div>
                ) : null}

                {canCancelOrder(order) ? (
                  <form action={cancelIronSprueOrderAction} className="grid gap-3 rounded-md border border-amber-500/30 bg-amber-950/10 p-3 text-sm">
                    <input type="hidden" name="orderId" value={order.id} />
                    <h3 className="font-bold text-amber-200">Merchant cancellation</h3>
                    <p className="text-neutral-400">
                      {order.paymentStatus === 'SUCCEEDED'
                        ? 'Cancelling a paid order will request a Stripe refund and restore stock once.'
                        : 'Cancelling an unpaid checkout attempt releases any active reservation without requesting a refund.'}
                    </p>
                    <Field label="Reason">
                      <textarea name="reason" className={fieldClass} rows={3} placeholder="Stock discrepancy, damaged stock, customer request..." />
                    </Field>
                    <label className="flex items-start gap-2 text-neutral-300">
                      <input type="checkbox" name="confirmCancellation" className="mt-1" />
                      <span>I confirm this order should be cancelled.</span>
                    </label>
                    <Button type="submit" variant={order.paymentStatus === 'SUCCEEDED' ? 'primary' : 'outline'}>{cancellationActionLabel(order)}</Button>
                  </form>
                ) : null}

                {(order.paymentStatus === 'SUCCEEDED' || order.paymentStatus === 'REFUNDED') && ['SHIPPED', 'COMPLETED'].includes(order.fulfilmentStatus) ? (
                  <form action={processIronSprueReturnAction} className="grid gap-3 rounded-md border border-surface-line bg-black/30 p-3 text-sm">
                    <input type="hidden" name="orderId" value={order.id} />
                    <h3 className="font-bold text-neutral-100">Return / refund</h3>
                    <p className="text-neutral-400">Use after dispatch/delivery when items are returned. Restock only resellable units.</p>
                    <Field label="Return reference">
                      <input name="reference" className={fieldClass} placeholder="ReturnRev/manual reference" />
                    </Field>
                    <Field label="Condition / disposition">
                      <input name="condition" className={fieldClass} placeholder="Resellable, damaged, opened..." />
                    </Field>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="grid gap-2 rounded-md border border-surface-line p-2">
                          <p className="font-semibold">{item.productSku} - {item.productName}</p>
                          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                            <input name={`returnQuantity:${item.id}`} type="number" min="0" max={item.quantity} className={fieldClass} placeholder={`Qty returned, max ${item.quantity}`} />
                            <label className="flex items-center gap-2 text-neutral-300">
                              <input type="checkbox" name={`returnRestock:${item.id}`} />
                              Restock
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Field label="Refund amount">
                      <input name="refundAmount" type="number" min="0" step="0.01" className={fieldClass} placeholder="0.00" />
                    </Field>
                    <Field label="Notes">
                      <textarea name="notes" className={fieldClass} rows={3} placeholder="Customer request, damage notes, restock decision..." />
                    </Field>
                    <Button type="submit" variant="primary">Process return/refund</Button>
                  </form>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      );
      })}
    </div>
  );
}

export async function IronSprueAdminSection({ section, searchParams }: { section: string; searchParams?: SearchParams }) {
  const cards = getIronSprueAdminWorkspaceCards();
  const card = cards.find((item) => item.key === section);
  if (!card) notFound();

  let sectionContent: ReactNode = null;
  try {
    if (section === 'products') sectionContent = await ProductsSection({ ...(searchParams ? { searchParams } : {}) });
    if (section === 'inventory' || section === 'goods-received') sectionContent = await InventorySection();
    if (['categories', 'brands', 'suppliers'].includes(section)) sectionContent = await ReferenceSection({ section });
    if (section === 'media') sectionContent = await MediaSection({ ...(searchParams ? { searchParams } : {}) });
    if (section === 'content-review') sectionContent = await ContentReviewSection({ ...(searchParams ? { searchParams } : {}) });
    if (['homepage', 'heroes', 'special-offers', 'audit-log', 'import-batches'].includes(section)) sectionContent = await StorefrontSection({ section });
    if (section === 'settings') sectionContent = await SettingsSection();
    if (section === 'orders') sectionContent = await OrdersSection({ ...(searchParams ? { searchParams } : {}) });
  } catch (error) {
    if (isIronSprueAdminDatabaseUnavailable(error)) {
      return <IronSprueAdminDatabaseUnavailable error={error} />;
    }
    throw error;
  }

  return (
    <Section className="py-8">
      <Container className="space-y-6">
        <PageHeader eyebrow="Iron Sprue Admin" title={card.label} description={card.description} />
        <StatusMessage {...(searchParams ? { searchParams } : {})} />
        {sectionContent}
      </Container>
    </Section>
  );
}
