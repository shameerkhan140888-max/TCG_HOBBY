import { ironSprueBrand } from '../../lib/brand';

export default function ContactPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Contact</p>
        <h1>Contact Iron Sprue</h1>
        <p className="lead">For customer support, order questions, supplier enquiries and Iron Sprue account help.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Email support</h2>
            <p>Contact Iron Sprue at <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
            <p>Please include your order number where your enquiry relates to an order, delivery, return, refund or payment.</p>
          </section>
          <section>
            <h2>Order and delivery help</h2>
            <p>For order support, include the email address used at checkout, the product involved and any relevant photos if the enquiry concerns damage, missing parts or an incorrect item.</p>
            <p>For delivery questions, include the order number and tracking information if one has been provided.</p>
          </section>
          <section>
            <h2>Product and supplier enquiries</h2>
            <p>For supplier, brand or product-range enquiries, include the manufacturer, product reference and a short summary of the enquiry so it can be routed appropriately.</p>
          </section>
          <section>
            <h2>Company details</h2>
            <p>Iron Sprue is a trading name of {ironSprueBrand.legalEntity}. Registered office: {ironSprueBrand.registeredOffice.join(', ')}. Company number {ironSprueBrand.companyNumber}. VAT No. {ironSprueBrand.vatNumber}.</p>
          </section>
          <section>
            <h2>Security reminder</h2>
            <p>Do not send full card details, passwords or other sensitive account credentials by email. Payment is handled through the secure checkout flow.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
