import type { Metadata } from 'next';
import { ironSprueBrand } from '../../lib/brand';

export const metadata: Metadata = {
  title: 'Contact Iron Sprue',
  description: 'Contact Iron Sprue for customer support, order questions, supplier enquiries and account help.',
  alternates: { canonical: `${ironSprueBrand.siteUrl.replace(/\/$/, '')}/contact` },
};

export default function ContactPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Contact</p>
        <h1>Contact Iron Sprue</h1>
        <p className="lead">For customer support, order questions, supplier enquiries and Iron Sprue account help.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board contact-board">
          <section className="contact-form-section">
            <h2>Send a message</h2>
            <form className="contact-form" action={`mailto:${ironSprueBrand.contactEmail}`} method="post" encType="text/plain">
              <label htmlFor="contact-name">
                Name
                <input id="contact-name" name="Name" type="text" autoComplete="name" required />
              </label>
              <label htmlFor="contact-email">
                Email address
                <input id="contact-email" name="Email" type="email" autoComplete="email" required />
              </label>
              <label htmlFor="contact-topic">
                Enquiry type
                <select id="contact-topic" name="Enquiry type" required defaultValue="">
                  <option value="" disabled>Choose an enquiry type</option>
                  <option>Order or delivery help</option>
                  <option>Return, refund or damaged item</option>
                  <option>Product question</option>
                  <option>Supplier or brand enquiry</option>
                  <option>Account help</option>
                  <option>Other enquiry</option>
                </select>
              </label>
              <label htmlFor="contact-order">
                Order number, if relevant
                <input id="contact-order" name="Order number" type="text" autoComplete="off" placeholder="Example: IS-1001" />
              </label>
              <label className="contact-form-full" htmlFor="contact-message">
                Message
                <textarea id="contact-message" name="Message" rows={7} maxLength={1600} required placeholder="Tell us what you need help with. Include product names, tracking details or relevant context where helpful." />
              </label>
              <p className="contact-form-note">This opens your email app with the message addressed to Iron Sprue support. Please attach photos there if the enquiry involves damage, missing parts or an incorrect item.</p>
              <button type="submit">Prepare email</button>
            </form>
          </section>
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
