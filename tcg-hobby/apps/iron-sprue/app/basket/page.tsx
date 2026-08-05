export default function BasketPage() {
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Basket</p>
        <h1>Your basket</h1>
        <p className="lead">The basket presentation is ready for the shared Node commerce API. Checkout remains disabled until the approved integration stage.</p>
      </div>
      <div className="empty-state">
        <h2>Your basket is empty.</h2>
        <p>Start with model kits, puzzle builds or workshop essentials.</p>
        <a className="button" href="/shop">Continue shopping</a>
      </div>
    </section>
  );
}
