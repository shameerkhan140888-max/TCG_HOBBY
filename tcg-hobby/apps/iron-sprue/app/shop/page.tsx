import launchProducts from '../../data/launch-products.json';
import { filterIronSprueProducts, launchCatalogueStatus, type IronSprueProduct } from '../../lib/catalogue';
import { brandOptions, categoryOptions, formatPrice, productAvailability, productImage, slugForCategory } from '../../lib/storefront';

const importedProducts = launchProducts as IronSprueProduct[];

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const selectedBrand = typeof params.brand === 'string' ? params.brand : '';
  const selectedCategory = typeof params.category === 'string' ? params.category : '';
  const search = typeof params.search === 'string' ? params.search : '';
  const products = filterIronSprueProducts(importedProducts, {
    brand: selectedBrand || undefined,
    category: selectedCategory || undefined,
    search: search || undefined,
  });

  return (
    <section className="section-block catalogue-page">
      <div className="catalogue-hero">
        <div>
          <p className="eyebrow">Iron Sprue shop</p>
          <h1>Launch catalogue</h1>
          <p className="lead">{launchCatalogueStatus.genuineSkuCount} launch lines are staged for Iron Sprue, with brand, category, price and stock presentation ready for the full media workflow.</p>
        </div>
        <form className="catalogue-search" action="/shop">
          <label htmlFor="catalogue-search">Search catalogue</label>
          <input id="catalogue-search" name="search" type="search" defaultValue={search} placeholder="Search kits, brands or tools" />
          <button type="submit">Search</button>
        </form>
      </div>

      <div className="catalogue-layout">
        <aside className="filter-panel" aria-label="Catalogue filters">
          <form action="/shop">
            <label htmlFor="brand-filter">Brand</label>
            <select id="brand-filter" name="brand" defaultValue={selectedBrand}>
              <option value="">All brands</option>
              {brandOptions(importedProducts).map((brand) => <option value={brand} key={brand}>{brand}</option>)}
            </select>
            <label htmlFor="category-filter">Category</label>
            <select id="category-filter" name="category" defaultValue={selectedCategory}>
              <option value="">All categories</option>
              {categoryOptions(importedProducts).map((category) => <option value={slugForCategory(category)} key={category}>{category}</option>)}
            </select>
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
              {products.map((product) => (
                <article className="product-card" key={product.sku}>
                  <div className="product-image">
                    {productImage(product) ? <img src={productImage(product) ?? ''} alt={product.name} width="1000" height="1000" /> : <span>{product.brand}</span>}
                  </div>
                  <div className="product-card-body">
                    <p className="product-brand">{product.brand}</p>
                    <h2>{product.name}</h2>
                    <p>{product.category}</p>
                    <strong>{formatPrice(product)} inc VAT</strong>
                    <span className="stock-badge">{productAvailability(product)}</span>
                    <p className="meta">Supplier SKU {product.supplierSku}</p>
                    <div className="product-actions">
                      <a href={`/products/${product.slug}`}>View details</a>
                      <button type="button" disabled>Add to basket</button>
                    </div>
                  </div>
                </article>
              ))}
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
