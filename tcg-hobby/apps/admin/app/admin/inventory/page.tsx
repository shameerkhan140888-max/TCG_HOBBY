import { Container, Section } from '@tcg-hobby/ui';
import { AdminTable, PageHeader, StatusBadge } from '@tcg-hobby/ui';
import { getAdminInventoryRows, getStockAdjustmentHistory } from '@tcg-hobby/database';
import { StockAdjustmentForm } from '../../../components/stock-adjustment-form';

export const dynamic = 'force-dynamic';

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amountMinor / 100);
}

export default async function AdminInventoryPage() {
  const rows = await getAdminInventoryRows();
  const history = await getStockAdjustmentHistory();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Inventory" title="Stock control" description="Review current stock, margin, and manual adjustment history." />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <AdminTable columns={['SKU', 'Product', 'Current', 'Reserved', 'Available', 'Supplier', 'Cost', 'Retail', 'Margin', 'Status']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {rows.map((row) => (
                <tr key={row.productId} className="align-top">
                  <td className="px-4 py-4 font-semibold text-neutral-50">{row.sku}</td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{row.name}</div>
                    <div className="text-xs text-neutral-500">{row.categoryName}</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{row.currentStock}</td>
                  <td className="px-4 py-4 text-neutral-300">{row.reservedStock}</td>
                  <td className="px-4 py-4 text-neutral-300">{row.availableStock}</td>
                  <td className="px-4 py-4 text-neutral-300">{row.supplierName}</td>
                  <td className="px-4 py-4 text-neutral-300">{formatMoney(row.costMinor)}</td>
                  <td className="px-4 py-4 text-neutral-300">{formatMoney(row.retailMinor)}</td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div>{formatMoney(row.marginMinor)}</div>
                    <div className="text-xs text-neutral-500">{row.marginPercent}%</div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={row.lowStock ? 'warning' : 'success'}>{row.lowStock ? 'Low stock' : 'Healthy'}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <StockAdjustmentForm products={rows.map((row) => ({ id: row.productId, label: `${row.name} (${row.sku})` }))} />
        </div>

        <AdminTable columns={['Product', 'Delta', 'Before', 'After', 'Reason', 'Performed by']}>
          <tbody className="divide-y divide-surface-line bg-surface-base">
            {history.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4 text-neutral-50">{item.productName}</td>
                <td className="px-4 py-4 text-neutral-300">{item.delta}</td>
                <td className="px-4 py-4 text-neutral-300">{item.beforeStock}</td>
                <td className="px-4 py-4 text-neutral-300">{item.afterStock}</td>
                <td className="px-4 py-4 text-neutral-300">{item.reason}</td>
                <td className="px-4 py-4 text-neutral-300">{item.performedBy ?? 'System'}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </Container>
    </Section>
  );
}
