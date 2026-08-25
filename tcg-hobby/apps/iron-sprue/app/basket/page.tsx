import { BasketClient, type BasketUpsellProduct } from '../../components/basket-client';
import launchProducts from '../../data/launch-products.json';
import { productPriceMinor, type IronSprueProduct } from '../../lib/catalogue';
import { getIronSprueStorefrontProducts } from '../../lib/admin-storefront-controls';
import { productCommerceId, productImage, productSellableQuantity } from '../../lib/storefront';

const products = launchProducts as IronSprueProduct[];

export const dynamic = 'force-dynamic';

function availableQuantity(product: IronSprueProduct) {
  return productSellableQuantity(product);
}

function isUpsellCandidate(product: IronSprueProduct) {
  const text = `${product.name} ${product.category} ${product.productType} ${product.brand}`.toLowerCase();
  return ['adhesive', 'glue', 'cement', 'tool', 'knife', 'tweezer', 'brush', 'paint', 'finishing', 'accessor', 'mat', 'file', 'sanding'].some((term) => text.includes(term));
}

function toUpsellProduct(product: IronSprueProduct): BasketUpsellProduct {
  return {
    productId: productCommerceId(product),
    productName: product.name,
    productSlug: product.slug,
    unitPriceMinor: productPriceMinor(product),
    availableQuantity: availableQuantity(product),
    imageUrl: productImage(product),
    imageAlt: product.name,
  };
}

export default async function BasketPage() {
  const storefrontProducts = await getIronSprueStorefrontProducts(products);
  const upsellProducts = storefrontProducts
    .filter((product) => availableQuantity(product) > 0)
    .filter((product) => Boolean(productImage(product)))
    .filter(isUpsellCandidate)
    .slice(0, 8)
    .map(toUpsellProduct);

  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Basket</p>
        <h1>Your basket</h1>
        <p className="lead">Review your models, puzzles and workshop essentials before moving to secure checkout.</p>
      </div>
      <BasketClient mode="basket" upsellProducts={upsellProducts} />
    </section>
  );
}
