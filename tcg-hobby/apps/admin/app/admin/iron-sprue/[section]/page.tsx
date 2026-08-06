import { notFound } from 'next/navigation';
import { getIronSprueAdminDashboard, getIronSprueAdminWorkspaceCards } from '@tcg-hobby/database';
import { Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { requireAdminSession } from '../../../../lib/auth.server';

export const dynamic = 'force-dynamic';

const sectionDetails: Record<string, { emptyTitle: string; emptyCopy: string; checks: string[] }> = {
  products: {
    emptyTitle: 'No Iron Sprue products yet',
    emptyCopy: 'The real catalogue import has not started. Product create/edit, duplicate SKU, publication and archive controls will operate here once data exists.',
    checks: ['Search by title, SKU, supplier code, barcode and MPN', 'Publication gate requires Image 2, price, content, SEO and specifications', 'Supplier costs are permission protected'],
  },
  inventory: {
    emptyTitle: 'No Iron Sprue inventory yet',
    emptyCopy: 'Inventory will appear after catalogue import and goods received. Zero values are expected before import.',
    checks: ['Negative stock is rejected', 'Movement history is audited', 'Hide-when-out-of-stock policy is preserved'],
  },
  'goods-received': {
    emptyTitle: 'No goods received batches yet',
    emptyCopy: 'Use this area for full receipts, partial receipts, missing units and damaged units after the PO catalogue exists.',
    checks: ['Full receipt', 'Partial receipt', 'Damaged and missing stock', 'Batch reference and audit trail'],
  },
  categories: {
    emptyTitle: 'No Iron Sprue categories yet',
    emptyCopy: 'Model Kits, 3D Puzzles and Builds, Tools, Adhesives and Finishing are imported or created here without TCG terminology.',
    checks: ['Store-scoped slugs', 'Sort order', 'Active/inactive state'],
  },
  brands: {
    emptyTitle: 'No stocked brands yet',
    emptyCopy: 'Official brand logos and carousel ordering are managed here. Placeholder or unofficial logos should not be published.',
    checks: ['Official logo URL', 'Featured carousel flag', 'Sort order'],
  },
  suppliers: {
    emptyTitle: 'No Iron Sprue suppliers yet',
    emptyCopy: 'Supplier records and protected cost context live here after explicit creation or import.',
    checks: ['Protected cost visibility', 'Supplier SKU matching', 'Internal notes stay private'],
  },
  media: {
    emptyTitle: 'No media pipeline records yet',
    emptyCopy: 'Image 2 catalogue-primary assets become the storefront primary only after approval. Raw originals remain reference/gallery assets.',
    checks: ['Iron Sprue R2 bucket only', 'Image 2 primary enforcement', 'Derivative retry and deletion safety'],
  },
  'content-review': {
    emptyTitle: 'No content reviews yet',
    emptyCopy: 'Generated or imported copy remains pending until factual conflicts are resolved and approved.',
    checks: ['Approve', 'Reject', 'Factual conflict blocks publication'],
  },
  'import-batches': {
    emptyTitle: 'No import batches yet',
    emptyCopy: 'The final Tasma catalogue/proforma has not been imported. Retry, skip and zero-quantity handling will be tracked here.',
    checks: ['Idempotency', 'Duplicate detection', 'Row retry and row skip'],
  },
  homepage: {
    emptyTitle: 'No homepage placements yet',
    emptyCopy: 'Homepage category, brand, feature and banner controls are Iron Sprue-scoped and separate from TCG.',
    checks: ['CTA route validation', 'Date activation', 'Brand/category ordering'],
  },
  heroes: {
    emptyTitle: 'No Admin hero records yet',
    emptyCopy: 'Hero carousel artwork and CTAs remain separate from catalogue images and must be replaceable through Admin.',
    checks: ['Display order', 'Active window', 'No baked-in CTA text in imagery'],
  },
  'special-offers': {
    emptyTitle: 'No special offers yet',
    emptyCopy: 'No real offers are created in this sprint. Offer controls validate price, date range and campaign copy later.',
    checks: ['Offer price cannot exceed normal price', 'Expired offers stop displaying', 'VAT-inclusive prices'],
  },
  orders: {
    emptyTitle: 'Orders are deferred until commerce activation',
    emptyCopy: 'Read-only order scoping is reserved for the commerce sprint. No Stripe or checkout work is active here.',
    checks: ['Iron Sprue order empty state', 'TCG orders cannot appear', 'Refund/payment actions excluded'],
  },
  settings: {
    emptyTitle: 'Settings are ready for configuration review',
    emptyCopy: 'Use this section to review environment status, role grants and operational warnings before catalogue import.',
    checks: ['Store indicator', 'Worker-read URL status', 'R2 bucket isolation'],
  },
  'audit-log': {
    emptyTitle: 'No audit entries yet',
    emptyCopy: 'Critical product, media, inventory, import and permission events will be recorded here once actions occur.',
    checks: ['Actor', 'Store', 'Entity', 'Before/after values where appropriate'],
  },
};

export default async function IronSprueAdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireAdminSession('/admin/iron-sprue');
  const { section } = await params;
  const cards = getIronSprueAdminWorkspaceCards();
  const card = cards.find((item) => item.key === section);
  const detail = sectionDetails[section];
  if (!card || !detail) notFound();
  const dashboard = await getIronSprueAdminDashboard();

  return (
    <Section className="py-8">
      <Container className="space-y-6">
        <PageHeader eyebrow="Iron Sprue Admin" title={card.label} description={card.description} />
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-surface-line px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">{card.status}</span>
              <span className="rounded-full border border-surface-line px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{card.requiredPermission}</span>
              <span className="rounded-full border border-surface-line px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{dashboard.storeCode}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black">{detail.emptyTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">{detail.emptyCopy}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {detail.checks.map((check) => (
                <div key={check} className="rounded-md border border-surface-line bg-surface-ink p-4 text-sm text-neutral-300">{check}</div>
              ))}
            </div>
            <p className="text-sm text-neutral-500">No real catalogue data, descriptions, media uploads, inventory seed, Stripe or Resend work is performed by this Admin section.</p>
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
