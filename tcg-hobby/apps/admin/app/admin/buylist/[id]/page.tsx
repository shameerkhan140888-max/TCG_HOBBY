import { notFound } from 'next/navigation';
import { Button, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, DataCard, FormSection, PageHeader } from '@tcg-hobby/ui';
import { BuylistStatusBadge, MoneyInput, PriceBadge } from '@tcg-hobby/ui';
import { getAdminBuylistById } from '@tcg-hobby/database';
import { updateAdminBuylistAction } from '../../../../lib/buylist-actions.server';

export const dynamic = 'force-dynamic';

type ParamsValue = { id: string };

function formatDate(value: Date | null) {
  return value ? value.toLocaleString('en-GB') : '-';
}

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

export default async function AdminBuylistDetailPage({ params }: { params: Promise<ParamsValue> }) {
  const { id } = await params;
  const buylist = await getAdminBuylistById(id);

  if (!buylist) {
    notFound();
  }

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Buylist"
          title={buylist.buylistNumber}
          description={`Customer ${buylist.user.email}`}
          actions={
            <Button asChild variant="outline">
              <a href="/admin/buylist">Back to list</a>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DataCard title="Status" value={buylist.status} footer={<BuylistStatusBadge status={buylist.status} />} />
          <DataCard title="Estimated payout" value={formatMoney(buylist.estimatedPayoutMinor)} footer={<PriceBadge label="Estimated" amountMinor={buylist.estimatedPayoutMinor} tone="accent" />} />
          <DataCard title="Offered payout" value={formatMoney(buylist.offeredPayoutMinor)} footer={<PriceBadge label="Offered" amountMinor={buylist.offeredPayoutMinor} tone="neutral" />} />
          <DataCard title="Item count" value={String(buylist.itemCount)} detail="Products submitted by the customer" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <AdminTable columns={['Product', 'Qty', 'Estimated', 'Offered']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {buylist.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{item.productName}</div>
                    <div className="text-xs text-neutral-500">{item.productSlug}</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{item.quantity}</td>
                  <td className="px-4 py-4 text-neutral-300">
                    <PriceBadge label="Estimated" amountMinor={item.lineEstimatedPayoutMinor} tone="accent" />
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    <PriceBadge label="Offered" amountMinor={item.lineOfferedPayoutMinor} tone="neutral" />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <form action={updateAdminBuylistAction} className="space-y-4">
            <input type="hidden" name="buylistId" value={buylist.id} />
            <input type="hidden" name="redirectTo" value={`/admin/buylist/${buylist.id}`} />

            <FormSection title="Workflow" description="Move the submission through intake and capture staff notes.">
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Status
                <select
                  name="status"
                  defaultValue={buylist.status}
                  className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="RECEIVED">Received</option>
                  <option value="UNDER_REVIEW">Under review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PAID">Paid</option>
                </select>
              </label>
              <MoneyInput label="Offered payout minor units" name="offeredPayoutMinor" defaultValue={buylist.offeredPayoutMinor} />
              <label className="space-y-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-wide text-neutral-500">Payment reference</span>
                <input
                  name="paymentReference"
                  defaultValue={buylist.paymentReference ?? ''}
                  className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Bank transfer or payment note"
                />
              </label>
              <label className="space-y-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-wide text-neutral-500">Paid at</span>
                <input
                  type="datetime-local"
                  name="paidAt"
                  className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="space-y-2 text-sm text-neutral-300">
                <span className="text-xs uppercase tracking-wide text-neutral-500">Staff notes</span>
                <textarea
                  name="staffNotes"
                  defaultValue={buylist.staffNotes ?? ''}
                  rows={6}
                  className="w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Condition check notes, offer changes, and internal observations."
                />
              </label>
              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </FormSection>

            <FormSection title="Lifecycle" description="Capture the key timestamps for this request.">
              <div className="grid gap-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Submitted</span>
                  <span>{formatDate(buylist.submittedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Received</span>
                  <span>{formatDate(buylist.receivedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Reviewed</span>
                  <span>{formatDate(buylist.reviewedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Approved</span>
                  <span>{formatDate(buylist.approvedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">Paid</span>
                  <span>{formatDate(buylist.paidAt)}</span>
                </div>
              </div>
            </FormSection>
          </form>
        </div>
      </Container>
    </Section>
  );
}
