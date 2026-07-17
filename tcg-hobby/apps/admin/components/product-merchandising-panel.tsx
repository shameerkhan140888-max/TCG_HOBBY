import { ProductRecommendationType, type AdminProductDetail, type AdminProductMerchandisingPanel } from '@tcg-hobby/database';
import { AdminTable, Button, Card, CardContent, FormSection, Input, StatusBadge } from '@tcg-hobby/ui';
import {
  addProductRecommendationAction,
  deleteProductRecommendationAction,
  saveProductMerchandisingSettingsAction,
  updateProductRecommendationAction,
} from '../lib/admin-actions.server';

type ProductMerchandisingPanelProps = {
  product: AdminProductDetail;
  merchandising: AdminProductMerchandisingPanel;
  searchValue: string;
  status?: string;
  message?: string;
};

const relationshipTypes = Object.values(ProductRecommendationType);

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

function stockTone(state: string): 'success' | 'warning' | 'neutral' {
  if (state === 'IN_STOCK') return 'success';
  if (state === 'LOW_STOCK') return 'warning';
  return 'neutral';
}

function statusMessage(status?: string, message?: string) {
  if (status === 'saved') return 'Merchandising settings saved.';
  if (status === 'created') return 'Manual recommendation created.';
  if (status === 'updated') return 'Manual recommendation updated.';
  if (status === 'deleted') return 'Manual recommendation removed.';
  if (status === 'error') return message ?? 'Unable to update merchandising.';
  return null;
}

