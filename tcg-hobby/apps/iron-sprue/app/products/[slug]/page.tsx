import launchProducts from '../../../data/launch-products.json';
import React from 'react';
import type { Metadata } from 'next';
import { ProductGallery } from '../../../components/product-gallery';
import { ironSprueBrand } from '../../../lib/brand';
import { AddToBasketButton } from '../../../components/basket-client';
import { getIronSprueStorefrontProducts } from '../../../lib/admin-storefront-controls';
import { type IronSprueProduct } from '../../../lib/catalogue';
import { getIronSprueProductionApiProduct, shouldUseIronSprueProductionApi } from '../../../lib/production-api';
import { formatPrice, productAvailability, productAvailabilityClass, productCommerceId, productDetailAddons, productGalleryImages, productImage, productSellableQuantity } from '../../../lib/storefront';
import { addIronSprueWishlistItemAction } from '../../../lib/wishlist-actions';

const products = launchProducts as IronSprueProduct[];

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  if (shouldUseIronSprueProductionApi()) return [];
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = shouldUseIronSprueProductionApi()
    ? await getIronSprueProductionApiProduct(slug)
    : products.find((candidate) => candidate.slug === slug);
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
  const [storefrontProducts, apiProduct] = await Promise.all([
    getIronSprueStorefrontProducts(products),
    shouldUseIronSprueProductionApi() ? getIronSprueProductionApiProduct(slug) : Promise.resolve(null),
  ]);
  const product = apiProduct ?? storefrontProducts.find((candidate) => candidate.slug === slug);

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
  const addonProducts = productDetailAddons(storefrontProducts, product.sku, 6);

  return (
    <section className="section-block product-detail-page">
      <article className="product-unified-panel">
        <div className="product-detail product-unified-grid">
          <div className="product-story-panel">
            <ProductGallery images={galleryImages} productName={product.name} fallbackLabel={product.brand} />

            <section className="product-description-panel" aria-labelledby="product-description-heading">
              <h2 id="product-description-heading">Description</h2>
              <p>{product.description ?? product.shortDescription}</p>
            </section>
          </div>

          <div className="product-buy-panel">
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
                  productId: productCommerceId(product),
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
                <button type="submit" className="wishlist-button" aria-label={`Save ${product.name} to wishlist`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 20s-7-4.4-9-9.2C1.7 7.6 3.6 5 6.6 5c1.8 0 3.2 1 4 2.2C11.4 6 12.8 5 14.6 5c3 0 4.9 2.6 3.6 5.8C19 15.6 12 20 12 20Z" />
                  </svg>
                  <span className="sr-only">Save to wishlist</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <section className="product-specification-zone" aria-labelledby="product-build-information-heading">
          <div>
            <h2 id="product-build-information-heading">Build information</h2>
            {product.features?.length ? (
              <ul className="product-key-details">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <section className="service-summary product-reassurance" aria-label="Delivery returns and payment information">
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg></span><span><strong>Delivery</strong> UK standard delivery is £3.99 unless a promotion or basket threshold applies. Costs are confirmed before payment.</span></p>
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8l8-4 8 4-8 4zM4 8v8l8 4V12zM20 8v8l-8 4V12z" /></svg></span><span><strong>Returns</strong> Unused items can be returned in line with the published returns policy.</span></p>
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4h12v16H6zM9 8h4a3 3 0 0 1 0 6h-2v3H9zm2 2v2h2a1 1 0 0 0 0-2z" /></svg></span><span><strong>Payments</strong> Secure card payments are handled by Stripe at checkout. Digital wallets may appear where supported.</span></p>
          </section>
        </section>
      </article>

      {addonProducts.length ? (
        <section className="section-block compact pdp-addon-panel">
          <div className="section-head split">
            <div>
              <p className="eyebrow">Recommended add-ons</p>
              <h2>Useful bench companions.</h2>
            </div>
            <a className="text-link" href="/shop?category=workshop-essentials">View add-ons</a>
          </div>
          <div className="addon-grid" aria-label="Recommended add-on products">
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
                      productId: productCommerceId(item),
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
      ) : null}
    </section>
  );
}
