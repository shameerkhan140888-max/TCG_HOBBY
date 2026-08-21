import { ironSprueBrand } from '../../lib/brand';

export default function ReturnsPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Returns</p>
        <h1>Returns and refunds</h1>
        <p className="lead">How Iron Sprue handles changed-mind returns, damaged items, incorrect items, cancellations and refunds.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Before returning an item</h2>
            <p>Please contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a> before sending anything back so we can confirm the correct steps and avoid delays.</p>
            <p>Include your order number, the item involved and a brief description of the issue.</p>
          </section>
          <section>
            <h2>Changed your mind</h2>
            <p>UK consumer cancellation rights apply where applicable. If you wish to return an eligible item, it should be unused, complete, safely packaged and in a resaleable condition.</p>
            <p>Model kits, puzzles, tools and consumables must be returned with all included parts, instructions, packaging and accessories where supplied.</p>
          </section>
          <section>
            <h2>Damaged or incorrect items</h2>
            <p>If an item arrives damaged or incorrect, contact us promptly with your order number and clear photos of the item and packaging.</p>
            <p>We may ask for packaging, batch, sprue, box or manufacturer-reference information so the issue can be reviewed accurately.</p>
          </section>
          <section>
            <h2>Items that may not be resaleable</h2>
            <p>Opened, used, incomplete, damaged or altered products may not be suitable for a changed-mind return if their condition prevents resale. This does not affect your statutory rights for faulty or incorrectly supplied goods.</p>
            <p>Consumables such as adhesives, paints or finishing materials may need extra review if they have been opened or used.</p>
          </section>
          <section>
            <h2>Refunds</h2>
            <p>Where a refund is due, it will normally be returned to the original payment method after the return or issue has been checked.</p>
            <p>We will explain any deduction, partial refund or refusal where the condition of the returned item or the circumstances require it. Bank and payment-provider processing times may vary.</p>
          </section>
          <section>
            <h2>Return postage</h2>
            <p>If an item is faulty, damaged in transit or supplied incorrectly, we will explain the appropriate return route or remedy.</p>
            <p>For changed-mind returns, you may be responsible for return postage unless we agree otherwise or consumer law requires a different outcome.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