export function ProductMerchandisingPanel({ product, merchandising, searchValue, status, message }: ProductMerchandisingPanelProps) {
  const notice = statusMessage(status, message);

  return (
    <div id="merchandising" className="space-y-6 scroll-mt-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Merchandising</p>
        <h2 className="mt-1 text-2xl font-black text-neutral-50">Merchandising management</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Control manual recommendations and merchandising flags. These controls influence ranking only; they never bypass publication, stock or storefront eligibility rules.
        </p>
      </div>

      {notice ? (
        <div className={`rounded-lg p-3 text-sm ${status === 'error' ? 'bg-amber-500/10 text-amber-100' : 'bg-emerald-500/10 text-emerald-100'}`}>
          {notice}
        </div>
      ) : null}

      <FormSection title="Merchandising settings" description="Manual signals used by the deterministic merchandising engine.">
        <form action={saveProductMerchandisingSettingsAction} className="space-y-5">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="productSlug" value={product.slug} />
          <div className="grid gap-4 lg:grid-cols-[minmax(180px,260px)_1fr]">
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-neutral-50">Recommendation weight</span>
              <Input name="recommendationWeight" type="number" min={-1000} max={1000} defaultValue={String(merchandising.settings.recommendationWeight)} />
              <span className="block text-xs leading-5 text-neutral-500">Whole number from -1000 to 1000. Higher weight helps break ties inside a strategy.</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Checkbox name="isAccessory" defaultChecked={merchandising.settings.isAccessory} label="Accessory" description="Eligible accessory products can fill remaining recommendation slots." />
              <Checkbox name="isStaffPick" defaultChecked={merchandising.settings.isStaffPick} label="Staff pick" description="Manual merchandising signal for curated product placements." />
              <Checkbox name="isBestSeller" defaultChecked={merchandising.settings.isBestSeller} label="Best seller" description="Use only when supported by sales data or an authorised merchandising decision." />
              <Checkbox name="isNewArrival" defaultChecked={merchandising.settings.isNewArrival} label="New arrival" description="Manual signal for new-arrival strategy placement." />
            </div>
          </div>
          <Button type="submit">Save merchandising settings</Button>
        </form>
      </FormSection>

      <FormSection title="Add manual recommendation" description="Search is bounded and excludes this source product plus already-linked targets.">
        <div className="space-y-4">
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" action={`/admin/products/${product.id}#merchandising`}>
            <label className="space-y-2 text-sm text-neutral-300">
              <span className="font-semibold text-neutral-50">Search product</span>
              <Input name="recommendationSearch" defaultValue={searchValue} placeholder="Search by name, SKU or slug" />
            </label>
            <Button type="submit" variant="outline" className="self-end">
              Search
            </Button>
          </form>

          {searchValue ? (
            merchandising.candidates.length ? (
              <form action={addProductRecommendationAction} className="grid gap-4 lg:grid-cols-[1fr_180px_150px_120px]">
                <input type="hidden" name="sourceProductId" value={product.id} />
                <input type="hidden" name="sourceProductSlug" value={product.slug} />
                <label className="space-y-2 text-sm text-neutral-300">
                  <span className="font-semibold text-neutral-50">Recommended product</span>
                  <select name="recommendedProductId" className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" required>
                    {merchandising.candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} ({candidate.sku || candidate.slug}) - {candidate.publicStockState.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <RelationshipTypeSelect name="relationshipType" defaultValue="RELATED" />
                <label className="space-y-2 text-sm text-neutral-300">
                  <span className="font-semibold text-neutral-50">Priority</span>
                  <Input name="priority" type="number" min={0} max={10000} defaultValue="100" />
                  <span className="block text-xs text-neutral-500">Lower number appears first.</span>
                </label>
                <div className="space-y-3">
                  <label className="mt-8 flex items-center gap-2 text-sm text-neutral-300">
                    <input name="active" type="checkbox" defaultChecked />
                    Active
                  </label>
                  <Button type="submit" className="w-full">
                    Add
                  </Button>
                </div>
              </form>
            ) : (
              <p className="rounded-lg bg-surface-ink p-3 text-sm text-neutral-400">No eligible search results for this query.</p>
            )
          ) : (
            <p className="text-sm text-neutral-500">Search for a product before adding a manual recommendation.</p>
          )}
        </div>
      </FormSection>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Manual recommendations</p>
            <h3 className="mt-1 text-xl font-black text-neutral-50">Relationships</h3>
            <p className="mt-2 text-sm text-neutral-400">Lower priority numbers rank first. Ineligible products stay linked but will not appear on the storefront until they become eligible.</p>
          </div>
          {merchandising.recommendations.length ? (
            <AdminTable columns={['Product', 'Type', 'Priority', 'State', 'Eligibility', 'Actions']}>
              <tbody className="divide-y divide-surface-line bg-surface-base">
                {merchandising.recommendations.map((recommendation) => (
                  <tr key={recommendation.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-neutral-50">{recommendation.recommendedProduct.name}</div>
                      <div className="text-xs text-neutral-500">{recommendation.recommendedProduct.sku || recommendation.recommendedProduct.slug}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge tone={stockTone(recommendation.recommendedProduct.publicStockState)}>{recommendation.recommendedProduct.publicStockState.replaceAll('_', ' ')}</StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RelationshipEditForm recommendation={recommendation} product={product} field="relationshipType" />
                    </td>
                    <td className="px-4 py-4">
                      <RelationshipEditForm recommendation={recommendation} product={product} field="priority" />
                    </td>
                    <td className="px-4 py-4">
                      <RelationshipEditForm recommendation={recommendation} product={product} field="active" />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={recommendation.eligibility.eligible ? 'success' : 'warning'}>{recommendation.eligibility.label}</StatusBadge>
                      {recommendation.eligibility.reasons.length ? <p className="mt-2 text-xs leading-5 text-neutral-400">{recommendation.eligibility.reasons.join(', ')}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <form action={deleteProductRecommendationAction} className="space-y-3">
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="productSlug" value={product.slug} />
                        <input type="hidden" name="recommendationId" value={recommendation.id} />
                        <label className="flex items-center gap-2 text-xs text-neutral-400">
                          <input type="checkbox" required />
                          Confirm remove {recommendation.relationshipType}
                        </label>
                        <Button type="submit" variant="outline" size="sm">
                          Remove
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          ) : (
            <p className="rounded-lg bg-surface-ink p-4 text-sm text-neutral-400">No manual recommendations have been added for this product.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Recommendation preview</p>
            <h3 className="mt-1 text-xl font-black text-neutral-50">Effective storefront order</h3>
            <p className="mt-2 text-sm text-neutral-400">Preview uses the actual merchandising engine. Manual recommendations rank first when active and eligible, then automatic strategies fill the remaining slots.</p>
          </div>
          {merchandising.preview.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {merchandising.preview.map((item) => (
                <div key={item.id} className="rounded-lg bg-surface-ink p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-accent">Position {item.position}</div>
                  <div className="mt-2 font-semibold text-neutral-50">{item.name}</div>
                  <div className="mt-1 text-sm text-neutral-400">{formatMoney(item.priceMinor)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={stockTone(item.publicStockState)}>{item.publicStockState.replaceAll('_', ' ')}</StatusBadge>
                    <StatusBadge tone={item.manual ? 'accent' : 'neutral'}>{item.manual ? 'Manual' : item.strategyId}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-surface-ink p-4 text-sm text-neutral-400">No eligible recommendations are currently available for this product.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Checkbox({ name, defaultChecked, label, description }: { name: string; defaultChecked: boolean; label: string; description: string }) {
  return (
    <label className="rounded-lg bg-surface-ink p-4 text-sm text-neutral-300">
      <span className="flex items-center gap-3">
        <input name={name} type="checkbox" defaultChecked={defaultChecked} />
        <span className="font-semibold text-neutral-50">{label}</span>
      </span>
      <span className="mt-2 block leading-6 text-neutral-400">{description}</span>
    </label>
  );
}

function RelationshipTypeSelect({ name, defaultValue }: { name: string; defaultValue: ProductRecommendationType }) {
  return (
    <label className="space-y-2 text-sm text-neutral-300">
      <span className="font-semibold text-neutral-50">Relationship type</span>
      <select name={name} defaultValue={defaultValue} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
        {relationshipTypes.map((type) => (
          <option key={type} value={type}>
            {type.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}

type RelationshipItem = AdminProductMerchandisingPanel['recommendations'][number];

function RelationshipEditForm({ recommendation, product, field }: { recommendation: RelationshipItem; product: AdminProductDetail; field: 'relationshipType' | 'priority' | 'active' }) {
  return (
    <form action={updateProductRecommendationAction} className="space-y-2">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="productSlug" value={product.slug} />
      <input type="hidden" name="recommendationId" value={recommendation.id} />
      {field === 'relationshipType' ? (
        <RelationshipTypeSelect name="relationshipType" defaultValue={recommendation.relationshipType} />
      ) : (
        <input type="hidden" name="relationshipType" value={recommendation.relationshipType} />
      )}
      {field === 'priority' ? (
        <Input name="priority" type="number" min={0} max={10000} defaultValue={String(recommendation.priority)} aria-label="Recommendation priority" />
      ) : (
        <input type="hidden" name="priority" value={recommendation.priority} />
      )}
      {field === 'active' ? (
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input name="active" type="checkbox" defaultChecked={recommendation.active} />
          Active
        </label>
      ) : recommendation.active ? (
        <input type="hidden" name="active" value="true" />
      ) : null}
      <Button type="submit" size="sm" variant="outline">
        Save
      </Button>
    </form>
  );
}
