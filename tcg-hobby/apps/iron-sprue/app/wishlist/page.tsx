import { redirect } from 'next/navigation';
import { getCurrentIronSprueCustomerSession } from '../../lib/auth';
import { importLocalStorefrontDatabase } from '../../lib/local-database';
import { shouldUseIronSprueProductionApi } from '../../lib/production-api';
import { removeIronSprueWishlistItemAction } from '../../lib/wishlist-actions';

function money(value: number | null | undefined, currency = 'GBP') {
  if (value == null) return 'Price pending';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value / 100);
}

export default async function WishlistPage() {
  const session = await getCurrentIronSprueCustomerSession();
  if (!session) redirect('/login?next=/wishlist');
  if (shouldUseIronSprueProductionApi()) return <WishlistItems items={[]} />;
  const { prisma } = await importLocalStorefrontDatabase();
  const items = await prisma.ironSprueWishlistItem.findMany({
    where: { storeCode: 'IRON_SPRUE', userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: { brand: true, category: true } } },
  });
  return <WishlistItems items={items} />;
}

function WishlistItems({ items }: { items: Array<{
  id: string;
  product: {
    customerTitle: string;
    slug: string;
    grossPriceMinor: number | null;
    currency: string;
    brand: { name: string } | null;
    category: { name: string } | null;
  };
}> }) {
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Wishlist</p>
        <h1>Saved for the bench</h1>
        <p className="lead">Keep a shortlist of kits, puzzles and tools for your next Iron Sprue order.</p>
      </div>
      {items.length ? (
        <div className="account-list">
          {items.map((item) => (
            <div className="account-list-card" key={item.id}>
              <span>
                <strong>{item.product.customerTitle}</strong>
                <small>{item.product.brand?.name ?? 'Iron Sprue'} - {item.product.category?.name ?? 'Catalogue'} - {money(item.product.grossPriceMinor, item.product.currency)} inc VAT</small>
              </span>
              <span className="wishlist-actions">
                <a className="button secondary" href={`/products/${item.product.slug}`}>View</a>
                <form action={removeIronSprueWishlistItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="button secondary">Remove</button>
                </form>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No saved products yet.</h2>
          <p>Use Save to wishlist on any product page to build your shortlist.</p>
          <a className="button" href="/shop">Browse products</a>
        </div>
      )}
    </section>
  );
}
