import launchProducts from '../../../data/launch-products.json';
import { ProductGallery } from '../../../components/product-gallery';
import { AddToBasketButton } from '../../../components/basket-client';
import { getIronSprueStorefrontProducts } from '../../../lib/admin-storefront-controls';
import { type IronSprueProduct } from '../../../lib/catalogue';
import { featuredProducts, formatPrice, productAvailability, productGalleryImages, productSellableQuantity } from '../../../lib/storefront';

const products = launchProducts as IronSprueProduct[];

export const dynamic = 'force-dynamic';

const specificationLabels: Record<string, string> = {
  manufacturer: 'Manufacturer',
  category: 'Category',
  productType: 'Product type',
  manufacturerReference: 'Manufacturer reference',
  scale: 'Scale',
  glueRequired: 'Glue required',
  paintRequired: 'Paint required',
};

function publicSpecifications(product: IronSprueProduct) {
  const source = product.specifications ?? {
    manufacturer: product.brand,
    category: product.category,
    productType: product.productType,
    manufacturerReference: product.manufacturerReference,
  };

  return Object.entries(source)
    .filter(([key, value]) => key in specificationLabels && value != null && String(value).trim().length > 0)
    .map(([key, value]) => [key, String(value)] as const);
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const storefrontProducts = await getIronSprueStorefrontProducts(products);
  const product = storefrontProducts.find((candidate) => candidate.slug === slug);

  if (!product) {
    return (
      <section className="section-block">
        <p className="eyebrow">Product unavailable</p>
        <h1>Product not found</h1>
        <a className="button secondary" href="/shop">Back to shop</a>
      </section>
    );
  }
  const galleryImages = productGalleryImages(product);
  const availableQuantity = productSellableQuantity(product);
  const isOutOfStock = availableQuantity <= 0;

  return (
    <section className="section-block product-detail-page">
      <div className="product-detail">
        <ProductGallery images={galleryImages} productName={product.name} fallbackLabel={product.brand} />

        <article className="product-buy-panel">
          <p className="eyebrow">{product.brand} / {product.category}</p>
          <h1>{product.name}</h1>
          <p className="lead">{product.shortDescription}</p>
          <p className="sku-line">SKU {product.sku} / Manufacturer Reference {product.manufacturerReference ?? product.supplierSku}</p>
          <div className="price-row">
            <strong>{formatPrice(product)}</strong>
            <span>inc VAT</span>
          </div>
          <span className={`stock-badge${isOutOfStock ? ' out-of-stock' : ''}`}>{productAvailability(product)}</span>
          <div className="quantity-row">
            <label htmlFor="quantity">Qty</label>
            <input id="quantity" type="number" min="1" max={Math.max(1, availableQuantity)} defaultValue="1" disabled={isOutOfStock} />
          </div>
          <div className="product-actions">
            <AddToBasketButton
              quantityInputId="quantity"
              item={{
                productId: product.sku,
                productName: product.name,
                productSlug: product.slug,
                unitPriceMinor: product.priceMinor ?? product.retailPriceMinor ?? 0,
                availableQuantity,
                imageUrl: galleryImages[0] ?? null,
                imageAlt: product.name,
              }}
            />
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
          {product.features?.length ? (
            <>
              <h3>Key details</h3>
              <ul>
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </>
          ) : null}
        </article>
        <article>
          <h2>Build information</h2>
          <dl className="spec-grid">
            {publicSpecifications(product).map(([key, value]) => (
              <div key={key}>
                <dt>{specificationLabels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
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
          {featuredProducts(storefrontProducts.slice().reverse(), 4).map((item) => (
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
