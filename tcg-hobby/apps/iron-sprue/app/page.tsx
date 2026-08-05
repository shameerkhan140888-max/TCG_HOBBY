import launchProducts from '../data/launch-products.json';
import { deriveBrandsWeStock, type IronSprueProduct } from '../lib/catalogue';
import { featuredProducts, formatPrice, heroSlides, productAvailability, productImage, promoPanels, withOfficialBrandLogos } from '../lib/storefront';
import type { CSSProperties } from 'react';

const products = launchProducts as IronSprueProduct[];
const brandsWeStock = withOfficialBrandLogos(deriveBrandsWeStock(products));
const newArrivals = featuredProducts(products, 4);

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-carousel" aria-label="Featured Iron Sprue hero products">
          {heroSlides.map((slide, index) => (
            <article className="hero-slide" style={{ '--slide-index': index } as CSSProperties} key={slide.title}>
              <img className="hero-art" src={slide.image} alt={slide.alt} width="1536" height="864" />
              <div className="hero-brand">
                <img src={slide.brandLogo} alt={`${slide.brandName} logo`} width="180" height="70" />
                <small>{slide.brandName}</small>
              </div>
              <ul className="hero-dots" aria-hidden="true">
                {heroSlides.map((dot) => <li key={dot.title} />)}
              </ul>
            </article>
          ))}
        </div>
        <div className="hero-message">
          <div className="hero-availability-sticker" aria-label="In stock now">
            <span aria-hidden="true" />
            <strong>In stock now</strong>
          </div>
          <h1>Built for the bench.</h1>
          <p className="script-line">Kits. Tools. Finishing.</p>
          <p className="lead">Everything a modeller needs, from display-ready builds to the essentials that make the finish sharper.</p>
          <a className="hero-shop-now" href="/shop">Shop now</a>
        </div>
      </section>

      <section className="category-strip" aria-label="Shop categories">
        {heroSlides[0].meta.map((item, index) => (
          <a href={`/shop?category=${item.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')}`} key={item}>
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
        {promoPanels.map((panel) => (
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
            <h2>Opening bench picks.</h2>
          </div>
          <a className="text-link" href="/shop?sort=new">See new arrivals</a>
        </div>
        <div className="product-grid">
          {newArrivals.map((product) => (
            <article className="product-card" key={product.sku}>
              <div className="product-image">
                {productImage(product) ? <img src={productImage(product) ?? ''} alt={product.name} width="1000" height="1000" /> : <span>{product.brand}</span>}
              </div>
              <div className="product-card-body">
                <p className="product-brand">{product.brand}</p>
                <h3>{product.name}</h3>
                <p>{product.category}</p>
                <strong>{formatPrice(product)} inc VAT</strong>
                <span className="stock-badge">{productAvailability(product)}</span>
                <div className="product-actions">
                  <a href={`/products/${product.slug}`}>Details</a>
                  <button type="button" disabled>Add to basket</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="brand-carousel" aria-label="Brands we stock">
        <h2>Brands we stock</h2>
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
