import type { ReactNode } from 'react';
import { Button, Card, CardContent, FormSection, Input } from '@tcg-hobby/ui';
import type { ReleaseSummary } from '@tcg-hobby/types';

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  game: string;
  categoryName: string;
  featured: boolean;
  published: boolean;
};

type ReleaseFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  categories: CategoryOption[];
  products: ProductOption[];
  release?: ReleaseSummary | null;
  children?: ReactNode;
};

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

export function ReleaseForm({ action, submitLabel, categories, products, release, children }: ReleaseFormProps) {
  const selectedProductIds = new Set(release?.products.map((product) => product.productId) ?? []);

  return (
    <form action={action} className="space-y-6">
      {release ? <input type="hidden" name="id" value={release.id} /> : null}

      <FormSection title="Release details" description="Core metadata that powers the coming soon hub and release calendar.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="name">
              Release name
            </label>
            <Input id="name" name="name" defaultValue={release?.name ?? ''} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="slug">
              Slug
            </label>
            <Input id="slug" name="slug" defaultValue={release?.slug ?? ''} placeholder="Optional custom slug" />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="brand">
              Brand
            </label>
            <Input id="brand" name="brand" defaultValue={release?.brand ?? ''} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="game">
              Game
            </label>
            <Input id="game" name="game" defaultValue={release?.game ?? ''} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="categoryId">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={categories.find((category) => category.name === release?.categoryName)?.id ?? categories[0]?.id ?? ''}
              className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="releaseDate">
              Release date
            </label>
            <Input id="releaseDate" name="releaseDate" type="datetime-local" defaultValue={toDateTimeLocal(release?.releaseDate)} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="expectedDispatchAt">
              Expected dispatch
            </label>
            <Input id="expectedDispatchAt" name="expectedDispatchAt" type="datetime-local" defaultValue={toDateTimeLocal(release?.expectedDispatchAt)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="expectedArrivalAt">
              Expected arrival
            </label>
            <Input id="expectedArrivalAt" name="expectedArrivalAt" type="datetime-local" defaultValue={toDateTimeLocal(release?.expectedArrivalAt)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Messaging" description="Announcement text and release notes shown across the launch surfaces.">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="announcementText">
              Announcement text
            </label>
            <textarea
              id="announcementText"
              name="announcementText"
              defaultValue={release?.announcementText ?? ''}
              rows={4}
              className="min-h-24 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="releaseNotes">
              Release notes
            </label>
            <textarea
              id="releaseNotes"
              name="releaseNotes"
              defaultValue={release?.releaseNotes ?? ''}
              rows={4}
              className="min-h-24 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Allocation and badges" description="Basic launch control settings and allocation messaging.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="allocationLimit">
              Allocation limit
            </label>
            <Input id="allocationLimit" name="allocationLimit" type="number" min="0" defaultValue={release?.products[0]?.allocationLimit ?? ''} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="customerPurchaseLimit">
              Customer limit
            </label>
            <Input id="customerPurchaseLimit" name="customerPurchaseLimit" type="number" min="0" defaultValue={release?.products[0]?.customerPurchaseLimit ?? ''} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="supplierAllocation">
              Supplier allocation
            </label>
            <Input id="supplierAllocation" name="supplierAllocation" type="number" min="0" defaultValue={release?.products[0]?.supplierAllocation ?? ''} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="lowAllocationThreshold">
              Low allocation
            </label>
            <Input id="lowAllocationThreshold" name="lowAllocationThreshold" type="number" min="0" defaultValue={release?.products[0]?.lowAllocationThreshold ?? ''} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="preorderBadgeLabel">
              Pre-order badge
            </label>
            <Input id="preorderBadgeLabel" name="preorderBadgeLabel" defaultValue={release?.products[0]?.preorderBadgeLabel ?? ''} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="comingSoonBadgeLabel">
              Coming soon badge
            </label>
            <Input id="comingSoonBadgeLabel" name="comingSoonBadgeLabel" defaultValue={release?.products[0]?.comingSoonBadgeLabel ?? ''} />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-surface-line bg-surface-ink p-4 text-sm text-neutral-300">
            <input type="checkbox" name="visible" defaultChecked={release?.visible ?? true} />
            Visible on storefront
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-surface-line bg-surface-ink p-4 text-sm text-neutral-300">
            <input type="checkbox" name="featuredOnHomepage" defaultChecked={release?.featuredOnHomepage ?? false} />
            Featured on homepage
          </label>
        </div>
      </FormSection>

      <FormSection title="Products" description="Choose which products belong to this release.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <label key={product.id} className="flex h-full cursor-pointer flex-col gap-2 rounded-lg border border-surface-line bg-surface-ink p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" name="productIds" value={product.id} defaultChecked={selectedProductIds.has(product.id)} />
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-50">{product.name}</p>
                  <p className="text-xs text-neutral-500">{product.game} . {product.categoryName}</p>
                </div>
              </div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">{product.slug}</p>
            </label>
          ))}
        </div>
      </FormSection>

      {children}

      <div className="flex items-center justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
