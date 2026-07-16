import { notFound } from 'next/navigation';
import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { PageHeader, StatusBadge } from '@tcg-hobby/ui';
import { EmptyPricingState, PricingCard } from '@tcg-hobby/ui';
import { getAdminProductById, getAdminProducts } from '@tcg-hobby/database';
import { emptyProductFormValues } from '../../../../lib/admin-form-state';
import { archiveProductAction, toggleProductPublicationAction } from '../../../../lib/admin-actions.server';
import { ProductForm } from '../../../../components/product-form';

export const dynamic = 'force-dynamic';

type ParamsValue = { id: string };

function productState(product: NonNullable<Awaited<ReturnType<typeof getAdminProductById>>>) {
  return {
    fieldErrors: {},
    values: {
      ...emptyProductFormValues,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      game: product.game,
      setName: product.setName ?? '',
      description: product.description,
      longDescription: product.longDescription,
      condition: product.condition,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      priceMinor: String(product.priceMinor),
      costMinor: String(product.costMinor),
      stockOnHand: String(product.stockOnHand),
      reservedStock: String(product.reservedStock),
      reorderPoint: String(product.reorderPoint),
      locationCode: product.locationCode,
      imageLabel: product.imageLabel,
      primaryImageUrl: product.primaryImageUrl ?? '',
      galleryImageUrl: product.images[1]?.url ?? '',
      customerPurchaseLimit: product.customerPurchaseLimit != null ? String(product.customerPurchaseLimit) : '',
      availabilityMessage: product.availabilityMessage ?? '',
      featured: product.featured,
      published: product.published,
    },
  };
}

export default async function AdminProductDetailPage({ params }: { params: Promise<ParamsValue> }) {
  const { id } = await params;
  const [product, options] = await Promise.all([getAdminProductById(id), getAdminProducts({ page: 1, pageSize: 1 })]);

  if (!product) {
    notFound();
  }

  const state = productState(product);
  const pricingSnapshot = {
    costMinor: product.costMinor,
    retailMinor: product.priceMinor,
    buyMinor: product.buyMinor,
    marginMinor: product.marginMinor,
    markupPercent: product.markupPercent,
    profitMinor: product.profitMinor,
    minimumMarginPercent: product.minimumMarginPercent,
    maximumDiscountPercent: product.maximumDiscountPercent,
    priceSource: product.priceSource,
    priceStatus: product.priceStatus as 'ACTIVE' | 'MANUAL_OVERRIDE' | 'DISABLED' | 'FUTURE',
    manualOverride: product.manualOverride,
    updatedAt: product.priceUpdatedAt?.toISOString() ?? new Date().toISOString(),
  };

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Catalogue"
          title={product.name}
          description={product.slug}
          actions={
            <>
              <Button asChild variant="outline">
                <a href="/admin/products">Back</a>
              </Button>
              <form action={toggleProductPublicationAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="published" value={product.published ? 'false' : 'true'} />
                <Button type="submit" variant="secondary">
                  {product.published ? 'Unpublish' : 'Publish'}
                </Button>
              </form>
              <form action={archiveProductAction}>
                <input type="hidden" name="productId" value={product.id} />
                <Button type="submit" variant="outline">
                  Archive
                </Button>
              </form>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Status</p>
              <StatusBadge tone={product.archivedAt ? 'neutral' : product.published ? 'success' : 'warning'}>
                {product.archivedAt ? 'Archived' : product.published ? 'Published' : 'Hidden'}
              </StatusBadge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Retail</p>
              <p className="text-2xl font-black text-neutral-50">GBP {(product.priceMinor / 100).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Available stock</p>
              <p className="text-2xl font-black text-neutral-50">{product.availableStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="text-sm text-neutral-400">Margin</p>
              <p className="text-2xl font-black text-neutral-50">{product.marginPercent}%</p>
            </CardContent>
          </Card>
        </div>

        {product.priceUpdatedAt ? (
          <PricingCard
            snapshot={pricingSnapshot}
            title="Pricing snapshot"
            description="Current cost, retail, buy, and guard rails for this product."
          />
        ) : (
          <EmptyPricingState
            title="Pricing snapshot unavailable"
            description="Refresh the product or seed pricing data before staff can review buy and margin details."
          />
        )}

        <Card>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Import and merchandising</p>
              <h2 className="mt-1 text-xl font-black text-neutral-50">Product review details</h2>
            </div>
            <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-sm text-neutral-400">Import source</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.importSourceType ?? 'Manual admin product'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Lifecycle</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.lifecycleState}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Last imported</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.lastImportedAt ? product.lastImportedAt.toLocaleString('en-GB') : 'Not imported'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Homepage priority</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.homepagePriority ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Hero feature</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.heroFeatured ? 'Enabled' : 'Disabled'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Shipping promotion</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.freeUkStandardShipping ? 'Free UK standard delivery' : 'None'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Product-only shipping</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.shippingPromotionProductOnly ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Gallery images</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.imageCount}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Storefront preview</dt>
                <dd className="mt-1">
                  <a className="font-semibold text-accent underline underline-offset-4" href={`/catalogue/${product.slug}`}>
                    Preview product
                  </a>
                </dd>
              </div>
            </dl>
            {product.importSourceReference ? <p className="text-sm leading-6 text-neutral-300">{product.importSourceReference}</p> : null}
            {product.importValidationWarnings ? (
              <div className="rounded-lg bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
                {product.importValidationWarnings}
              </div>
            ) : null}
            {product.importAudits.length ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Recent import history</p>
                <div className="divide-y divide-neutral-800 rounded-lg bg-neutral-950/40">
                  {product.importAudits.map((audit) => (
                    <div key={audit.id} className="grid gap-2 p-3 text-sm md:grid-cols-[160px_1fr]">
                      <p className="text-neutral-400">{audit.createdAt.toLocaleString('en-GB')}</p>
                      <div className="space-y-1">
                        <p className="font-semibold text-neutral-50">{audit.lifecycleState}</p>
                        <p className="text-neutral-300">
                          Changed fields: {Array.isArray(audit.changedFields) ? audit.changedFields.join(', ') : 'Recorded'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ProductForm
          state={state}
          categories={options.categories.map((item) => ({ id: item.id, label: item.name }))}
          suppliers={options.suppliers.map((item) => ({ id: item.id, label: item.name }))}
          submitLabel="Save product"
        />
      </Container>
    </Section>
  );
}
