import { ironSprueBrand } from '../../lib/brand';

export default function TermsPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Terms</p>
        <h1>Terms and conditions</h1>
        <p className="lead">These terms apply to purchases from Iron Sprue and to your use of the Iron Sprue website.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>About Iron Sprue</h2>
            <p>Iron Sprue is a trading name of {ironSprueBrand.legalEntity}, registered in England and Wales.</p>
            <p>Registered office: {ironSprueBrand.registeredOffice.join(', ')}. Company number {ironSprueBrand.companyNumber}. VAT number GB 525 2040 33. Email: <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
          <section>
            <h2>Products</h2>
            <p>We take reasonable care to ensure that product descriptions, images, manufacturer references, prices and specifications are accurate.</p>
            <p>Minor differences may occur where manufacturers alter packaging, colours, specifications or presentation without changing the essential nature of the product.</p>
            <p>Product images are illustrative of the relevant product and should be read together with the description and specifications.</p>
          </section>
          <section>
            <h2>Availability</h2>
            <p>All products are subject to availability. Placing an item in your basket does not reserve it indefinitely.</p>
            <p>If an item becomes unavailable after you place an order, we will contact you and refund any amount paid for goods we cannot supply.</p>
          </section>
          <section>
            <h2>Prices</h2>
            <p>Prices are shown in pounds sterling. Where indicated, prices include VAT at the applicable rate.</p>
            <p>Delivery charges and any applicable discounts are shown before you submit payment.</p>
            <p>If we discover an obvious pricing error, we may contact you before accepting or fulfilling the order. We are not required to supply goods at a price that was clearly displayed in error where it would have been reasonable to recognise the mistake.</p>
          </section>
          <section>
            <h2>Orders and contract formation</h2>
            <p>When you submit an order, you are making an offer to buy the goods listed in that order.</p>
            <p>Receipt of payment or an automated acknowledgement does not by itself mean that we have accepted your order.</p>
            <p>The contract between you and {ironSprueBrand.legalEntity} is formed when we send you confirmation that your order has been accepted for fulfilment.</p>
            <p>If we cannot accept an order, we will tell you and refund any payment that has been taken.</p>
          </section>
          <section>
            <h2>Payment</h2>
            <p>Payment is handled through the payment service displayed at checkout. We do not store full payment-card details on Iron Sprue systems.</p>
            <p>You must provide accurate payment and billing information.</p>
          </section>
          <section>
            <h2>Fraud and security checks</h2>
            <p>Orders may be subject to reasonable fraud, payment or security checks.</p>
            <p>We may decline or cancel an order where there is a genuine issue involving failed or unauthorised payment, suspected fraud, incorrect customer details, stock error, pricing error, inability to deliver, or misuse of the service.</p>
          </section>
          <section>
            <h2>Delivery</h2>
            <p>Current delivery options, charges and qualifying free-delivery terms are displayed during checkout and explained on our <a href="/delivery">Delivery</a> page.</p>
            <p>Standard delivery is currently £3.99. The current free-delivery threshold is £30 including VAT after discounts and excluding delivery charges, unless the current storefront or checkout configuration states otherwise.</p>
            <p>Risk in the goods passes to you when the goods are delivered to you or to a person identified by you to take possession of them, subject to applicable law.</p>
          </section>
          <section>
            <h2>Cancellation and returns</h2>
            <p>Consumers buying online may have statutory cancellation rights.</p>
            <p>For most eligible goods, you can normally notify us within 14 days after receiving the goods that you wish to cancel, and you then normally have another 14 days to return them.</p>
            <p>Full instructions, exclusions, return costs and refund timing are set out on our <a href="/returns">Returns and Refunds</a> page. Nothing in these terms removes or limits statutory consumer rights.</p>
          </section>
          <section>
            <h2>Faulty or misdescribed goods</h2>
            <p>Goods must be of satisfactory quality, fit for purpose where applicable and as described, subject to the rights provided by consumer law.</p>
            <p>If there is a problem with a product, contact us. Remedies may include repair, replacement, price reduction or refund depending on the circumstances and applicable law.</p>
          </section>
          <section>
            <h2>Bundles and promotions</h2>
            <p>Where products are sold as a bundle, the bundle price applies to the complete bundle identified at checkout.</p>
            <p>Promotional savings, voucher codes and free-delivery thresholds are subject to the conditions stated with the promotion. Unless expressly stated otherwise, discounts cannot be converted into cash.</p>
            <p>If part of a discounted bundle is returned, any refund may be adjusted to reflect the price paid and the value of goods retained, where permitted by law.</p>
          </section>
          <section>
            <h2>Accounts</h2>
            <p>You may be able to create an account containing order history, wishlist and profile information. You are responsible for keeping your login credentials secure.</p>
            <p>Please contact us if you believe your account has been accessed without permission. Guest checkout may also be available.</p>
          </section>
          <section>
            <h2>Website availability</h2>
            <p>We aim to keep the website available and accurate but cannot guarantee uninterrupted access.</p>
            <p>We may temporarily suspend access for maintenance, security, updates or circumstances beyond our control.</p>
          </section>
          <section>
            <h2>Intellectual property</h2>
            <p>The Iron Sprue name, original site content, original imagery, design and other materials owned by or licensed to {ironSprueBrand.legalEntity} are protected by intellectual-property rights.</p>
            <p>Manufacturer names, logos and trademarks belong to their respective owners. Unless specifically stated, Iron Sprue is an independent retailer and does not claim ownership of third-party trademarks.</p>
          </section>
          <section>
            <h2>Liability</h2>
            <p>Nothing in these terms excludes liability where exclusion would be unlawful, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation.</p>
            <p>If you are a consumer, we are responsible for losses that are a foreseeable result of our breach of these terms or failure to use reasonable care and skill.</p>
            <p>We are not responsible for losses that were not foreseeable, or for business losses where you are purchasing wholly as a consumer. Your statutory rights are unaffected.</p>
          </section>
          <section>
            <h2>Personal information</h2>
            <p>We use personal information in accordance with our <a href="/privacy">Privacy Policy</a>. Optional cookies and similar technologies are governed by our <a href="/cookies">Cookie Policy</a> and consent controls.</p>
          </section>
          <section>
            <h2>Changes to these terms</h2>
            <p>We may update these terms where our business, services or legal obligations change.</p>
            <p>The terms applying to an order will normally be the version in force when that order is placed.</p>
          </section>
          <section>
            <h2>Governing law</h2>
            <p>These terms are governed by the law of England and Wales.</p>
            <p>If you are a consumer resident elsewhere in the UK, you retain any mandatory protections and rights available to you under the law applicable to you.</p>
          </section>
          <section>
            <h2>Contact</h2>
            <p><a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a></p>
            <p>{ironSprueBrand.legalEntity}, {ironSprueBrand.registeredOffice.join(', ')}.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
