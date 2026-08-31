import launchProducts from '../data/launch-products.json';
import {
  getIronSprueBrandPresentation,
  getIronSprueHeroSlides,
  getIronSprueHomepagePlacements,
  getIronSprueStorefrontProducts,
  placementByKey,
  productSectionsFromPlacements,
  promoPanelsFromPlacements,
  productsFromFeaturedPlacements,
} from '../lib/admin-storefront-controls';
import { deriveBrandsWeStock, type IronSprueProduct } from '../lib/catalogue';
import { getIronSprueProductionApiHomeSnapshot, shouldUseIronSprueProductionApi } from '../lib/production-api';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';
import { formatPrice, heroSlides, hrefForCategoryLabel, productAvailability, productAvailabilityClass, productCommerceId, productImage, productSellableQuantity, withOfficialBrandLogos } from '../lib/storefront';
import type { CSSProperties } from 'react';
import { AddToBasketButton } from '../components/basket-client';

const products = launchProducts as IronSprueProduct[];

export const dynamic = 'force-dynamic';

function heroFitMode(slide: Awaited<ReturnType<typeof getIronSprueHeroSlides>>[number]) {
  const identity = `${slide.brandName ?? ''} ${slide.sourceProductSlug} ${slide.image}`.toLowerCase();
  return identity.includes('aoshima') ? 'cover' : 'contain';
}

