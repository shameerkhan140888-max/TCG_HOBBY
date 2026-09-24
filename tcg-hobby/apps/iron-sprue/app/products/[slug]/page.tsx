import launchProducts from '../../../data/launch-products.json';
import React from 'react';
import type { Metadata } from 'next';
import { AddonCarousel } from '../../../components/addon-carousel';
import { ProductGallery } from '../../../components/product-gallery';
import { ProductAnalyticsEvent } from '../../../components/product-analytics-event';
import { PaymentMethodStrip } from '../../../components/payment-method-strip';
import { DeliveryReassuranceIcon, ReturnsReassuranceIcon, SecurePaymentReassuranceIcon } from '../../../components/reassurance-icons';
import { ironSprueBrand } from '../../../lib/brand';
import { AddToBasketButton } from '../../../components/basket-client';
import { getIronSprueStorefrontProducts } from '../../../lib/admin-storefront-controls';
import { type IronSprueProduct } from '../../../lib/catalogue';
import { ironSprueStandardDeliverySummary } from '../../../lib/delivery-rules';
import { getIronSprueProductionApiProduct, shouldUseIronSprueProductionApi } from '../../../lib/production-api';
import { conciseProductLead, customerProductDescription, formatPrice, productAvailability, productAvailabilityClass, productCommerceId, productDetailAddons, productGalleryImages, productImage, productSellableQuantity, slugForCategory } from '../../../lib/storefront';
import { addIronSprueWishlistItemAction } from '../../../lib/wishlist-actions';

const products = launchProducts as IronSprueProduct[];

export const dynamic = 'force-dynamic';

const productSpecificationLabels: Record<string, string> = {
  assemblyMethod: 'Assembly method',
  buildType: 'Build format',
  buildLevel: 'Build level',
  category: 'Category',
  contents: 'Contents',
  dimensions: 'Finished size',
  glueRequirement: 'Glue requirement',
  manufacturer: 'Manufacturer',
  material: 'Material',
  pieces: 'Piece count',
  pieceCount: 'Piece count',
  productType: 'Product type',
  scale: 'Scale',
  size: 'Finished size',
  structure: 'Structure',
  subject: 'Subject',
  theme: 'Theme',
  vehicleManufacturer: 'Vehicle marque',
};

const hiddenSpecificationKeys = new Set([
  'adminSourceReference',
  'bundleComponents',
  'bundleSavingMinor',
  'bundleSavingPercent',
  'componentSummary',
  'catalogueReference',
  'individualTotalMinor',
  'manufacturerReference',
  'publicationNote',
  'sourceReference',
  'supplierCode',
  'supplierReference',
  'supplierSku',
]);

function normaliseSpecificationValue(value: unknown) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(vases|models|kits|builds|objects|vehicles|pieces)\b/g, (match) => match.slice(0, -1))
    .trim();
}

function customerFacingSpecifications(product: IronSprueProduct) {
  const raw = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications)
    ? product.specifications
    : {};
  const entries = Object.entries(raw);
  const buildType = normaliseSpecificationValue(raw.buildType ?? '');
  const category = normaliseSpecificationValue(raw.category ?? product.category ?? '');
  const productType = normaliseSpecificationValue(raw.productType ?? '');
  const seenKeys = new Set<string>();
  const seenValues = new Set<string>();

  return entries
    .filter(([key, value]) => !hiddenSpecificationKeys.has(key) && value != null && String(value).trim().length > 0)
    .filter(([key]) => !(key === 'productType' && productType.length > 0 && productType === buildType))
    .filter(([key, value]) => {
      const normalisedValue = normaliseSpecificationValue(value);
      const canonicalKey = key === 'size' ? 'dimensions' : key === 'pieces' ? 'pieceCount' : key;
      if ((key === 'structure' || key === 'productType') && normalisedValue === category) return false;
      if (canonicalKey === 'productType' && normalisedValue === buildType) return false;
      if (seenKeys.has(canonicalKey) || seenValues.has(normalisedValue)) return false;
      seenKeys.add(canonicalKey);
      seenValues.add(normalisedValue);
      return true;
    })
    .map(([key, value]) => {
      const canonicalKey = key === 'size' ? 'dimensions' : key === 'pieces' ? 'pieceCount' : key;
      return {
        key: canonicalKey,
        label: productSpecificationLabels[canonicalKey] ?? canonicalKey.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase()),
        value: String(value).trim(),
      };
    });
}

