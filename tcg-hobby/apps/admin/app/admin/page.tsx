import { Button, Container, Section } from '@tcg-hobby/ui';
import { AdminTable, DataCard, PageHeader } from '@tcg-hobby/ui';
import { getAdminDashboardData } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amountMinor / 100);
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Operations"
          title="Admin dashboard"
          description="A commercial control surface for products, inventory, suppliers, and orders."
          actions={
            <>
              <Button asChild variant="outline">
                <a href="/admin/products">Products</a>
              </Button>
              <Button asChild>
                <a href="/admin/suppliers/new">New supplier</a>
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <DataCard key={metric.label} title={metric.label} value={metric.value} detail={metric.detail} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminTable columns={['Order', 'Customer', 'Status', 'Payment', 'Total']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.recentOrders.map((order) => (
                <tr key={order.orderNumber} className="align-top">
                  <td className="px-4 py-4 font-semibold text-neutral-50">
                    <a href={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</a>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">
                    <div>{order.customerName}</div>
                    <div className="text-xs text-neutral-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{order.status}</td>
                  <td className="px-4 py-4 text-neutral-300">{order.paymentStatus}</td>
                  <td className="px-4 py-4 font-semibold text-accent-soft">{formatMoney(order.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <AdminTable columns={['Product', 'Stock', 'Available', 'Reorder']}>
            <tbody className="divide-y divide-surface-line bg-surface-base">
              {data.lowStockProducts.map((product) => (
                <tr key={product.productId} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-50">{product.name}</div>
                    <div className="text-xs text-neutral-500">{product.sku}</div>
                  </td>
                  <td className="px-4 py-4 text-neutral-300">{product.currentStock}</td>
                  <td className="px-4 py-4 text-neutral-300">{product.availableStock}</td>
                  <td className="px-4 py-4 text-neutral-300">{product.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        <AdminTable columns={['Recently added product', 'Category', 'Published', 'Stock']}>
          <tbody className="divide-y divide-surface-line bg-surface-base">
            {data.recentlyAddedProducts.map((product) => (
              <tr key={product.id} className="align-top">
                <td className="px-4 py-4">
                  <div className="font-semibold text-neutral-50">
                    <a href={`/admin/products/${product.id}`}>{product.name}</a>
                  </div>
                  <div className="text-xs text-neutral-500">{product.sku}</div>
                </td>
                <td className="px-4 py-4 text-neutral-300">{product.categoryName}</td>
                <td className="px-4 py-4 text-neutral-300">{product.published ? 'Published' : 'Draft'}</td>
                <td className="px-4 py-4 text-neutral-300">{product.availableStock}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </Container>
    </Section>
  );
}
