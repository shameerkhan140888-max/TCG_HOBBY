import launchProducts from '../data/launch-products.json';
import type { CSSProperties } from 'react';
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
  productCardFacts,
  productCardMobileFact,
  productCommerceId,
  productImage,
  productSellableQuantity,
  slugForCategory,
} from '../lib/storefront';

type Params = Record<string, string | string[] | undefined>;

const importedProducts = launchProducts as IronSprueProduct[];
type ShopBanner = {
  artSrc: string;
  artPosition?: string;
  chips: string[];
  eyebrow: string;
  summary: string;
  title: string;
  variant?: 'default' | 'reverse';
};

const shopBanners: Record<string, ShopBanner> = {
  shop: {
    artSrc: '/assets/category-banners/prototypes/bench-ready-ranges-v1.webp',
    chips: ['Model kits', '3D builds', 'Tools', 'Adhesives'],
    eyebrow: 'Iron Sprue shop',
    summary: 'Browse model kits, display builds, puzzle objects and workshop essentials selected for cleaner hobby time.',
    title: 'Bench-ready ranges.',
  },
  aoshima: {
    artSrc: '/assets/category-banners/aoshima-model-kits-parts-banner.png',
    artPosition: 'center top',
    chips: ['Official licensed subjects', 'Sharp box art', 'Display-led builds'],
    eyebrow: 'Aoshima official range',
    summary: 'A focused range of Aoshima kits featuring licensed vehicle subjects, sharp box art and display-ready projects for the Iron Sprue bench.',
    title: 'Licensed Aoshima builds.',
    variant: 'reverse',
  },
  'model-kits': {
    artSrc: '/assets/category-banners/aoshima-model-kits-parts-banner.png',
    artPosition: 'center top',
    chips: ['Official licensed subjects', '1:24 and 1:32 scale', 'Display-led builds'],
    eyebrow: 'Model kits',
    summary: 'A focused model-kit range led by Aoshima automotive subjects, official marque detail and display-led builds.',
    title: 'Licensed scale subjects.',
    variant: 'reverse',
  },
  '3d-puzzles-and-builds': {
    artSrc: '/assets/category-banners/prototypes/landmarks-with-presence-v1.webp',
    chips: ['Landmarks', 'Vases', 'Clocks', 'Lanterns'],
    eyebrow: '3D puzzles & builds',
    summary: 'Architectural kits, puzzle objects and decorative builds chosen for focused assembly and finished shelf presence.',
    title: 'Built for display.',
  },
  cubicfun: {
    artSrc: '/assets/category-banners/prototypes/cubicfun-builds-v1.webp',
    chips: ['Architecture', 'Ships', 'Light builds'],
    eyebrow: 'CubicFun showcase',
    summary: 'CubicFun display builds turn recognisable architecture and ships into calm, shelf-ready projects.',
    title: 'Landmarks with presence.',
    variant: 'reverse',
  },
  pintoo: {
    artSrc: '/assets/promo-pintoo-vase-workshop.png',
    chips: ['Vases', 'Globes', 'Screens'],
    eyebrow: 'Pintoo showcase',
    summary: 'Pintoo 3D puzzle objects reward patient building with decorative finished forms worth keeping on show.',
    title: 'Puzzle objects made to stay out.',
  },
  offers: {
    artSrc: '/assets/hero-campaigns/is-aos-06540-lamborghini-countach-lpi-800-4-red-hero.png',
    chips: ['Limited runs', 'Range picks', 'Stocked lines'],
    eyebrow: 'Current offers',
    summary: 'Selected offers across kits, display builds and practical bench additions while stock is available.',
    title: 'Bundle savings.',
    variant: 'reverse',
  },
  tools: {
    artSrc: '/assets/promo-tools.png',
    chips: ['Knives', 'Tweezers', 'Sanding', 'Measuring'],
    eyebrow: 'Tools & workshop essentials',
    summary: 'Cutting, sanding, measuring and handling tools selected to support precise assembly and tidy finishing.',
    title: 'Cleaner bench control.',
  },
  'adhesives-finishing': {
    artSrc: '/assets/workshop-remaining-sources/is-dlm-ad22-source.jpg',
    chips: ['Adhesives', 'Fillers', 'Grip', 'Finishing'],
    eyebrow: 'Adhesives & finishing',
    summary: 'Specialist adhesive and finishing products selected for clean joins, repairs and reliable bench work.',
    title: 'Hold, fill and finish.',
    variant: 'reverse',
  },
};

function single(params: Params, key: string) {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

function categoryMatches(product: IronSprueProduct, category: string) {
  if (category === '3d-puzzles-and-builds') return product.brand === 'CubicFun' || product.brand === 'Pintoo';
  if (category === 'model-kits') return isModelKitProduct(product);
  if (category === 'tools') return [
    'knives-blades',
    'magnification',
    'measuring-tools',
    'pin-vices-drills',
    'sanding-files',
    'tool-sets',
    'tweezers-pliers',
  ].includes(slugForCategory(product.category));
  return slugForCategory(product.category) === category;
}

function ShopRangeBanner({ banner }: { banner: ShopBanner }) {
  return (
    <section
      className={`shop-range-banner${banner.variant === 'reverse' ? ' reverse' : ''}`}
      aria-label={`${banner.eyebrow} banner`}
      style={banner.artPosition ? ({ '--shop-range-art-position': banner.artPosition } as CSSProperties) : undefined}
    >
      <img
        className="shop-range-art"
        src={banner.artSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <div className="shop-range-inner">
        <div className="shop-range-copy">
          <p className="eyebrow">{banner.eyebrow}</p>
          <h1>{banner.title}</h1>
          <p>{banner.summary}</p>
          <div className="shop-range-chip-row" aria-label={`${banner.eyebrow} highlights`}>
            {banner.chips.map((chip) => (
              <span className="shop-range-text-chip" key={chip}>{chip}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
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
  const bannerKey = selectedBrand === 'Aoshima'
    ? 'aoshima'
    : selectedBrand === 'CubicFun'
      ? 'cubicfun'
      : selectedBrand === 'Pintoo'
        ? 'pintoo'
        : selectedOffers
          ? 'offers'
          : selectedCategory || (fixedCategory ?? fixedBrand ? '' : 'shop');
  const shopBanner = shopBanners[bannerKey];
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
      {shopBanner ? (
        <ShopRangeBanner banner={shopBanner} />
      ) : (
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
      )}

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
                const cardFacts = productCardFacts(product);
                const mobileFact = productCardMobileFact(product);
                const manufacturerReference = (product.manufacturerReference ?? product.supplierSku ?? '').trim();
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
                        <p className="product-card-category">{product.category}</p>
                        {mobileFact ? (
                          <ul className={`product-card-facts${cardFacts.length ? '' : ' product-card-facts-mobile-only'}`} aria-label={`${product.name} product facts`}>
                            <li className="product-card-mobile-fact">{mobileFact}</li>
                            {cardFacts.map((fact) => <li key={fact}>{fact}</li>)}
                          </ul>
                        ) : null}
                        <strong>{formatPrice(product)} inc VAT</strong>
                        <span className={`stock-badge ${availabilityClass}`}>{productAvailability(product)}</span>
                        {manufacturerReference ? <p className="meta">Manufacturer Reference {manufacturerReference}</p> : null}
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
