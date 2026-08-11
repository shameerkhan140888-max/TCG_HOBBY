import {
  getIronSprueAdminDashboard,
  getIronSprueAdminReferenceData,
  getIronSprueAdminStorefrontControls,
  getIronSprueAdminWorkspaceCards,
  listIronSprueAdminContentReviews,
  listIronSprueAdminInventory,
  listIronSprueAdminMediaAssets,
  listIronSprueAdminProducts,
} from '@tcg-hobby/database';
import { Button, Card, CardContent, Container, PageHeader, Section, StatusBadge } from '@tcg-hobby/ui';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  saveIronSprueHeroAction,
  saveIronSprueHomepagePlacementAction,
  saveIronSprueSpecialOfferAction,
  updateIronSprueBrandControlsAction,
  updateIronSprueContentReviewAction,
  updateIronSprueMediaApprovalAction,
  updateIronSprueProductFlagsAction,
  updateIronSpruePublicationStateAction,
  uploadIronSprueProductMediaAction,
} from '../lib/iron-sprue-admin-actions.server';
import { ironSprueAdminPreviewUrl, listIronSprueR2Objects } from '../lib/iron-sprue-media-storage.server';

type SearchParams = Record<string, string | string[] | undefined>;

function money(value: number | null | undefined, currency = 'GBP') {
  if (value == null) return 'Not set';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

function date(value: Date | string | null | undefined) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ironSprueMediaPreviewUrl(asset: { url: string | null; storageKey: string | null }) {
  return ironSprueAdminPreviewUrl(asset.url, asset.storageKey);
}

function StatePill({ children }: { children: string }) {
  const value = children.toUpperCase();
  const tone = value === 'APPROVED' || value === 'READY' || value === 'PUBLISHED' || value === 'ACTIVE' || value === 'PRIMARY'
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

function param(searchParams: SearchParams | undefined, name: string) {
  const value = searchParams?.[name];
  return Array.isArray(value) ? value[0] : value;
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

function reviewableIronSprueMediaAssets(media: Awaited<ReturnType<typeof listIronSprueAdminMediaAssets>>) {
  const currentByProductStage = new Map<string, (typeof media)[number]>();
  const rank = (asset: (typeof media)[number]) => {
    if (asset.approvalState === 'APPROVED' && asset.isPrimary) return 0;
    if (asset.approvalState === 'APPROVED') return 1;
    if (asset.approvalState === 'REVIEW_REQUIRED') return 2;
    if (asset.approvalState === 'PENDING') return 3;
    return 4;
  };

  for (const asset of media) {
    if (asset.approvalState === 'REJECTED' || asset.approvalState === 'FAILED') continue;
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

function groupMediaByProduct(media: ReturnType<typeof reviewableIronSprueMediaAssets>) {
  const groups = new Map<string, { product: (typeof media)[number]['product']; assets: typeof media }>();

  for (const asset of media) {
    const key = asset.product?.id ?? `unassigned:${asset.id}`;
    const group = groups.get(key) ?? { product: asset.product, assets: [] };
    group.assets.push(asset);
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) => {
    return (left.product?.sku ?? 'zz').localeCompare(right.product?.sku ?? 'zz');
  });
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

async function ProductsSection({ searchParams }: { searchParams?: SearchParams }) {
  const { categories, brands, suppliers } = await getIronSprueAdminReferenceData();
  const search = param(searchParams, 'q');
  const brandId = param(searchParams, 'brandId');
  const categoryId = param(searchParams, 'categoryId');
  const supplierId = param(searchParams, 'supplierId');
  const publicationState = param(searchParams, 'state');
  const result = await listIronSprueAdminProducts({
    ...(search ? { search } : {}),
    ...(brandId ? { brandId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(publicationState && ['DRAFT', 'CONTENT_PENDING', 'MEDIA_PENDING', 'REVIEW_REQUIRED', 'READY', 'PUBLISHED', 'ARCHIVED'].includes(publicationState)
      ? { publicationState: publicationState as 'DRAFT' | 'CONTENT_PENDING' | 'MEDIA_PENDING' | 'REVIEW_REQUIRED' | 'READY' | 'PUBLISHED' | 'ARCHIVED' }
      : {}),
    pageSize: 81,
  });
  if (!result.products.length) return <EmptyNote>No Iron Sprue products found.</EmptyNote>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(150px,1fr))_auto]">
            <Field label="Search">
              <input name="q" defaultValue={param(searchParams, 'q') ?? ''} className={fieldClass} placeholder="SKU, title, barcode or MPN" />
            </Field>
            <Field label="State">
              <select name="state" defaultValue={publicationState ?? ''} className={fieldClass}>
                <option value="">All states</option>
                {['DRAFT', 'CONTENT_PENDING', 'MEDIA_PENDING', 'REVIEW_REQUIRED', 'READY', 'PUBLISHED', 'ARCHIVED'].map((state) => <option key={state} value={state}>{state}</option>)}
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
      {result.products.map((product) => (
        <Card key={product.id}>
          <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{product.customerTitle}</h2>
                  <StatePill>{product.publicationState}</StatePill>
                </div>
                <p className="mt-1 text-sm text-neutral-400">{product.sku} - {product.brand?.name ?? 'No brand'} - {product.category?.name ?? 'No category'} - {money(product.grossPriceMinor, product.currency)}</p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-300">{product.shortDescription ?? 'No short description recorded.'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-neutral-400">
                <p>Stock: <strong className="text-neutral-100">{product.inventory?.availableStock ?? 0}</strong></p>
                <p>Media: <strong className="text-neutral-100">{product.mediaAssets.length}</strong></p>
                <p>Reviews: <strong className="text-neutral-100">{product.contentReviews.length}</strong></p>
              </div>
              <ProductFlagForm product={product} />
            </div>
            <form action={updateIronSpruePublicationStateAction} className="grid content-start gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="Publication state">
                <select name="publicationState" defaultValue={product.publicationState} className={fieldClass}>
                  {['DRAFT', 'CONTENT_PENDING', 'MEDIA_PENDING', 'REVIEW_REQUIRED', 'READY', 'PUBLISHED', 'ARCHIVED'].map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </Field>
              <Button type="submit" variant="outline">Update state</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function InventorySection() {
  const rows = await listIronSprueAdminInventory();
  return (
    <Card>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="p-2">SKU</th><th className="p-2">Product</th><th className="p-2">Expected</th><th className="p-2">Received</th><th className="p-2">Damaged</th><th className="p-2">Missing</th><th className="p-2">Available</th><th className="p-2">Location</th></tr>
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
                <td className="p-2 font-semibold">{row.availableStock}</td>
                <td className="p-2">{row.locationCode}</td>
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
      {rows.map((row) => (
        <Card key={row.id}>
          <CardContent className="space-y-2">
            {'logoUrl' in row && row.logoUrl ? <img src={row.logoUrl} alt={row.logoAltText ?? row.name} className="max-h-16 max-w-48 object-contain" /> : null}
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">{row.name}</h2>
              <StatePill>{row.active ? 'ACTIVE' : 'INACTIVE'}</StatePill>
            </div>
            <p className="text-sm text-neutral-400">{row.slug}</p>
            {'featured' in row ? <p className="text-sm text-neutral-400">Featured: {row.featured ? 'Yes' : 'No'}</p> : null}
            {'website' in row && row.website ? <a className="text-sm text-accent" href={row.website} target="_blank" rel="noreferrer">Website</a> : null}
            <p className="text-sm text-neutral-400">{row._count.products} products</p>
          </CardContent>
        </Card>
      ))}
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

async function MediaSection() {
  const media = await listIronSprueAdminMediaAssets({ pageSize: 500 });
  const reviewableMedia = reviewableIronSprueMediaAssets(media);
  const productGroups = groupMediaByProduct(reviewableMedia);
  const hiddenCount = media.length - reviewableMedia.length;
  if (!reviewableMedia.length) return <EmptyNote>No reviewable Iron Sprue media assets found.</EmptyNote>;

  return (
    <div className="space-y-4">
      {hiddenCount > 0 ? (
        <p className="rounded-md border border-surface-line bg-surface-ink p-3 text-sm text-neutral-400">
          Hidden from this review queue: {hiddenCount} rejected, failed or superseded media record{hiddenCount === 1 ? '' : 's'}.
        </p>
      ) : null}
      {productGroups.map((group) => (
        <Card key={group.product?.id ?? group.assets[0]?.id}>
          <CardContent className="space-y-4">
            <div>
              <h2 className="font-bold">{group.product?.customerTitle ?? 'Unassigned media'}</h2>
              <p className="text-sm text-neutral-400">{group.product?.sku ?? 'No SKU'} - {group.product?.publicationState ?? 'No product state'}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {(['catalogue-primary', 'workshop-photography'] as const).map((role) => {
                const asset = group.assets.find((item) => item.role === role);
                if (!asset) {
                  return (
                    <div key={role} className="rounded-md border border-dashed border-surface-line bg-surface-ink p-4">
                      <StatePill>{role}</StatePill>
                      <p className="mt-4 text-sm text-neutral-400">No current {role === 'catalogue-primary' ? 'Image 2' : 'workshop'} media record is available for this product.</p>
                      <ProductMediaUploadForm product={group.product} role={role} />
                    </div>
                  );
                }
                const previewUrl = ironSprueMediaPreviewUrl(asset);
                return (
                  <div key={asset.id} className="grid gap-4 rounded-md border border-surface-line bg-surface-ink p-3 sm:grid-cols-[220px_1fr]">
                    <div className="rounded-md border border-surface-line bg-white p-2">
                      {previewUrl ? (
                        <img src={previewUrl} alt={asset.altText ?? asset.product?.customerTitle ?? asset.role} className="h-52 w-full object-contain" />
                      ) : (
                        <div className="flex h-52 items-center justify-center px-4 text-center text-sm text-neutral-500">
                          No storage key
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2"><StatePill>{asset.approvalState}</StatePill><StatePill>{asset.role}</StatePill>{asset.isPrimary ? <StatePill>PRIMARY</StatePill> : null}</div>
                      <p className="text-sm text-neutral-400">{asset.width ?? '?'}x{asset.height ?? '?'} - {asset.mimeType ?? 'unknown'}</p>
                      <p className="break-all text-xs text-neutral-500">{asset.storageKey ?? asset.url ?? 'No storage key'}</p>
                      <MediaActionForms mediaId={asset.id} />
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

async function ContentReviewSection() {
  const reviews = await listIronSprueAdminContentReviews({ pageSize: 80 });
  if (!reviews.length) return <EmptyNote>No content reviews found.</EmptyNote>;

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-bold">{review.product.customerTitle}</h2><p className="text-sm text-neutral-400">{review.product.sku} - {review.fieldName}</p></div>
              <StatePill>{review.status}</StatePill>
            </div>
            <pre className="max-h-52 overflow-auto rounded-md border border-surface-line bg-surface-ink p-3 text-xs text-neutral-300">{JSON.stringify(review.proposedValue, null, 2)}</pre>
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
      ))}
    </div>
  );
}

function HomepagePlacementForm({ record }: { record?: Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['homepagePlacements'][number] }) {
  const previewUrl = ironSprueAdminPreviewUrl(record?.imageUrl ?? null);
  return (
    <form action={saveIronSprueHomepagePlacementAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-2">
      <input type="hidden" name="id" value={record?.id ?? ''} />
      {previewUrl ? <img src={previewUrl} alt={record?.title ?? 'Homepage placement'} className="h-40 w-full rounded-md border border-surface-line object-cover md:col-span-2" /> : null}
      <Field label="Placement key"><input name="placementKey" defaultValue={record?.placementKey ?? 'homepage-main'} className={fieldClass} /></Field>
      <Field label="Title"><input name="title" defaultValue={record?.title ?? ''} required className={fieldClass} /></Field>
      <Field label="CTA label"><input name="ctaLabel" defaultValue={record?.ctaLabel ?? ''} className={fieldClass} /></Field>
      <Field label="CTA href"><input name="ctaHref" defaultValue={record?.ctaHref ?? ''} className={fieldClass} /></Field>
      <Field label="Image URL"><input name="imageUrl" defaultValue={record?.imageUrl ?? ''} className={fieldClass} /></Field>
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={record?.sortOrder ?? 0} className={fieldClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.active ?? false} /> Active</label>
      <Button type="submit">{record ? 'Save placement' : 'Create placement'}</Button>
    </form>
  );
}

type HeroLibraryItem = Awaited<ReturnType<typeof listIronSprueR2Objects>>[number];

function HeroForm({
  heroLibrary,
  record,
}: {
  heroLibrary: HeroLibraryItem[];
  record?: Awaited<ReturnType<typeof getIronSprueAdminStorefrontControls>>['heroes'][number];
}) {
  const previewUrl = ironSprueAdminPreviewUrl(record?.imageUrl ?? null);
  return (
    <form action={saveIronSprueHeroAction} className="grid gap-3 rounded-md border border-surface-line bg-surface-ink p-4 md:grid-cols-2">
      <input type="hidden" name="id" value={record?.id ?? ''} />
      {previewUrl ? <img src={previewUrl} alt={record?.headline ?? 'Iron Sprue hero'} className="h-64 w-full rounded-md border border-surface-line object-cover md:col-span-2" /> : null}
      <Field label="Headline"><input name="headline" defaultValue={record?.headline ?? ''} required className={fieldClass} /></Field>
      <Field label="Strapline"><input name="strapline" defaultValue={record?.strapline ?? ''} className={fieldClass} /></Field>
      <Field label="CTA label"><input name="ctaLabel" defaultValue={record?.ctaLabel ?? ''} className={fieldClass} /></Field>
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
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={record?.sortOrder ?? 0} className={fieldClass} /></Field>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={record?.active ?? false} /> Active</label>
      <Button type="submit">{record ? 'Save hero' : 'Create hero'}</Button>
    </form>
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

async function StorefrontSection({ section }: { section: string }) {
  const { homepagePlacements, heroes, specialOffers, auditLog } = await getIronSprueAdminStorefrontControls();
  const { brands } = await getIronSprueAdminReferenceData();
  const productOptions = section === 'special-offers' ? (await listIronSprueAdminProducts({ pageSize: 100 })).products : [];
  const heroLibrary = section === 'heroes'
    ? await listIronSprueR2Objects('marketing/heroes/', 80).catch(() => [] as HeroLibraryItem[])
    : [];

  if (section === 'homepage') {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent>
            <h2 className="font-bold">Create storefront placement</h2>
            <p className="mt-1 text-sm text-neutral-400">Use this for the promo strip, homepage modules, newsletter banner or other explicitly approved storefront placements.</p>
          </CardContent>
        </Card>
        <HomepagePlacementForm />
        {homepagePlacements.map((record) => <HomepagePlacementForm key={record.id} record={record} />)}
        <BrandCarouselManager brands={brands} />
      </div>
    );
  }

  if (section === 'heroes') {
    return (
      <div className="space-y-4">
        <HeroForm heroLibrary={heroLibrary} />
        {heroes.map((record) => <HeroForm key={record.id} record={record} heroLibrary={heroLibrary} />)}
        <HeroLibrary items={heroLibrary} />
      </div>
    );
  }

  if (section === 'special-offers') {
    return (
      <div className="space-y-4">
        <SpecialOfferForm products={productOptions} />
        {specialOffers.map((record) => <SpecialOfferForm key={record.id} record={record} products={productOptions} />)}
      </div>
    );
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
      <Card><CardContent><h2 className="font-bold">Database</h2><p className="mt-2"><StatePill>{dashboard.databaseStatus}</StatePill></p></CardContent></Card>
      <Card><CardContent><h2 className="font-bold">Worker read</h2><p className="mt-2"><StatePill>{dashboard.workerReadStatus}</StatePill></p></CardContent></Card>
      <Card><CardContent><h2 className="font-bold">R2</h2><p className="mt-2"><StatePill>{dashboard.r2Status}</StatePill></p></CardContent></Card>
      <Card><CardContent><h2 className="font-bold">Warnings</h2>{dashboard.warnings.length ? <ul className="mt-2 list-disc pl-5 text-sm text-amber-200">{dashboard.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-400">No warnings.</p>}</CardContent></Card>
    </div>
  );
}

export async function IronSprueAdminSection({ section, searchParams }: { section: string; searchParams?: SearchParams }) {
  const cards = getIronSprueAdminWorkspaceCards();
  const card = cards.find((item) => item.key === section);
  if (!card) notFound();

  return (
    <Section className="py-8">
      <Container className="space-y-6">
        <PageHeader eyebrow="Iron Sprue Admin" title={card.label} description={card.description} />
        {section === 'products' ? <ProductsSection {...(searchParams ? { searchParams } : {})} /> : null}
        {section === 'inventory' || section === 'goods-received' ? <InventorySection /> : null}
        {['categories', 'brands', 'suppliers'].includes(section) ? <ReferenceSection section={section} /> : null}
        {section === 'media' ? <MediaSection /> : null}
        {section === 'content-review' ? <ContentReviewSection /> : null}
        {['homepage', 'heroes', 'special-offers', 'audit-log', 'import-batches'].includes(section) ? <StorefrontSection section={section} /> : null}
        {section === 'settings' ? <SettingsSection /> : null}
        {section === 'orders' ? <EmptyNote>Iron Sprue commerce is not activated yet, so order actions remain intentionally unavailable.</EmptyNote> : null}
      </Container>
    </Section>
  );
}
