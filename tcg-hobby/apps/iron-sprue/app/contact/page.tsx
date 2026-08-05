import { ironSprueBrand } from '../../lib/brand';

export default function ContactPage() {
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Contact</p>
        <h1>Contact Iron Sprue</h1>
        <p className="lead">For launch questions, supplier enquiries and customer support, contact the Iron Sprue team.</p>
      </div>
      <div className="detail-panels">
        <article>
          <h2>Email</h2>
          <p><a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a></p>
        </article>
        <article>
          <h2>Company details</h2>
          <p>Iron Sprue is a trading division of Capital Hobby Group Ltd, company number 17336948. Registered office: 4-6 Greatorex Street, London, United Kingdom, E1 5NF.</p>
        </article>
      </div>
    </section>
  );
}
