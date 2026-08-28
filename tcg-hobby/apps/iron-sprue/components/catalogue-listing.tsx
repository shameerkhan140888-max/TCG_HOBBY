import launchProducts from '../data/launch-products.json';
import { filterIronSprueProducts, isModelKitProduct, launchCatalogueStatus, scaleOptions, type IronSprueProduct, vehicleManufacturerOptions } from '../lib/catalogue';
import { getIronSprueStorefrontProducts } from '../lib/admin-storefront-controls';
import { AddToBasketButton } from './basket-client';
import {
  brandOptions,
  categoryOptions,
  formatPrice,
  productAvailability,
  productAvailabilityClass,
  productCommerceId,
  productImage,
  productSellableQuantity,
  slugForCategory,
} from '../lib/storefront';

type Params = Record<string, string | string[] | undefined>;

const importedProducts = launchProducts as IronSprueProduct[];

function single(params: Params, key: string) {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

function categoryMatches(product: IronSprueProduct, category: string) {
  if (category === '3d-puzzles-and-builds') return product.brand === 'CubicFun' || product.brand === 'Pintoo';
  if (category === 'model-kits') return isModelKitProduct(product);
  return slugForCategory(product.category) === category;
}

export async function CatalogueListing({
  eyebrow = 'Iron Sprue shop',
  fixedBrand,
  fixedCategory,
  lead,
  searchParams,
  title = 'Shop the range',
}: {
  eyebrow?: string;
  fixedBrand?: string;
  fixedCategory?: string;
  lead?: string;
  searchParams: Params;
  title?: string;
}) {
  const selectedBrand = fixedBrand ?? single(searchParams, 'brand');
  const selectedCategory = fixedCategory ?? single(searchParams, 'category');
  const selectedScale = single(searchParams, 'scale');
  const selectedVehicleManufacturer = single(searchParams, 'vehicleManufacturer');
  const search = single(searchParams, 'search');
  const storefrontProducts = await getIronSprueStorefrontProducts(importedProducts);
  const scopedProducts = storefrontProducts.filter((product) => {
    if (fixedBrand && product.brand !== fixedBrand) return false;
    if (fixedCategory && !categoryMatches(product, fixedCategory)) return false;
    return true;
  });
  const vehicleManufacturers = selectedBrand === 'Aoshima' || selectedCategory === 'model-kits'
    ? vehicleManufacturerOptions(scopedProducts)
    : [];
  const products = filterIronSprueProducts(scopedProducts, {
    brand: fixedBrand ? undefined : selectedBrand || undefined,
    category: fixedCategory ? undefined : selectedCategory || undefined,
    scale: selectedScale || undefined,
    vehicleManufacturer: selectedVehicleManufacturer || undefined,
    search: search || undefined,
  });
  const formAction = fixedBrand
    ? `/shop/${fixedBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : fixedCategory
      ? `/shop/${fixedCategory}`
      : '/shop';
  const scales = selectedBrand === 'Aoshima' || selectedCategory === 'model-kits'
    ? scaleOptions(scopedProducts)
    : [];

  return (
    <section className="section-block catalogue-page">
      <div className="catalogue-hero">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lead">{lead ?? `${launchCatalogueStatus.genuineSkuCount} products are available to browse by brand, category, price and availability.`}</p>
        </div>
        <form className="catalogue-search" action={formAction}>
          <label htmlFor="catalogue-search">Search catalogue</label>
          <input id="catalogue-search" name="search" type="search" defaultValue={search} placeholder="Search kits, brands or tools" />
          <button type="submit">Search</button>
        </form>
      </div>

      {fixedCategory === '3d-puzzles-and-builds' ? (
        <div className="brand-showcase-links" aria-label="3D puzzle brand showcases">
          <a href="/shop/cubicfun">CubicFun architecture and display builds</a>
          <a href="/shop/pintoo">Pintoo 3D puzzle objects</a>
        </div>
      ) : null}
      {fixedCategory === 'model-kits' ? (
        <div className="brand-showcase-links" aria-label="Model kit brand showcases">
          <a href="/shop/aoshima">Aoshima model kits</a>
        </div>
      ) : null}

      <div className="catalogue-layout">
        <aside className="filter-panel" aria-label="Catalogue filters">
          <form action={formAction}>
            <label htmlFor="brand-filter">Brand</label>
            {fixedBrand ? (
              <p className="locked-filter">{fixedBrand}</p>
            ) : (
              <select id="brand-filter" name="brand" defaultValue={selectedBrand}>
                <option value="">All brands</option>
                {brandOptions(storefrontProducts).map((brand) => <option value={brand} key={brand}>{brand}</option>)}
              </select>
            )}
            <label htmlFor="category-filter">Category</label>
            {fixedCategory ? (
              <p className="locked-filter">{title}</p>
            ) : (
              <select id="category-filter" name="category" defaultValue={selectedCategory}>
                <option value="">All categories</option>
                {categoryOptions(storefrontProducts).map((category) => <option value={slugForCategory(category)} key={category}>{category}</option>)}
              </select>
            )}
            {vehicleManufacturers.length ? (
              <>
                <label htmlFor="vehicle-manufacturer-filter">Vehicle manufacturer</label>
                <select id="vehicle-manufacturer-filter" name="vehicleManufacturer" defaultValue={selectedVehicleManufacturer}>
                  <option value="">All vehicle manufacturers</option>
                  {vehicleManufacturers.map((manufacturer) => <option value={manufacturer} key={manufacturer}>{manufacturer}</option>)}
                </select>
              </>
            ) : null}
            {scales.length ? (
              <>
                <label htmlFor="scale-filter">Scale</label>
                <select id="scale-filter" name="scale" defaultValue={selectedScale}>
                  <option value="">All scales</option>
                  {scales.map((scale) => <option value={scale.replace(/[/:]/g, '-')} key={scale}>{scale}</option>)}
                </select>
              </>
            ) : null}
            <label htmlFor="availability-filter">Availability</label>
            <select id="availability-filter" name="availability" defaultValue="">
              <option value="">All states</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="coming-soon">Coming soon</option>
            </select>
            <button type="submit">Apply filters</button>
          </form>
        </aside>

        <div>
          <div className="catalogue-toolbar">
            <p>{products.length} product{products.length === 1 ? '' : 's'}</p>
            <select aria-label="Sort products" defaultValue="featured">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="new">Newest</option>
            </select>
          </div>

          {products.length > 0 ? (
            <div className="product-grid catalogue-grid">
              {products.map((product) => {
                const imageUrl = productImage(product);
                const availableQuantity = productSellableQuantity(product);
                const isOutOfStock = availableQuantity <= 0;
                const availabilityClass = productAvailabilityClass(product);
                return (
                  <article className={`product-card${isOutOfStock ? ' is-out-of-stock' : ''}`} key={product.sku}>
                    <div className="product-card-surface">
                      <a className="product-image" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
                        {imageUrl ? <img src={imageUrl} alt={product.name} width="1000" height="1000" /> : <span>{product.brand}</span>}
                      </a>
                      <div className="product-card-body">
                        <p className="product-brand">{product.brand}</p>
                        <h2>{product.name}</h2>
                        <p>{product.category}</p>
                        <strong>{formatPrice(product)} inc VAT</strong>
                        <span className={`stock-badge ${availabilityClass}`}>{productAvailability(product)}</span>
                        <p className="meta">Manufacturer Reference {product.manufacturerReference ?? product.supplierSku}</p>
                        <div className="product-actions">
                          <a href={`/products/${product.slug}`}>View details</a>
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
              })}
            </div>
          ) : (
            <div className="notice">
              <strong>No products match those filters.</strong>
              <p className="meta">Try clearing filters or search terms.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
