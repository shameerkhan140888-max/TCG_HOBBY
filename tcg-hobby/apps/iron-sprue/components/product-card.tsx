import type { IronSprueProduct } from '../lib/catalogue';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';
import {
  formatPrice,
  productAvailability,
  productAvailabilityClass,
  productCardMobileFact,
  productCommerceId,
  productImage,
  productSellableQuantity,
} from '../lib/storefront';
import { AddToBasketButton } from './basket-client';

type ProductCardProps = {
  detailsLabel?: string;
  headingLevel?: 2 | 3;
  product: IronSprueProduct;
};

export function ProductCard({ detailsLabel = 'Details', headingLevel = 3, product }: ProductCardProps) {
  const imageUrl = productImage(product);
  const availableQuantity = productSellableQuantity(product);
  const isOutOfStock = availableQuantity <= 0;
  const availabilityClass = productAvailabilityClass(product);
  const mobileFact = productCardMobileFact(product);
  const HeadingTag = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <article className={`product-card${isOutOfStock ? ' is-out-of-stock' : ''}`}>
      <div className="product-card-surface">
        <a className="product-image" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
          {imageUrl ? (
            <img
              src={ironSprueDisplayMediaUrl(imageUrl, 480)}
              srcSet={ironSprueDisplayMediaSrcSet(imageUrl, [320, 480, 640])}
              sizes="(max-width: 720px) 46vw, (max-width: 1100px) 30vw, 320px"
              alt={product.name}
              width="1000"
              height="1000"
              loading="lazy"
              decoding="async"
            />
          ) : <span>{product.brand}</span>}
        </a>
        <div className="product-card-body">
          <p className="product-brand">{product.brand}</p>
          <HeadingTag>{product.name}</HeadingTag>
          <p className="product-card-category">{product.category}</p>
          {mobileFact.category || mobileFact.fact ? (
            <ul className="product-card-facts" aria-label={`${product.name} product facts`}>
              {mobileFact.category ? <li className="product-card-fact-type">{mobileFact.category}</li> : null}
              {mobileFact.fact ? <li className="product-card-fact-spec">{mobileFact.fact}</li> : null}
            </ul>
          ) : null}
          <span className={`stock-badge ${availabilityClass}`}>{productAvailability(product)}</span>
          <strong>{formatPrice(product)} inc VAT</strong>
          <div className="product-actions">
            <a href={`/products/${product.slug}`}>{detailsLabel}</a>
            <AddToBasketButton
              item={{
                productId: productCommerceId(product),
                productName: product.name,
                productSlug: product.slug,
                unitPriceMinor: product.priceMinor ?? product.retailPriceMinor ?? 0,
                availableQuantity,
                imageUrl,
                imageAlt: product.name,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
