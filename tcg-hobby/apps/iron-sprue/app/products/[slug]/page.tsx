import launchProducts from '../../../data/launch-products.json';
import React from 'react';
import type { Metadata } from 'next';
import { ProductGallery } from '../../../components/product-gallery';
import { ironSprueBrand } from '../../../lib/brand';
import { AddToBasketButton } from '../../../components/basket-client';
import { getIronSprueStorefrontProducts } from '../../../lib/admin-storefront-controls';
import { type IronSprueProduct } from '../../../lib/catalogue';
import { formatPrice, productAvailability, productAvailabilityClass, productDetailAddons, productGalleryImages, productImage, productSellableQuantity } from '../../../lib/storefront';
import { addIronSprueWishlistItemAction } from '../../../lib/wishlist-actions';

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((candidate) => candidate.slug === slug);
  if (!product) return { title: 'Product unavailable' };
  const image = productImage(product);
  const title = product.seoTitle || `${product.name} by ${product.brand}`;
  const description = product.metaDescription || product.shortDescription;
  const url = `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/products/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'Iron Sprue',
      title,
      description,
      url,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
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
  const availabilityClass = productAvailabilityClass(product);
  const addonProducts = productDetailAddons(storefrontProducts, product.sku, 4);

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
          <span className={`stock-badge ${availabilityClass}`}>{productAvailability(product)}</span>
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
            <form action={addIronSprueWishlistItemAction}>
              <input type="hidden" name="sku" value={product.sku} />
              <input type="hidden" name="slug" value={product.slug} />
              <button type="submit" className="button secondary">Save to wishlist</button>
            </form>
          </div>
          <div className="service-summary">
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg></span><span><strong>Delivery</strong> UK delivery options and costs are confirmed before payment. Free UK delivery applies on eligible orders over £75.</span></p>
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8l8-4 8 4-8 4zM4 8v8l8 4V12zM20 8v8l-8 4V12z" /></svg></span><span><strong>Returns</strong> Unused items can be returned in line with the published returns policy.</span></p>
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4h12v16H6zM9 8h4a3 3 0 0 1 0 6h-2v3H9zm2 2v2h2a1 1 0 0 0 0-2z" /></svg></span><span><strong>Payments</strong> Secure card payments are handled by the embedded payment form. Digital wallets may appear where supported.</span></p>
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
          {addonProducts.map((item) => {
            const addonImage = productImage(item);
            const addonAvailableQuantity = productSellableQuantity(item);
            return (
              <article className="addon-card" key={item.sku}>
                <a className="addon-card-link" href={`/products/${item.slug}`}>
                  {addonImage ? <img src={addonImage} alt={item.name} /> : null}
                  <span>{item.brand}</span>
                  <strong>{item.name}</strong>
                  <small>{formatPrice(item)} inc VAT</small>
                </a>
                <AddToBasketButton
                  item={{
                    productId: item.sku,
                    productName: item.name,
                    productSlug: item.slug,
                    unitPriceMinor: item.priceMinor ?? item.retailPriceMinor ?? 0,
                    availableQuantity: addonAvailableQuantity,
                    imageUrl: addonImage ?? null,
                    imageAlt: item.name,
                  }}
                />
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
