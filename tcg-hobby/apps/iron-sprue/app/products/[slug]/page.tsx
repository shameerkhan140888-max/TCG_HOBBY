import launchProducts from '../../../data/launch-products.json';
import { productPriceMinor, type IronSprueProduct } from '../../../lib/catalogue';

const products = launchProducts as IronSprueProduct[];

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((candidate) => candidate.slug === slug);

  if (!product) {
    return (
      <section className="band">
        <p className="eyebrow">Product unavailable</p>
        <h1>Product not found</h1>
        <a className="button secondary" href="/shop">Back to shop</a>
      </section>
    );
  }

  return (
    <section className="band">
      <div className="section-head">
        <p className="eyebrow">{product.brand} · {product.category}</p>
        <h1>{product.name}</h1>
        <p className="lead">{product.shortDescription}</p>
      </div>

      <div className="grid">
        <article className="card">
          <h2>Purchase details</h2>
          <p>£{(productPriceMinor(product) / 100).toFixed(2)} inc VAT</p>
          <p className="meta">Opening stock: {product.stockQuantity} unit{product.stockQuantity === 1 ? '' : 's'}</p>
          <button type="button" disabled>Add to basket via Node API</button>
        </article>
        <article className="card">
          <h2>Build information</h2>
          <p className="meta">Type: {product.productType}</p>
          <p className="meta">Scale: {product.scale ?? 'To be confirmed from supplier data'}</p>
          <p className="meta">Skill level: {product.skillLevel ?? 'To be confirmed from supplier data'}</p>
          <p className="meta">Glue required: {typeof product.glueRequired === 'boolean' ? (product.glueRequired ? 'Yes' : 'No') : 'To be confirmed'}</p>
          <p className="meta">Paint required: {typeof product.paintRequired === 'boolean' ? (product.paintRequired ? 'Yes' : 'No') : 'To be confirmed'}</p>
        </article>
        <article className="card">
          <h2>Source status</h2>
          <p className="meta">{product.assetContentStatus ?? 'Supplier asset status to be confirmed.'}</p>
          <p className="meta">Supplier SKU: {product.supplierSku}</p>
          <p className="meta">PO line: {product.line}</p>
        </article>
      </div>
    </section>
  );
}
