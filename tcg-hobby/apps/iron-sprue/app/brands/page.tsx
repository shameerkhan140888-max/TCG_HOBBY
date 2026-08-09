import launchProducts from '../../data/launch-products.json';
import { deriveBrandsWeStock, type IronSprueProduct } from '../../lib/catalogue';
import { withOfficialBrandLogos } from '../../lib/storefront';

const products = launchProducts as IronSprueProduct[];
const brands = withOfficialBrandLogos(deriveBrandsWeStock(products.map((product) => ({ ...product, published: true }))));

export default function BrandsPage() {
  return (
    <section className="section-block">
      <div className="section-head split">
        <div>
          <p className="eyebrow">Brands</p>
          <h1>Brands we stock</h1>
          <p className="lead">Browse stocked makers and authorised product ranges. More brands can be added as official logo assets and product imagery are approved.</p>
        </div>
        <a className="button secondary" href="/shop">Back to shop</a>
      </div>
      <div className="brand-rail brand-grid-page" aria-label="Iron Sprue stocked brands">
        {brands.map((brand) => (
          <a className="brand-tile" href={brand.href} key={brand.slug}>
            <img src={brand.logoUrl} alt={brand.altText} width="220" height="92" />
            <small>{brand.productCount} stocked line{brand.productCount === 1 ? '' : 's'}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
