import { ironSprueBrand } from '../../lib/brand';

export default function AboutPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">About</p>
        <h1>About Iron Sprue</h1>
        <p className="lead">Iron Sprue is the modelling, model-kit and workshop-products storefront from Capital Hobby Group Ltd.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Who we are</h2>
            <p>Iron Sprue is operated by {ironSprueBrand.legalEntity}, trading as Iron Sprue. The storefront focuses on model kits, display builds, puzzles and practical workshop essentials for builders who value accurate subjects, clean presentation and reliable order handling.</p>
          </section>
          <section>
            <h2>What we stock</h2>
            <p>The Iron Sprue catalogue brings together selected model kits, jigsaws, puzzle builds, tools, adhesives and finishing products. Product pages are intended to show clear product information, customer-facing images, pricing, availability and delivery information before checkout.</p>
          </section>
          <section>
            <h2>How orders are handled</h2>
            <p>Orders are processed through the Iron Sprue storefront and Admin workflow. Customers receive transactional updates for confirmed orders, cancellations or refunds, and dispatch information where tracking is available.</p>
          </section>
          <section>
            <h2>Need help?</h2>
            <p>For order, product or policy questions, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
