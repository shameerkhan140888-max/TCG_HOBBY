export default function WishlistPage() {
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Wishlist</p>
        <h1>Members-only wishlist</h1>
        <p className="lead">Wishlist controls are visible in the storefront design and will redirect guests to login when the shared account flow is connected.</p>
      </div>
      <div className="empty-state">
        <h2>No saved products yet.</h2>
        <p>Browse the launch range and save kits for later once accounts are enabled.</p>
        <a className="button" href="/shop">Browse products</a>
      </div>
    </section>
  );
}