function ProductCard({ product }: { product: IronSprueProduct }) {
  const imageUrl = productImage(product);
  const availableQuantity = productSellableQuantity(product);
  const isOutOfStock = availableQuantity <= 0;
  const availabilityClass = productAvailabilityClass(product);

  return (
    <article className={`product-card${isOutOfStock ? ' is-out-of-stock' : ''}`} key={product.sku}>
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
          <h3>{product.name}</h3>
          <p>{product.category}</p>
          <strong>{formatPrice(product)} inc VAT</strong>
          <span className={`stock-badge ${availabilityClass}`}>{productAvailability(product)}</span>
          <div className="product-actions">
            <a href={`/products/${product.slug}`}>Details</a>
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

export default async function HomePage() {
  const useProductionApi = shouldUseIronSprueProductionApi();
  const [activeHeroSlides, productionHome, fallbackHomepagePlacements, fallbackStorefrontProducts] = await Promise.all([
    getIronSprueHeroSlides(),
    useProductionApi ? getIronSprueProductionApiHomeSnapshot() : Promise.resolve(null),
    useProductionApi ? Promise.resolve([]) : getIronSprueHomepagePlacements(),
    useProductionApi ? Promise.resolve([]) : getIronSprueStorefrontProducts(products),
  ]);
  const homepagePlacements = productionHome?.homepagePlacements ?? fallbackHomepagePlacements;
  const storefrontProducts = productionHome?.products ?? fallbackStorefrontProducts;
  const previewProducts = storefrontProducts.map((product) => ({ ...product, published: true }));
  const brandsWeStock = productionHome?.brandPresentation.length
    ? productionHome.brandPresentation
    : await getIronSprueBrandPresentation(previewProducts)
      .then((brands) => brands.length ? brands : withOfficialBrandLogos(deriveBrandsWeStock(previewProducts)));
  const newArrivals = productsFromFeaturedPlacements(storefrontProducts, homepagePlacements, 4);
  const productSections = productSectionsFromPlacements(storefrontProducts, homepagePlacements);
  const homepagePromoPanels = promoPanelsFromPlacements(homepagePlacements, 3);
  const featuredPlacement = placementByKey(homepagePlacements, 'featured-products');
  const brandPlacement = placementByKey(homepagePlacements, 'brand-carousel');
  const launchCategories = (activeHeroSlides[0]?.meta ?? heroSlides[0].meta).filter((item) => item !== 'Accessories');

  return (
    <>
      <section className="hero">
        <div
          className="hero-carousel"
          aria-label="Featured Iron Sprue hero products"
          style={{ '--hero-count': Math.max(1, activeHeroSlides.length) } as CSSProperties}
        >
          {activeHeroSlides.map((slide, index) => (
            <article
              className="hero-slide"
              data-fit={heroFitMode(slide)}
              style={{ '--slide-index': index } as CSSProperties}
              key={`${slide.id ?? slide.image}-${slide.title}`}
            >
              <a className="hero-art-link" href={slide.ctaHref} aria-label={`View ${slide.title}`}>
                <img
                  className="hero-art"
                  src={ironSprueDisplayMediaUrl(slide.image, 1400)}
                  srcSet={ironSprueDisplayMediaSrcSet(slide.image, [640, 960, 1400])}
                  sizes="100vw"
                  alt={slide.alt}
                  width="1536"
                  height="864"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding={index === 0 ? 'sync' : 'async'}
                />
              </a>
              {slide.brandLogo ? (
                <div className="hero-brand">
                  <img src={slide.brandLogo} alt={`${slide.brandName ?? 'Brand'} logo`} width="180" height="70" />
                </div>
              ) : null}
              <div className="hero-message">
                <div className="hero-availability-sticker" aria-label={slide.availabilityLabel}>
                  <span aria-hidden="true" />
                  <strong>{slide.availabilityLabel}</strong>
                </div>
                <h1>{slide.title}</h1>
                <p className="script-line">{slide.script}</p>
                {slide.copy ? <p className="lead">{slide.copy}</p> : null}
                <a className="hero-shop-now" href={slide.ctaHref}>{slide.ctaLabel ?? 'Shop now'}</a>
              </div>
              <ul className="hero-dots" aria-hidden="true">
                {activeHeroSlides.map((dot) => <li key={dot.title} />)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="homepage-board">
        <section className="category-strip" aria-label="Shop categories">
          {launchCategories.map((item, index) => (
            <a href={hrefForCategoryLabel(item)} key={item}>
              <svg viewBox="0 0 32 32" aria-hidden="true">
                {index === 0 ? (
                  <>
                    <path
                      d="M3.1 19.3c.7-1.4 1.7-2.5 2.9-3.2 2.4.1 4.6-.1 6.7-.7 1.5-.5 2.9-1.2 4.3-2.1 2.2-1.4 4.9-2.1 7.2-1.8 2.1.3 4.1 1.2 5.7 2.6-3.7-.9-7.2-.9-10.3.1-2 .7-3.9 1.7-5.7 3 3.5.7 7.8.8 12.7.5 2.2.1 3.8.8 4.7 2.2.6.9.9 2 .9 3.4-.7-1.6-1.8-2.7-3.2-3.3-1.2-.5-2.5-.6-3.7-.4-1.2.2-2.3.8-3.1 1.6-.8.8-1.3 1.8-1.5 3H11c-.2-1.3-.8-2.4-1.8-3.1s-2.1-1-3.3-.9c-1 .1-2 .4-2.8 1v-1.9Z"
                      fill="currentColor"
                      stroke="none"
                    />
                    <path d="M6.8 25.8a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Zm20.1 0a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z" fill="currentColor" stroke="none" />
                  </>
                ) : null}
                {index === 1 ? (
                  <>
                    <path d="M10.5 5.5h8.2v4.1a2.9 2.9 0 1 0 5.2 0h2.6v8.2h-4.1a2.9 2.9 0 1 0 0 5.2v3.5H10.5V22a2.9 2.9 0 1 1 0-5.2V5.5Z" />
                  </>
                ) : null}
                {index === 2 ? (
                  <>
                    <path d="M13.7 14.7 5.8 25.2c-.7 1-.5 2.3.5 3 .9.6 2.2.4 2.9-.5l7.5-10.8" />
                    <path d="M18.3 14.7 26.2 25.2c.7 1 .5 2.3-.5 3-.9.6-2.2.4-2.9-.5l-7.5-10.8" />
                    <path d="M15.9 15.6c1.4 0 2.5-1.1 2.5-2.5S17.3 10.6 15.9 10.6s-2.5 1.1-2.5 2.5 1.1 2.5 2.5 2.5Z" />
                    <path d="M14.3 10.9 8.2 4.8c2.7-.2 5 .8 6.8 3l1 1.2 1-1.2c1.8-2.2 4.1-3.2 6.8-3l-6.1 6.1" />
                  </>
                ) : null}
                {index === 3 ? (
                  <>
                    <path d="M13 4.8h6v4.9l4.2 4.6v13H8.8v-13L13 9.7V4.8Z" />
                    <path d="M12.4 9.8h7.2" />
                    <path d="M11.8 16.9h8.4v6.8h-8.4Z" />
                    <path d="M14.2 7h3.6" />
                    <path d="M14 20.3h4" />
                  </>
                ) : null}
                {index === 4 ? (
                  <>
                    <path d="M22.9 3.9c1.1-.2 2.3.9 2.1 2L14.7 18.7l-3.5-3.5L22.9 3.9Z" />
                    <path d="m11.2 15.2 3.5 3.5-2.4 2.4-3.5-3.5 2.4-2.4Z" />
                    <path d="M8.8 17.6c-1.7.8-3 2.3-3.8 4.3l-2 5.2 5.2-2c2-.8 3.5-2.1 4.1-4" />
                    <path d="M5.2 25c1.4-.4 2.6-1.1 3.5-2.1" />
                  </>
                ) : null}
              </svg>
              {item}
            </a>
          ))}
        </section>

        <section className="promo-grid" aria-label="Special offers">
          {homepagePromoPanels.map((panel) => (
            <article className="promo-card" key={panel.title}>
              <img
                src={ironSprueDisplayMediaUrl(panel.image, 640)}
                srcSet={ironSprueDisplayMediaSrcSet(panel.image, [480, 640, 960])}
                sizes="(max-width: 700px) 72vw, 31vw"
                alt={panel.alt}
                width="900"
                height="600"
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="eyebrow">{panel.eyebrow}</p>
                <h2>{panel.title}</h2>
                <p>{panel.copy}</p>
                <a className="button" href={panel.href}>{panel.cta}</a>
              </div>
            </article>
          ))}
        </section>

        <section className="section-block">
          <div className="section-head split">
            <div>
              <p className="eyebrow">New arrivals</p>
              <h2>{featuredPlacement?.title || 'Opening bench picks.'}</h2>
            </div>
            <a className="text-link" href={featuredPlacement?.ctaHref || '/shop?sort=new'}>
              {featuredPlacement?.ctaLabel || 'See new arrivals'}
            </a>
          </div>
          <div className="product-grid">
            {newArrivals.map((product) => <ProductCard product={product} key={product.sku} />)}
          </div>
        </section>

        {productSections.map((section) => (
          <section className="section-block" key={section.sectionKey}>
            <div className="section-head split">
              <div>
                <p className="eyebrow">{section.eyebrow}</p>
                <h2>{section.heading}</h2>
              </div>
              {section.ctaHref ? (
                <a className="text-link" href={section.ctaHref}>
                  {section.ctaLabel || 'View section'}
                </a>
              ) : null}
            </div>
            <div className="product-grid">
              {section.products.map((product) => <ProductCard product={product} key={product.sku} />)}
            </div>
          </section>
        ))}

        <section className="brand-carousel" aria-label="Brands we stock">
          <h2>{brandPlacement?.title || 'Brands we stock'}</h2>
          <div className="brand-stage">
            <button type="button" aria-label="Previous brand"><span aria-hidden="true">&lt;</span></button>
            <div className="brand-viewport" aria-live="off">
              {brandsWeStock.slice(0, 5).map((brand, index) => (
              <a
                className="brand-feature"
                href={brand.href}
                aria-label={`Shop ${brand.name} products`}
                style={{ '--brand-index': index } as CSSProperties}
                key={brand.slug}
              >
                <img src={brand.logoUrl} alt={brand.altText} width="340" height="130" />
              </a>
              ))}
            </div>
            <button type="button" aria-label="Next brand"><span aria-hidden="true">&gt;</span></button>
          </div>
          <ol className="carousel-dots" aria-label="Brand carousel position">
            {brandsWeStock.slice(0, 5).map((brand, index) => (
              <li key={brand.slug} aria-current={index === 0 ? 'true' : undefined} />
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
