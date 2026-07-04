import { notFound } from 'next/navigation';
import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { PageHeader, StatusBadge } from '@tcg-hobby/ui';
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
