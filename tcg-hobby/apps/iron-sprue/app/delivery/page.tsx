import { ironSprueBrand } from '../../lib/brand';

export default function DeliveryPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Delivery</p>
        <h1>Delivery information</h1>
        <p className="lead">How Iron Sprue packs, dispatches and tracks orders for model kits, puzzles, tools and workshop supplies.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Delivery area</h2>
            <p>Iron Sprue checkout is configured for UK customer delivery. Available delivery services, prices and totals are shown before you complete payment.</p>
            <p>If a delivery option is not available for the address or basket, checkout will explain this before payment is taken.</p>
          </section>
          <section>
            <h2>Delivery costs and totals</h2>
            <p>Delivery charges are calculated during checkout and included in the final amount submitted for payment.</p>
            <p>The basket and checkout show product totals, delivery and the final payable total before you continue to secure payment.</p>
          </section>
          <section>
            <h2>Dispatch</h2>
            <p>Orders are prepared after payment is confirmed. Dispatch timing may depend on order volume, item type, packaging requirements, weekends, bank holidays or operational checks.</p>
            <p>You will receive order and dispatch updates using the email address supplied at checkout.</p>
          </section>
          <section>
            <h2>Packaging</h2>
            <p>Model kits, display puzzles, tools and finishing products are packed with care for the product type. Larger, delicate or display-led products may need additional packing time.</p>
            <p>Please keep packaging and delivery materials if you need to report damage or an incorrect item.</p>
          </section>
          <section>
            <h2>Tracking</h2>
            <p>Where a tracked service is used, Iron Sprue will provide the courier and tracking number when the order is dispatched.</p>
            <p>Tracking updates are supplied by the carrier and may take time to appear after dispatch.</p>
          </section>
          <section>
            <h2>Delivery help</h2>
            <p>If you need help with a delivery, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a> with your order number.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