function customerFacingFeatures(product: IronSprueProduct, specifications: ReturnType<typeof customerFacingSpecifications>) {
  const specificationValues = new Set(specifications.map((specification) => specification.value.toLowerCase()));
  const specificationWords = specifications.flatMap((specification) => String(specification.value).toLowerCase().split(/\W+/).filter(Boolean));
  const canonicalFragments = new Set([
    product.brand.toLowerCase(),
    product.category.toLowerCase(),
    product.productType.toLowerCase(),
    product.name.toLowerCase(),
    ...(product.scale ? [product.scale.toLowerCase()] : []),
  ]);

  return (product.features ?? [])
    .map((feature) => feature.trim())
    .filter(Boolean)
    .filter((feature) => {
      const normalised = feature.toLowerCase();
      if (specificationValues.has(normalised)) return false;
      if (canonicalFragments.has(normalised)) return false;
      if (/^\s*\d+\s*:\s*\d+\s*scale\s*$/i.test(feature)) return false;
      if (/^\s*\d+\s+pieces?\s*$/i.test(feature)) return false;
      const featureWords = normalised.split(/\W+/).filter((word) => word.length > 3);
      const matchedSpecificationWords = featureWords.filter((word) => specificationWords.includes(word)).length;
      if (featureWords.length && matchedSpecificationWords / featureWords.length >= 0.55) return false;
      if (normalised.includes(product.brand.toLowerCase()) && /(model kit|plastic model kit|3d puzzle|workshop tool|adhesive|finishing product|vehicle model kit)/i.test(feature)) return false;
      if (/(model kit|plastic model kit|3d puzzle|workshop tool|adhesive|finishing product|vehicle model kit|colour variant|manufacturer reference)/i.test(feature)) return false;
      if (/^(manufacturer|category|product type|scale|piece count|build format|vehicle marque|structure|subject|theme)\b/i.test(feature)) return false;
      return true;
    });
}

function absoluteIronSprueUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/`).toString();
}

function productStructuredData(product: IronSprueProduct, description: string, image: string | null, priceMinor: number, availableQuantity: number) {
  const canonicalUrl = `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/products/${product.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: ironSprueBrand.siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: absoluteIronSprueUrl('/shop') },
          { '@type': 'ListItem', position: 3, name: product.category, item: absoluteIronSprueUrl(`/shop/${slugForCategory(product.category)}`) },
          { '@type': 'ListItem', position: 4, name: product.name, item: canonicalUrl },
        ],
      },
      {
        '@type': 'Product',
        name: product.name,
        description,
        image: image ? [absoluteIronSprueUrl(image)] : undefined,
        sku: product.sku,
        brand: {
          '@type': 'Brand',
          name: product.brand,
        },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'GBP',
          price: (priceMinor / 100).toFixed(2),
          availability: availableQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      },
    ],
  };
}

