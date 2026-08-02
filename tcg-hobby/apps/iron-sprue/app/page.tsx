import { ironSprueBrand } from '../lib/brand';
import launchProducts from '../data/launch-products.json';
import { deriveBrandsWeStock, featuredWorkshopInterests, launchCatalogueStatus, sampleRangeCards, type IronSprueProduct } from '../lib/catalogue';

const brandsWeStock = deriveBrandsWeStock(launchProducts as IronSprueProduct[]);

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Premium modelling workshop</p>
          <h1>Model kits and build essentials curated for a cleaner bench.</h1>
          <p className="lead">
            Iron Sprue is the modelling storefront from Capital Hobby Group, focused on considered kits, architectural builds,
            display pieces and practical workshop add-ons.
          </p>
          <div className="button-row">
            <a className="button" href="/shop">Shop the launch range</a>
            <a className="button secondary" href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank">Follow {ironSprueBrand.instagramHandle}</a>
          </div>
        </div>
        <div className="workbench" aria-label="Workshop composition">
          <div className="workbench-grid" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <p className="meta" style={{ marginTop: 16 }}>A quiet storefront language: measured layout, clear stock states and product detail built around assembly decisions.</p>
        </div>
      </section>

      <section className="band">
        <div className="section-head">
          <p className="eyebrow">Shop by modelling interest</p>
          <h2>Built around what modellers actually need to decide.</h2>
        </div>
        <div className="grid">
          {featuredWorkshopInterests.map((interest) => (
            <article className="card" key={interest.title}>
              <h3>{interest.title}</h3>
              <p className="meta">{interest.description}</p>
              <a href={interest.href}>View range</a>
            </article>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="section-head">
          <p className="eyebrow">Launch catalogue</p>
          <h2>Aoshima, CubicFun, Pintoo and workshop add-ons are wired as the supported launch range.</h2>
          <p className="lead">{launchCatalogueStatus.genuineSkuCount} genuine PO-derived product lines and {launchCatalogueStatus.stockUnits} opening units are loaded. The importer does not invent SKUs or mix Iron Sprue stock with TCG Hobby products.</p>
        </div>
        <div className="grid">
          {sampleRangeCards.map((range) => (
            <article className="card" key={range.brand}>
              <p className="eyebrow">{range.brand}</p>
              <h3>{range.title}</h3>
              <a href={range.href}>Open filtered shop</a>
            </article>
          ))}
        </div>
        {launchCatalogueStatus.blocker ? (
          <p className="notice" style={{ marginTop: 24 }}>{launchCatalogueStatus.blocker}</p>
        ) : null}
      </section>

      <section className="band">
        <div className="section-head">
          <p className="eyebrow">Shop by brand</p>
          <h2>Brands we stock</h2>
        </div>
        <div className="brand-rail" aria-label="Brands we stock">
          {brandsWeStock.map((brand) => (
            <a className="brand-tile" href={brand.href} key={brand.slug} aria-label={`Shop ${brand.name} products`}>
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.altText} width="144" height="48" />
              ) : (
                <span className="brand-wordmark">{brand.name}</span>
              )}
              <small>{brand.productCount} stocked line{brand.productCount === 1 ? '' : 's'}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="section-head">
          <p className="eyebrow">Instagram</p>
          <h2>Bench notes without blocking the page.</h2>
          <p className="lead">Recent build content will use a compliant, non-blocking integration. Until a live feed is approved, the storefront links directly to {ironSprueBrand.instagramHandle}.</p>
          <a className="button secondary" href={ironSprueBrand.instagramUrl} rel="noreferrer" target="_blank">Open Instagram</a>
        </div>
      </section>
    </>
  );
}
