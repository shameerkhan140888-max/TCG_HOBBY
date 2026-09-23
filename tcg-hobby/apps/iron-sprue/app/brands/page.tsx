import type { Metadata } from 'next';
import launchProducts from '../../data/launch-products.json';
import { ironSprueBrand } from '../../lib/brand';
import { deriveBrandsWeStock, type IronSprueProduct } from '../../lib/catalogue';
import { withOfficialBrandLogos } from '../../lib/storefront';

const products = launchProducts as IronSprueProduct[];
const brands = withOfficialBrandLogos(deriveBrandsWeStock(products.map((product) => ({ ...product, published: true }))));
const canonicalUrl = `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/brands`;

export const metadata: Metadata = {
  title: 'Brands we stock',
  description: 'Browse the official model kit, 3D puzzle, tool and finishing brands stocked by Iron Sprue.',
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: 'Brands we stock | Iron Sprue',
    description: 'Browse the stocked brands available from Iron Sprue.',
    url: canonicalUrl,
    type: 'website',
  },
};

export default function BrandsPage() {
  return (
    <section className="section-block">
      <div className="section-head split">
        <div>
          <p className="eyebrow">Brands</p>
          <h1>Brands we stock</h1>
          <p className="lead">Explore the official model kit, puzzle, tool and finishing brands currently available from Iron Sprue.</p>
        </div>
        <a className="button secondary" href="/shop">Back to shop</a>
      </div>
      <div className="brand-rail brand-grid-page" aria-label="Iron Sprue stocked brands">
        {brands.map((brand) => (
          <a className="brand-tile" href={brand.href} key={brand.slug} aria-label={`Shop ${brand.name} products`}>
            <img src={brand.logoUrl} alt="" aria-hidden="true" width="220" height="92" />
          </a>
        ))}
      </div>
    </section>
  );
}
