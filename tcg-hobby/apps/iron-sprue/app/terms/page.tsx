import { ironSprueBrand } from '../../lib/brand';

export default function TermsPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Terms</p>
        <h1>Terms and conditions</h1>
        <p className="lead">These terms explain how Iron Sprue orders, accounts, payments, delivery, returns and website use are handled.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>About Iron Sprue</h2>
            <p>Iron Sprue is operated by {ironSprueBrand.legalEntity}, a company registered in England and Wales. Iron Sprue is a specialist model-kit, puzzle, hobby-tool and workshop-supplies storefront.</p>
            <p>Contact us at <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>. Registered office: {ironSprueBrand.registeredOffice.join(', ')}. Company number {ironSprueBrand.companyNumber}. VAT No. {ironSprueBrand.vatNumber}.</p>
          </section>
          <section>
            <h2>Using the website</h2>
            <p>These terms apply when you browse the Iron Sprue website, create an account, join updates, add products to your basket or place an order.</p>
            <p>You must not misuse the website, attempt to bypass security controls, submit false order information or use automated scraping in a way that affects normal service operation.</p>
          </section>
          <section>
            <h2>Products and availability</h2>
            <p>We aim to display accurate product names, images, prices, descriptions, stock states and manufacturer references. Packaging, specifications and product presentation may vary where manufacturers or suppliers update a product.</p>
            <p>Products are offered subject to availability. If stock changes before an order is accepted, checkout may prevent the order or we may contact you to resolve the issue.</p>
          </section>
          <section>
            <h2>Prices, VAT and payment</h2>
            <p>Prices are shown in pounds sterling and include VAT where stated. The basket and checkout show product totals, delivery and the final payable amount before payment is completed.</p>
            <p>Payments are processed through the payment provider shown at checkout. We do not ask you to send card details by email or store full card details on our own systems.</p>
            <p>If a price or product listing contains an obvious error, we may correct or cancel the affected order before dispatch and will explain the issue where appropriate.</p>
          </section>
          <section>
            <h2>Orders</h2>
            <p>An order is an offer to buy products from us. We accept the order when payment is confirmed and the order is confirmed by Iron Sprue, or when we dispatch the goods.</p>
            <p>We may refuse or cancel an order for reasonable operational reasons, including failed payment, stock discrepancy, suspected fraud, incorrect customer details, technical error or inability to deliver.</p>
          </section>
          <section>
            <h2>Delivery</h2>
            <p>Delivery options, prices and any available tracking information are shown during checkout or after dispatch where applicable. Estimated delivery windows are not guaranteed unless a selected service expressly says so.</p>
            <p>Risk in the products passes to you when the products are delivered to the delivery address supplied at checkout.</p>
          </section>
          <section>
            <h2>Returns, cancellations and refunds</h2>
            <p>UK consumer rights apply. Eligible customers may have cancellation and return rights under consumer protection law. These rights sit alongside any additional Iron Sprue returns process described on our Returns page.</p>
            <p>Returned products should be unused, complete, safely packaged and in a resaleable condition unless the return relates to damage, fault or an incorrect item.</p>
            <p>Refunds are normally returned to the original payment method after the return or cancellation is approved. Payment-provider and bank processing times may vary.</p>
          </section>
          <section>
            <h2>Accounts, wishlist and order history</h2>
            <p>If you create an account, you are responsible for keeping your login details secure. Account features may include order history, wishlist and customer profile information.</p>
            <p>Guest checkout remains supported. Guest order access and account order association are handled using the email and verification rules available in the service.</p>
          </section>
          <section>
            <h2>Website content and intellectual property</h2>
            <p>The Iron Sprue name, storefront design, written content, original artwork, product presentation and other materials created or licensed for the site are protected by intellectual property rights.</p>
            <p>Manufacturer names, product names, logos and trademarks belong to their respective owners. Iron Sprue is an independent retailer unless we clearly state a specific relationship.</p>
          </section>
          <section>
            <h2>Liability and governing law</h2>
            <p>Nothing in these terms excludes or limits liability where it would be unlawful to do so, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation.</p>
            <p>These terms are governed by the laws of England and Wales, subject to any mandatory consumer rights that apply where you live.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
