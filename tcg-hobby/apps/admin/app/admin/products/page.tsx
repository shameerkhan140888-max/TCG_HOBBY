import { Button, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, EmptyTableState, PageHeader, SearchToolbar, StatusBadge } from '@tcg-hobby/ui';
import { PriceBadge } from '@tcg-hobby/ui';
import { getAdminProducts } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function buildHref(current: Record<string, string>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/admin/products?${query}` : '/admin/products';
}

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

function formatPricingStatus(status: string) {
  if (status === 'FUTURE') return 'Pricing rule pending';
  return status.replaceAll('_', ' ');
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const search = asString(params.search);
  const game = asString(params.game);
  const productType = asString(params.productType);
  const brand = asString(params.brand);
  const category = asString(params.category);
  const supplier = asString(params.supplier);
  const status = asString(params.status);
  const sort = asString(params.sort) as 'newest' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | '';
  const page = Number.parseInt(asString(params.page) || '1', 10);
  const data = await getAdminProducts({ search, game, productType, brand, category, supplier, status, sort: sort || 'newest', page: Number.isFinite(page) ? page : 1, pageSize: 20 });
  const current = { search, game, productType, brand, category, supplier, status, sort: sort || 'newest' };

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Catalogue"
          title="Products"
          description="Search, sort, publish, archive, and review operational stock details."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <a href="/admin/products/import">Import CSV</a>
              </Button>
              <Button asChild>
                <a href="/admin/products/new">New product</a>
              </Button>
            </div>
          }
        />

        <SearchToolbar searchValue={search} searchPlaceholder="Search SKU, name, or description">
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[920px] lg:grid-cols-4">
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Game
              <select name="game" defaultValue={game} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All games</option>
                {data.games.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Product type
              <select name="productType" defaultValue={productType} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All types</option>
                {data.productTypes.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Brand
              <select name="brand" defaultValue={brand} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All brands</option>
                {data.brands.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Category
              <select name="category" defaultValue={category} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All categories</option>
                {data.categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Supplier
              <select name="supplier" defaultValue={supplier} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All suppliers</option>
                {data.suppliers.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Status
              <select name="status" defaultValue={status} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
              Sort
              <select name="sort" defaultValue={sort || 'newest'} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                <option value="newest">Newest</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="price-asc">Price low-high</option>
                <option value="price-desc">Price high-low</option>
              </select>
            </label>
          </div>
        </SearchToolbar>

        {data.products.length ? (
          <AdminTable columns={['Product', 'Category', 'Supplier', 'Retail', 'Cost ex VAT', 'Margin', 'Pricing source', 'Stock', 'Status', 'Actions']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.products.map((product) => (
                <tr key={product.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{product.name}</div>
                    <div className="text-xs text-neutral-500">{product.sku}</div>
                    {product.barcode ? <div className="text-xs text-neutral-500">Barcode {product.barcode}</div> : null}
                    <div className="text-xs text-neutral-500">{product.slug}</div>
                    <div className="text-xs text-neutral-500">{[product.brand, product.game, product.productType].filter(Boolean).join(' / ')}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.isAccessory ? <StatusBadge tone="neutral">Accessory</StatusBadge> : null}
                      {product.isStaffPick ? <StatusBadge tone="accent">Staff pick</StatusBadge> : null}
                      {product.isBestSeller ? <StatusBadge tone="warning">Best seller</StatusBadge> : null}
                      {product.isNewArrival ? <StatusBadge tone="success">New arrival</StatusBadge> : null}
                      {product.hideWhenOutOfStock ? <StatusBadge tone="neutral">Hide at zero stock</StatusBadge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{product.categoryName}</td>
                  <td className="px-4 py-4 text-neutral-300">{product.supplierName}</td>
                  <td className="px-4 py-4 text-neutral-300">{formatMoney(product.priceMinor)}</td>
                  <td className="px-4 py-4 text-neutral-300">
                    <PriceBadge label="Cost ex VAT" amountMinor={product.costExVatMinor} tone="accent" />
                    <p className="mt-1 text-xs text-neutral-500">from supplier cost</p>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div>{formatMoney(product.marginMinor)}</div>
                    <div className="text-xs text-neutral-500">{product.marginPercent}% margin</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-neutral-50">{product.priceSource}</div>
                      <div className="flex flex-wrap gap-2">
                        {product.manualOverride ? <StatusBadge tone="accent">Manual override</StatusBadge> : null}
                        <StatusBadge tone={product.priceStatus === 'ACTIVE' ? 'success' : product.priceStatus === 'MANUAL_OVERRIDE' ? 'accent' : 'warning'}>
                          {formatPricingStatus(product.priceStatus)}
                        </StatusBadge>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{product.availableStock} available</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={product.archivedAt ? 'neutral' : product.published ? 'success' : 'warning'}>
                        {product.archivedAt ? 'Archived' : product.published ? 'Published' : 'Hidden'}
                      </StatusBadge>
                      {product.availableStock <= product.reorderPoint ? <StatusBadge tone="warning">Low stock</StatusBadge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={`/admin/products/${product.id}`}>Open</a>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : (
          <EmptyTableState
            title="No products found"
            description="Try another search term, category, or supplier filter."
            action={
              <Button asChild variant="outline">
                <a href="/admin/products/new">Create product</a>
              </Button>
            }
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-400">
          <p>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            {data.pagination.hasPreviousPage ? (
              <Button asChild variant="outline" size="sm">
                <a href={buildHref(current, { page: String(data.pagination.page - 1) })}>Previous</a>
              </Button>
            ) : null}
            {data.pagination.hasNextPage ? (
              <Button asChild variant="outline" size="sm">
                <a href={buildHref(current, { page: String(data.pagination.page + 1) })}>Next</a>
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
