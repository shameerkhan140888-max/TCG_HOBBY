import launchProducts from '../data/launch-products.json';
import { buildTypeOptions, filterIronSprueProducts, isModelKitProduct, launchCatalogueStatus, pieceCountOptions, scaleOptions, structureOptions, type IronSprueProduct, vehicleManufacturerOptions } from '../lib/catalogue';
import { getIronSprueStorefrontProducts } from '../lib/admin-storefront-controls';
import { AddToBasketButton } from './basket-client';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';
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
  const selectedPieceCount = single(searchParams, 'pieceCount');
  const selectedStructure = single(searchParams, 'structure');
  const selectedBuildType = single(searchParams, 'buildType');
  const selectedAvailability = single(searchParams, 'availability');
  const selectedOffers = single(searchParams, 'offers');
  const selectedSort = single(searchParams, 'sort') || 'featured';
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
    availability: selectedAvailability || undefined,
    brand: fixedBrand ? undefined : selectedBrand || undefined,
    buildType: selectedBuildType || undefined,
    category: fixedCategory ? undefined : selectedCategory || undefined,
    offers: selectedOffers || undefined,
    pieceCount: selectedPieceCount || undefined,
    scale: selectedScale || undefined,
    structure: selectedStructure || undefined,
    vehicleManufacturer: selectedVehicleManufacturer || undefined,
    search: search || undefined,
  }).sort((left, right) => {
    if (selectedSort === 'price-asc') return (left.retailPriceMinor ?? left.priceMinor ?? 0) - (right.retailPriceMinor ?? right.priceMinor ?? 0) || left.name.localeCompare(right.name);
    if (selectedSort === 'price-desc') return (right.retailPriceMinor ?? right.priceMinor ?? 0) - (left.retailPriceMinor ?? left.priceMinor ?? 0) || left.name.localeCompare(right.name);
    if (selectedSort === 'newest') return Number(Boolean(right.launchRole || right.merchandisingRole)) - Number(Boolean(left.launchRole || left.merchandisingRole)) || left.name.localeCompare(right.name);
    return Number(Boolean(right.merchandisingRole)) - Number(Boolean(left.merchandisingRole)) || left.name.localeCompare(right.name);
  });
  const formAction = fixedBrand
    ? `/shop/${fixedBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : fixedCategory
      ? `/shop/${fixedCategory}`
      : '/shop';
  const scales = selectedBrand === 'Aoshima' || selectedCategory === 'model-kits'
    ? scaleOptions(scopedProducts)
    : [];
  const puzzleScoped = selectedCategory === '3d-puzzles-and-builds' || selectedBrand === 'CubicFun' || selectedBrand === 'Pintoo';
  const pieceCounts = puzzleScoped ? pieceCountOptions(scopedProducts) : [];
  const structures = puzzleScoped ? structureOptions(scopedProducts) : [];
  const buildTypes = selectedCategory === 'model-kits' || selectedBrand === 'Aoshima'
    ? buildTypeOptions(scopedProducts)
    : [];
  const activeFilterCount = [
    fixedBrand ? '' : selectedBrand,
    fixedCategory ? '' : selectedCategory,
    selectedVehicleManufacturer,
    selectedScale,
    selectedPieceCount,
    selectedStructure,
    selectedBuildType,
    selectedAvailability,
    selectedOffers,
  ].filter(Boolean).length;
  const filterControls = (idSuffix: string) => (
    <form action={formAction}>
      <label htmlFor={`brand-filter-${idSuffix}`}>Brand</label>
      {fixedBrand ? (
        <p className="locked-filter">{fixedBrand}</p>
      ) : (
        <select id={`brand-filter-${idSuffix}`} name="brand" defaultValue={selectedBrand}>
          <option value="">All brands</option>
          {brandOptions(storefrontProducts).map((brand) => <option value={brand} key={brand}>{brand}</option>)}
        </select>
      )}
      <label htmlFor={`category-filter-${idSuffix}`}>Category</label>
      {fixedCategory ? (
        <p className="locked-filter">{title}</p>
      ) : (
        <select id={`category-filter-${idSuffix}`} name="category" defaultValue={selectedCategory}>
          <option value="">All categories</option>
          {categoryOptions(storefrontProducts).map((category) => <option value={slugForCategory(category)} key={category}>{category}</option>)}
        </select>
      )}
      {vehicleManufacturers.length ? (
        <>
          <label htmlFor={`vehicle-manufacturer-filter-${idSuffix}`}>Vehicle manufacturer</label>
          <select id={`vehicle-manufacturer-filter-${idSuffix}`} name="vehicleManufacturer" defaultValue={selectedVehicleManufacturer}>
            <option value="">All vehicle manufacturers</option>
            {vehicleManufacturers.map((manufacturer) => <option value={manufacturer} key={manufacturer}>{manufacturer}</option>)}
          </select>
        </>
      ) : null}
      {scales.length ? (
        <>
          <label htmlFor={`scale-filter-${idSuffix}`}>Scale</label>
          <select id={`scale-filter-${idSuffix}`} name="scale" defaultValue={selectedScale}>
            <option value="">All scales</option>
            {scales.map((scale) => <option value={scale.replace(/[/:]/g, '-')} key={scale}>{scale}</option>)}
          </select>
        </>
      ) : null}
      {buildTypes.length ? (
        <>
          <label htmlFor={`build-type-filter-${idSuffix}`}>Build type</label>
          <select id={`build-type-filter-${idSuffix}`} name="buildType" defaultValue={selectedBuildType}>
            <option value="">All build types</option>
            {buildTypes.map((buildType) => <option value={buildType} key={buildType}>{buildType}</option>)}
          </select>
        </>
      ) : null}
      {structures.length ? (
        <>
          <label htmlFor={`structure-filter-${idSuffix}`}>Structure/type</label>
          <select id={`structure-filter-${idSuffix}`} name="structure" defaultValue={selectedStructure}>
            <option value="">All structures</option>
            {structures.map((structure) => <option value={structure} key={structure}>{structure}</option>)}
          </select>
        </>
      ) : null}
      {pieceCounts.length ? (
        <>
          <label htmlFor={`piece-count-filter-${idSuffix}`}>Piece count</label>
          <select id={`piece-count-filter-${idSuffix}`} name="pieceCount" defaultValue={selectedPieceCount}>
            <option value="">All piece counts</option>
            {pieceCounts.map((pieceCount) => <option value={pieceCount} key={pieceCount}>{pieceCount} pieces</option>)}
          </select>
        </>
      ) : null}
      <label htmlFor={`availability-filter-${idSuffix}`}>Availability</label>
      <select id={`availability-filter-${idSuffix}`} name="availability" defaultValue={selectedAvailability}>
        <option value="">All states</option>
        <option value="in-stock">In stock</option>
        <option value="low-stock">Low stock</option>
        <option value="coming-soon">Coming soon</option>
      </select>
      {search ? <input type="hidden" name="search" value={search} /> : null}
      {selectedOffers ? <input type="hidden" name="offers" value={selectedOffers} /> : null}
      {selectedSort && selectedSort !== 'featured' ? <input type="hidden" name="sort" value={selectedSort} /> : null}
      <button type="submit">Apply filters</button>
      {activeFilterCount ? <a className="filter-clear" href={formAction}>Clear filters</a> : null}
    </form>
  );

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
        <details className="mobile-filter-drawer">
          <summary>Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</summary>
          {filterControls('mobile')}
        </details>
        <aside className="filter-panel" aria-label="Catalogue filters">
          {filterControls('desktop')}
        </aside>

        <div>
          <div className="catalogue-toolbar">
            <p>{products.length} product{products.length === 1 ? '' : 's'}</p>
            <form action={formAction} className="catalogue-sort-form">
              {search ? <input type="hidden" name="search" value={search} /> : null}
              {!fixedBrand && selectedBrand ? <input type="hidden" name="brand" value={selectedBrand} /> : null}
              {!fixedCategory && selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
              {selectedVehicleManufacturer ? <input type="hidden" name="vehicleManufacturer" value={selectedVehicleManufacturer} /> : null}
              {selectedScale ? <input type="hidden" name="scale" value={selectedScale} /> : null}
              {selectedPieceCount ? <input type="hidden" name="pieceCount" value={selectedPieceCount} /> : null}
              {selectedStructure ? <input type="hidden" name="structure" value={selectedStructure} /> : null}
              {selectedBuildType ? <input type="hidden" name="buildType" value={selectedBuildType} /> : null}
              {selectedAvailability ? <input type="hidden" name="availability" value={selectedAvailability} /> : null}
              {selectedOffers ? <input type="hidden" name="offers" value={selectedOffers} /> : null}
              <select aria-label="Sort products" name="sort" defaultValue={selectedSort}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="newest">Newest</option>
              </select>
              <button type="submit">Sort</button>
            </form>
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
