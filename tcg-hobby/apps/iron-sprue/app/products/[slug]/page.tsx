import launchProducts from '../../../data/launch-products.json';
import { type IronSprueProduct } from '../../../lib/catalogue';
import { featuredProducts, formatPrice, productAvailability, productImage } from '../../../lib/storefront';

const products = launchProducts as IronSprueProduct[];

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((candidate) => candidate.slug === slug);

  if (!product) {
    return (
      <section className="section-block">
        <p className="eyebrow">Product unavailable</p>
        <h1>Product not found</h1>
        <a className="button secondary" href="/shop">Back to shop</a>
      </section>
    );
  }

  return (
    <section className="section-block product-detail-page">
      <div className="product-detail">
        <div className="product-gallery">
          <div className="primary-product-image">
            {productImage(product) ? <img src={productImage(product) ?? ''} alt={product.name} width="1000" height="1000" /> : <span>{product.brand}</span>}
          </div>
          <div className="thumbnail-row">
            <button type="button" aria-label="Primary image" disabled />
            <button type="button" aria-label="Future gallery image" disabled />
            <button type="button" aria-label="Future specification image" disabled />
          </div>
        </div>

        <article className="product-buy-panel">
          <p className="eyebrow">{product.brand} / {product.category}</p>
          <h1>{product.name}</h1>
          <p className="lead">{product.shortDescription}</p>
          <p className="sku-line">SKU {product.sku} / Supplier SKU {product.supplierSku}</p>
          <div className="price-row">
            <strong>{formatPrice(product)}</strong>
            <span>inc VAT</span>
          </div>
          <span className="stock-badge">{productAvailability(product)}</span>
          <div className="quantity-row">
            <label htmlFor="quantity">Qty</label>
            <input id="quantity" type="number" min="1" max={Math.max(1, product.stockQuantity)} defaultValue="1" />
          </div>
          <div className="product-actions">
            <button type="button" disabled>Add to basket</button>
          </div>
          <div className="service-summary">
            <p><strong>Delivery</strong> UK delivery options shown before checkout.</p>
            <p><strong>Returns</strong> Returns information available before purchase.</p>
            <p><strong>Payments</strong> Visa, Mastercard, PayPal, Apple Pay and Google Pay planned.</p>
          </div>
        </article>
      </div>

      <div className="detail-panels">
        <article>
          <h2>Description</h2>
          <p>{product.description ?? product.shortDescription}</p>
        </article>
        <article>
          <h2>Build information</h2>
          <dl className="spec-grid">
            <div><dt>Manufacturer</dt><dd>{product.brand}</dd></div>
            <div><dt>Scale</dt><dd>{product.scale ?? 'To be confirmed'}</dd></div>
            <div><dt>Build type</dt><dd>{product.productType}</dd></div>
            <div><dt>Difficulty</dt><dd>{product.skillLevel ?? 'To be confirmed'}</dd></div>
            <div><dt>Glue required</dt><dd>{typeof product.glueRequired === 'boolean' ? (product.glueRequired ? 'Yes' : 'No') : 'To be confirmed'}</dd></div>
            <div><dt>Paint required</dt><dd>{typeof product.paintRequired === 'boolean' ? (product.paintRequired ? 'Yes' : 'No') : 'To be confirmed'}</dd></div>
          </dl>
        </article>
      </div>

      <section className="section-block compact">
        <div className="section-head split">
          <div>
            <p className="eyebrow">Recommended add-ons</p>
            <h2>Useful bench companions.</h2>
          </div>
          <a className="text-link" href="/shop?category=workshop-essentials">View add-ons</a>
        </div>
        <div className="addon-grid">
          {featuredProducts(products.slice().reverse(), 4).map((item) => (
            <a className="addon-card" href={`/products/${item.slug}`} key={item.sku}>
              <span>{item.brand}</span>
              <strong>{item.name}</strong>
              <small>{formatPrice(item)} inc VAT</small>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}
