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
import { formatPrice, heroSlides, hrefForCategoryLabel, productAvailability, productAvailabilityClass, productCardFacts, productCardMobileFact, productCommerceId, productImage, productSellableQuantity, withOfficialBrandLogos } from '../lib/storefront';
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
  const cardFacts = productCardFacts(product);
  const mobileFact = productCardMobileFact(product);

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
          <p className="product-card-category">{product.category}</p>
          {mobileFact.category || mobileFact.fact ? (
            <ul className={`product-card-facts${cardFacts.length ? '' : ' product-card-facts-mobile-only'}`} aria-label={`${product.name} product facts`}>
              <li className="product-card-mobile-fact">
                {mobileFact.category ? <span>{mobileFact.category}</span> : null}
                {mobileFact.fact ? <span>{mobileFact.fact}</span> : null}
              </li>
              {cardFacts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          ) : null}
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
  const [fallbackHeroSlides, productionHome, fallbackHomepagePlacements, fallbackStorefrontProducts] = await Promise.all([
    useProductionApi ? Promise.resolve([]) : getIronSprueHeroSlides(),
    useProductionApi ? getIronSprueProductionApiHomeSnapshot() : Promise.resolve(null),
    useProductionApi ? Promise.resolve([]) : getIronSprueHomepagePlacements(),
    useProductionApi ? Promise.resolve([]) : getIronSprueStorefrontProducts(products),
  ]);
  const activeHeroSlides = productionHome?.heroSlides.length ? productionHome.heroSlides : fallbackHeroSlides.length ? fallbackHeroSlides : heroSlides;
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
              key={`${('id' in slide ? slide.id : slide.image) ?? slide.image}-${slide.title}`}
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
                    <path d="M5 19h3l3-5h10l3 5h3" />
                    <path d="M8 19h16l-1.4 4.8H9.4Z" />
                    <path d="M12.6 14l1.7-3.8h4.4l1.7 3.8" />
                    <circle cx="10.5" cy="24" r="2.1" />
                    <circle cx="21.5" cy="24" r="2.1" />
                    <path d="M13.6 19v-5" />
                    <path d="M18.4 19v-5" />
                  </>
                ) : null}
                {index === 1 ? (
                  <>
                    <path d="M10.2 5.7h8.3v3.8a2.7 2.7 0 1 0 5.1 0h2.7v8.4h-3.9a2.7 2.7 0 1 0 0 5.1v3.3H10.2v-4.1a2.7 2.7 0 1 1 0-5.1Z" />
                    <path d="M14.3 5.7v6.8" />
                    <path d="M14.3 20.8v5.5" />
                    <path d="M18.5 15.4h7.8" />
                  </>
                ) : null}
                {index === 2 ? (
                  <>
                    <path d="M9 6l6.4 6.4" />
                    <path d="M6.7 8.4l6.4 6.4" />
                    <path d="M5.4 5.4l4.9 4.9" />
                    <path d="M19 5.4l7.6 7.6" />
                    <path d="M26.6 5.4 19 13" />
                    <path d="m13.2 15 2.4 2.4-7.2 7.2-3-3Z" />
                    <path d="m18.9 12.9 2.2 2.2-7.5 7.5-2.2-2.2Z" />
                  </>
                ) : null}
                {index === 3 ? (
                  <>
                    <path d="M13.2 4.8h5.6v5.1l4.1 4.5v12.8H9.1V14.4l4.1-4.5Z" />
                    <path d="M12.4 9.9h7.2" />
                    <path d="M12.3 17.4h7.4v6.1h-7.4Z" />
                    <path d="M14.1 7h3.8" />
                    <path d="M13.8 20.4h4.4" />
                    <path d="M22.9 16.2h2.8" />
                  </>
                ) : null}
                {index === 4 ? (
                  <>
                    <path d="M22.9 4.2c1.1-.3 2.2.8 1.9 1.9L14.8 18.6l-3.4-3.4Z" />
                    <path d="m11.4 15.2 3.4 3.4-2.3 2.3-3.4-3.4Z" />
                    <path d="M8.8 17.6c-1.8.8-3.1 2.3-3.9 4.4L3 27l5-1.9c2.1-.8 3.6-2.1 4.4-4" />
                    <path d="M5.4 24.6c1.3-.4 2.4-1.1 3.3-2" />
                    <path d="M20.8 7.2 22 8.4" />
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
            <a className="text-link" href={featuredPlacement?.ctaHref || '/shop?sort=newest'}>
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
