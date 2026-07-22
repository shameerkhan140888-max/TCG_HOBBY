import { notFound } from 'next/navigation';
import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { PageHeader, StatusBadge } from '@tcg-hobby/ui';
import { EmptyPricingState, PricingCard } from '@tcg-hobby/ui';
import { getAdminProductById, getAdminProductMerchandisingPanel, getAdminProducts, getCatalogueMasterDataOptions, getProductContentWorkspace, type GeneratedContentField, type GeneratedProductContent, type ProductFactInput } from '@tcg-hobby/database';
import { emptyProductFormValues } from '../../../../lib/admin-form-state';
import { archiveProductAction, toggleProductPublicationAction } from '../../../../lib/admin-actions.server';
import { buildStorefrontProductPreviewUrl } from '../../../../lib/site';
import { ProductForm } from '../../../../components/product-form';
import { ProductMerchandisingPanel } from '../../../../components/product-merchandising-panel';
import { ProductMediaManager } from '../../../../components/product-media-manager';
import { ProductContentAssistant } from '../../../../components/product-content-assistant';

export const dynamic = 'force-dynamic';

type ParamsValue = { id: string };
type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function toDateTimeLocal(value: Date | null) {
  if (!value) return '';
  return value.toISOString().slice(0, 16);
}

function toGalleryImagesText(product: NonNullable<Awaited<ReturnType<typeof getAdminProductById>>>) {
  return product.images
    .filter((image) => !image.isPrimary && !image.storageKey)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => `${image.url} | ${image.altText} | ${image.imageType}`)
    .join('\n');
}

function productState(product: NonNullable<Awaited<ReturnType<typeof getAdminProductById>>>) {
  const legacyPrimary = product.images.find((image) => image.isPrimary && !image.storageKey) ?? product.images.find((image) => !image.storageKey);
  return {
    fieldErrors: {},
    values: {
      ...emptyProductFormValues,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode ?? '',
      brand: product.brand ?? '',
      game: product.game,
      setName: product.setName ?? '',
      productType: product.productType ?? '',
      language: product.language ?? '',
      gameId: product.gameId ?? '',
      brandId: product.brandId ?? '',
      productTypeId: product.productTypeId ?? '',
      languageId: product.languageId ?? '',
      setId: product.setId ?? '',
      description: product.description,
      longDescription: product.longDescription,
      condition: product.condition,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      priceMinor: String(product.priceMinor),
      rrpMinor: product.rrpMinor != null ? String(product.rrpMinor) : '',
      salePriceMinor: product.salePriceMinor != null ? String(product.salePriceMinor) : '',
      saleStartsAt: toDateTimeLocal(product.saleStartsAt),
      saleEndsAt: toDateTimeLocal(product.saleEndsAt),
      vatRate: String(product.vatRate),
      costMinor: String(product.costMinor),
      landedCostMinor: product.landedCostMinor != null ? String(product.landedCostMinor) : '',
      supplierSku: product.supplierSku,
      supplierProductUrl: product.supplierProductUrl ?? '',
      minimumOrderQuantity: String(product.minimumOrderQuantity),
      packQuantity: product.packQuantity != null ? String(product.packQuantity) : '',
      supplierLeadTimeDays: String(product.leadTimeDays),
      stockOnHand: String(product.stockOnHand),
      reservedStock: String(product.reservedStock),
      availableStock: String(product.availableStock),
      reorderPoint: String(product.reorderPoint),
      reorderQuantity: String(product.reorderQuantity),
      incomingQuantity: String(product.incomingQuantity),
      locationCode: product.locationCode,
      imageLabel: product.imageLabel,
      primaryImageUrl: legacyPrimary?.url ?? '',
      primaryImageAlt: legacyPrimary?.altText ?? product.imageLabel,
      galleryImagesText: toGalleryImagesText(product),
      customerPurchaseLimit: product.customerPurchaseLimit != null ? String(product.customerPurchaseLimit) : '',
      availabilityMessage: product.availabilityMessage ?? '',
      seoTitle: product.seoTitle ?? '',
      metaDescription: product.metaDescription ?? '',
      canonicalUrl: product.canonicalUrl ?? '',
      ogImageUrl: product.ogImageUrl ?? '',
      noindex: product.noindex,
      featured: product.featured,
      published: product.published,
      hideWhenOutOfStock: product.hideWhenOutOfStock,
    },
  };
}