function plainProductDescription(description: string) {
  return description
    .replace(/^##\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderProductDescription(description: string) {
  return description.split(/\n{2,}/).map((block, index) => {
    const trimmed = block.trim();
    const heading = trimmed.match(/^##\s+(.+)$/);
    if (heading) return <h3 key={`${index}-${trimmed}`} className="product-description-subheading">{heading[1]}</h3>;

    const bullet = trimmed.match(/^[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?:\s+(.+)$/s);
    if (bullet) {
      return (
        <p key={`${index}-${trimmed}`} className="product-description-feature">
          <strong>{bullet[1]}:</strong> {(bullet[2] ?? '').replace(/\s+/g, ' ').trim()}
        </p>
      );
    }

    return <p key={`${index}-${trimmed}`}>{trimmed.replace(/\*\*/g, '')}</p>;
  });
}

export function generateStaticParams() {
  if (shouldUseIronSprueProductionApi()) return [];
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const launchProduct = products.find((candidate) => candidate.slug === slug);
  const product = shouldUseIronSprueProductionApi()
    ? await getIronSprueProductionApiProduct(slug)
    : products.find((candidate) => candidate.slug === slug);
  const resolvedProduct = product ?? launchProduct;
  if (!resolvedProduct) return { title: 'Product unavailable' };
  const image = productImage(resolvedProduct);
  const title = resolvedProduct.seoTitle || `${resolvedProduct.name} by ${resolvedProduct.brand}`;
  const description = resolvedProduct.metaDescription || resolvedProduct.shortDescription;
  const url = `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/products/${resolvedProduct.slug}`;

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
      images: image ? [{ url: image, alt: resolvedProduct.name }] : undefined,
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
  const launchProduct = products.find((candidate) => candidate.slug === slug);
  const [storefrontProducts, apiProduct] = await Promise.all([
    getIronSprueStorefrontProducts(products),
    shouldUseIronSprueProductionApi() ? getIronSprueProductionApiProduct(slug) : Promise.resolve(null),
  ]);
  const product = apiProduct ?? storefrontProducts.find((candidate) => candidate.slug === slug) ?? launchProduct;

  if (!product) {
    return (
      <section className="section-block product-not-found-page">
        <p className="eyebrow">Product unavailable</p>
        <h1>Product not found</h1>
        <p>The product may have been moved while the catalogue is being refreshed.</p>
        <a className="button secondary" href="/shop">Back to shop</a>
      </section>
    );
  }
  const galleryImages = productGalleryImages(product);
  const availableQuantity = productSellableQuantity(product);
  const isOutOfStock = availableQuantity <= 0;
  const availabilityClass = productAvailabilityClass(product);
  const addonProducts = productDetailAddons(storefrontProducts, product.sku);
  const specifications = customerFacingSpecifications(product);
  const customerFeatures = specifications.length ? [] : customerFacingFeatures(product, specifications);
  const lead = conciseProductLead(product);
  const description = customerProductDescription(product);
  const manufacturerReference = (product.manufacturerReference ?? product.supplierSku ?? '').trim();
  const commerceId = productCommerceId(product);
  const priceMinor = product.priceMinor ?? product.retailPriceMinor ?? 0;
  const primaryImage = galleryImages[0] ?? productImage(product);
  const structuredData = productStructuredData(product, plainProductDescription(description), primaryImage, priceMinor, availableQuantity);

  return (
    <section className="section-block product-detail-page">
      <ProductAnalyticsEvent
        brand={product.brand}
        category={product.category}
        id={commerceId}
        name={product.name}
        price={priceMinor / 100}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="product-unified-panel">
        <div className="product-detail product-unified-grid">
          <div className="product-story-panel">
            <ProductGallery images={galleryImages} productName={product.name} fallbackLabel={product.brand} />
            <div className="product-pdp-info-grid">
              <section className="product-description-panel" aria-labelledby="product-description-heading">
                <h2 id="product-description-heading">Description</h2>
                {renderProductDescription(description)}
              </section>

              <section className="product-specification-zone" aria-labelledby="product-build-information-heading">
                <div>
                  <h2 id="product-build-information-heading">Build information</h2>
                  {specifications.length ? (
                    <dl className="product-specification-list">
                      {specifications.map((specification) => (
                        <React.Fragment key={specification.key}>
                          <dt>{specification.label}</dt>
                          <dd>{specification.value}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  ) : null}
                  {customerFeatures.length ? (
                    <ul className="product-key-details">
                      {customerFeatures.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            </div>
          </div>

          <div className="product-buy-panel">
            <div className="product-purchase-panel">
              <p className="eyebrow">{product.brand} / {product.category}</p>
              <h1>{product.name}</h1>
              <p className="lead">{lead}</p>
              <p className="sku-line">SKU {product.sku}{manufacturerReference ? <> / Manufacturer Reference {manufacturerReference}</> : null}</p>
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
                    productId: commerceId,
                    productName: product.name,
                    productSlug: product.slug,
                    unitPriceMinor: priceMinor,
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
            <section className="service-summary product-reassurance" aria-label="Delivery returns and payment information">
              <p><span className="reassurance-icon" aria-hidden="true"><DeliveryReassuranceIcon /></span><span><strong>Delivery</strong> {ironSprueStandardDeliverySummary()} <a href="/delivery">Delivery information</a></span></p>
              <p><span className="reassurance-icon" aria-hidden="true"><ReturnsReassuranceIcon /></span><span><strong>Returns</strong> Check the <a href="/returns">Returns page</a> for changed-mind returns, damaged items and refund guidance before sending anything back.</span></p>
              <div className="reassurance-row reassurance-payment-row"><span className="reassurance-icon" aria-hidden="true"><SecurePaymentReassuranceIcon /></span><span><strong>Secure payments</strong> Payments are handled securely at checkout.<PaymentMethodStrip compact /></span></div>
            </section>
          </div>

        </div>

      </article>

      {addonProducts.length ? (
        <section className="section-block compact pdp-addon-panel">
          <div className="section-head split">
            <div>
              <p className="pdp-addon-kicker">Frequently bought together</p>
              <h2>Complete the bench setup.</h2>
            </div>
            <a className="text-link" href="/shop?category=workshop-essentials">View add-ons</a>
          </div>
          <AddonCarousel products={addonProducts} />
        </section>
      ) : null}
    </section>
  );
}
