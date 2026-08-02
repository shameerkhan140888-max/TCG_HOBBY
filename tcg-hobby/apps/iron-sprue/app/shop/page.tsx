import launchProducts from '../../data/launch-products.json';
import { filterIronSprueProducts, launchCatalogueStatus, productPriceMinor, type IronSprueProduct } from '../../lib/catalogue';

const importedProducts = launchProducts as IronSprueProduct[];

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const products = filterIronSprueProducts(importedProducts, {
    brand: typeof params.brand === 'string' ? params.brand : undefined,
    category: typeof params.category === 'string' ? params.category : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
  });

  return (
    <section className="band">
      <div className="section-head">
        <p className="eyebrow">Iron Sprue shop</p>
        <h1>Launch catalogue</h1>
          <p className="lead">{launchCatalogueStatus.genuineSkuCount} genuine opening purchase-order lines are loaded for Iron Sprue, with TCG Hobby products kept out of this catalogue.</p>
      </div>

      {products.length > 0 ? (
        <div className="grid">
          {products.map((product) => (
            <article className="product-card" key={product.sku}>
              <p className="eyebrow">{product.brand}</p>
              <h2>{product.name}</h2>
              <p className="meta">{product.shortDescription}</p>
              <p>£{(productPriceMinor(product) / 100).toFixed(2)} inc VAT</p>
              <p className="meta">Stock: {product.stockQuantity} unit{product.stockQuantity === 1 ? '' : 's'} · Supplier SKU {product.supplierSku}</p>
              <a href={`/products/${product.slug}`}>View details</a>
            </article>
          ))}
        </div>
      ) : (
        <div className="notice">
          <strong>No launch products imported yet.</strong>
          <p className="meta">Try clearing filters or search terms.</p>
        </div>
      )}
    </section>
  );
}