export default async function AdminProductDetailPage({ params, searchParams }: { params: Promise<ParamsValue>; searchParams: Promise<SearchParamsValue> }) {
  const { id } = await params;
  const query = await searchParams;
  const recommendationSearch = asString(query.recommendationSearch);
  const merchandisingStatus = asString(query.merchandisingStatus);
  const merchandisingMessage = asString(query.merchandisingMessage);
  const productStatus = asString(query.productStatus);
  const [product, options, merchandising, masterData, contentWorkspace] = await Promise.all([
    getAdminProductById(id),
    getAdminProducts({ page: 1, pageSize: 1 }),
    getAdminProductMerchandisingPanel(id, { search: recommendationSearch }),
    getCatalogueMasterDataOptions(),
    getProductContentWorkspace(id),
  ]);

  if (!product || !merchandising || !contentWorkspace) {
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
                <dt className="text-sm text-neutral-400">Out-of-stock visibility</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.hideWhenOutOfStock ? 'Hide from listings at zero stock' : 'Remain visible at zero stock'}</dd>
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
                <dt className="text-sm text-neutral-400">Barcode</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.barcode ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Product type</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.productType ?? 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Supplier SKU</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.supplierSku || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Supplier lead time</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.leadTimeDays} days</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Incoming stock</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.incomingQuantity}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">SEO indexing</dt>
                <dd className="mt-1 font-semibold text-neutral-50">{product.noindex ? 'Noindex' : 'Indexable'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-400">Storefront preview</dt>
                <dd className="mt-1">
                  <a
                    className="font-semibold text-accent underline underline-offset-4"
                    href={buildStorefrontProductPreviewUrl(product.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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

        {productStatus === 'created' || productStatus === 'updated' ? (
          <div role="status" className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
            {productStatus === 'created' ? 'Product created successfully.' : 'Product saved successfully.'}
          </div>
        ) : null}


        <ProductMediaManager
          productId={product.id}
          initialImages={product.images.map((image) => ({
            id: image.id,
            url: image.url,
            thumbnailUrl: image.thumbnailUrl,
            storageKey: image.storageKey,
            altText: image.altText,
            sortOrder: image.sortOrder,
            isPrimary: image.isPrimary,
            width: image.width,
            height: image.height,
            byteSize: image.byteSize,
          }))}
        />

        <ProductContentAssistant
          productId={product.id}
          lifecycleState={product.lifecycleState}
          initialFacts={contentWorkspace.facts.map((fact) => ({
            key: fact.key as ProductFactInput['key'],
            value: fact.value,
            verificationState: fact.verificationState as ProductFactInput['verificationState'],
            sourceReference: fact.sourceReference,
            notes: fact.notes,
          }))}
          generations={contentWorkspace.contentGenerations.map((generation) => ({
            id: generation.id,
            status: generation.status,
            provider: generation.provider,
            model: generation.model,
            createdAt: generation.createdAt.toISOString(),
            generatedContent: generation.generatedContent as unknown as GeneratedProductContent,
            requestedFields: generation.requestedFields as unknown as GeneratedContentField[],
          }))}
        />
        <ProductForm
          state={state}
          categories={options.categories.map((item) => ({ id: item.id, label: item.name }))}
          suppliers={options.suppliers.map((item) => ({ id: item.id, label: item.name }))}
          games={masterData.games.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          brands={masterData.brands.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          productTypes={masterData.productTypes.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          languages={masterData.languages.map((item) => ({ id: item.id, label: item.name, active: item.active }))}
          sets={masterData.sets.map((item) => ({ id: item.id, label: item.name, active: item.active, gameId: item.gameId }))}
          submitLabel="Save product"
        />

        <ProductMerchandisingPanel
          product={product}
          merchandising={merchandising}
          searchValue={recommendationSearch}
          status={merchandisingStatus}
          message={merchandisingMessage}
        />
      </Container>
    </Section>
  );
}
