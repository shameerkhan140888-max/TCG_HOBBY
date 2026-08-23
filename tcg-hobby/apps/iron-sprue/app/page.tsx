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
import { getIronSprueProductionApiHomeProducts, shouldUseIronSprueProductionApi } from '../lib/production-api';
import { formatPrice, heroSlides, hrefForCategoryLabel, productAvailability, productAvailabilityClass, productImage, productSellableQuantity, withOfficialBrandLogos } from '../lib/storefront';
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
      <a className="product-image" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        {imageUrl ? <img src={imageUrl} alt={product.name} width="1000" height="1000" /> : <span>{product.brand}</span>}
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
              productId: product.sku,
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
    </article>
  );
}

export default async function HomePage() {
  const [activeHeroSlides, homepagePlacements, storefrontProducts] = await Promise.all([
    getIronSprueHeroSlides(),
    getIronSprueHomepagePlacements(),
    shouldUseIronSprueProductionApi() ? getIronSprueProductionApiHomeProducts() : getIronSprueStorefrontProducts(products),
  ]);
  const previewProducts = storefrontProducts.map((product) => ({ ...product, published: true }));
  const brandsWeStock = await getIronSprueBrandPresentation(previewProducts)
    .then((brands) => brands.length ? brands : withOfficialBrandLogos(deriveBrandsWeStock(previewProducts)));
  const newArrivals = productsFromFeaturedPlacements(storefrontProducts, homepagePlacements, 4);
  const productSections = productSectionsFromPlacements(storefrontProducts, homepagePlacements);
  const homepagePromoPanels = promoPanelsFromPlacements(homepagePlacements, 3);
  const featuredPlacement = placementByKey(homepagePlacements, 'featured-products');
  const brandPlacement = placementByKey(homepagePlacements, 'brand-carousel');

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
                <img className="hero-art" src={slide.image} alt={slide.alt} width="1536" height="864" />
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

      <section className="category-strip" aria-label="Shop categories">
        {(activeHeroSlides[0]?.meta ?? heroSlides[0].meta).map((item, index) => (
          <a href={hrefForCategoryLabel(item)} key={item}>
            <svg viewBox="0 0 32 32" aria-hidden="true">
              {index === 0 ? <path d="M4 20c3-5 8-8 14-8h5l5 5v6H4v-3Zm4 3a3 3 0 1 0 6 0m8 0a3 3 0 1 0 6 0" /> : null}
              {index === 1 ? <path d="m16 4 10 6v12l-10 6-10-6V10l10-6Zm0 0v12m10-6-10 6L6 10" /> : null}
              {index === 2 ? <path d="M8 24 22 10m-8-2 10 10m-4-12 6 6-4 4-6-6 4-4ZM6 22l4 4" /> : null}
              {index === 3 ? <path d="M12 4h8v7l4 4v13H8V15l4-4V4Zm0 9h8M11 20h10" /> : null}
              {index === 4 ? <path d="M8 24c7-1 13-7 14-14l2-4-4 2C13 9 7 15 6 22l2 2Zm4-4 8-8" /> : null}
              {index === 5 ? <path d="M5 9h22v17H5V9Zm3-5h16v5H8V4Zm3 9h10m-10 5h6" /> : null}
            </svg>
            {item}
          </a>
        ))}
      </section>

      <section className="promo-grid" aria-label="Special offers">
        {homepagePromoPanels.map((panel) => (
          <article className="promo-card" key={panel.title}>
            <img src={panel.image} alt={panel.alt} width="900" height="600" />
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
    </>
  );
}
