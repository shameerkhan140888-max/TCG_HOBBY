import { ironSprueBrand } from '../../lib/brand';

export default function PrivacyPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy policy</h1>
        <p className="lead">How Iron Sprue collects, uses and protects customer, account, order, support and marketing-consent information.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Who controls your data</h2>
            <p>{ironSprueBrand.legalEntity} is the data controller for Iron Sprue. Registered office: {ironSprueBrand.registeredOffice.join(', ')}. Company number {ironSprueBrand.companyNumber}. VAT No. {ironSprueBrand.vatNumber}.</p>
            <p>For privacy questions, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
          <section>
            <h2>Information we collect</h2>
            <p>We may collect information you provide when you browse, create an account, join the launch list, contact us, use wishlist features, place an order or request support.</p>
            <ul>
              <li>Name, email address and account details.</li>
              <li>Delivery and billing information supplied at checkout.</li>
              <li>Order details, product lines, payment status, fulfilment and return/refund records.</li>
              <li>Marketing-consent records, including consent wording, source and timestamp.</li>
              <li>Support messages and information needed to help with an order or product issue.</li>
              <li>Limited technical information needed for security, fraud prevention, basket operation and service reliability.</li>
            </ul>
          </section>
          <section>
            <h2>How we use information</h2>
            <p>We use personal information to operate accounts, baskets, checkout, payments, delivery, order history, customer support, refunds, returns, fraud prevention, legal record keeping and requested marketing updates.</p>
            <p>We only send marketing where consent or another lawful basis allows it, and you can unsubscribe from marketing emails at any time.</p>
          </section>
          <section>
            <h2>Sharing information</h2>
            <p>We share information only where needed to operate Iron Sprue, such as with payment, delivery, email, hosting, analytics where consented, fraud-prevention, accounting or support providers.</p>
            <p>We do not sell customer personal information.</p>
          </section>
          <section>
            <h2>Payment and security</h2>
            <p>Payments are handled by the payment provider shown at checkout. Iron Sprue does not store full card details on its own systems.</p>
            <p>We use reasonable technical and organisational measures designed to protect personal information from unauthorised access, misuse, alteration or loss.</p>
          </section>
          <section>
            <h2>Retention</h2>
            <p>We keep information only for as long as needed for the purpose collected, including customer support, account operation, tax, accounting, fraud prevention, consent audit and legal record requirements.</p>
            <p>If you unsubscribe from marketing, we may keep enough information to make sure the unsubscribe request continues to be respected.</p>
          </section>
          <section>
            <h2>Your rights</h2>
            <p>You can ask for access, correction, deletion, restriction or portability of your personal data, or object to certain processing, where applicable law gives you those rights.</p>
            <p>To make a request, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
          <section>
            <h2>Cookies and similar technologies</h2>
            <p>Essential technologies are used for security, account sessions, basket and checkout. Optional analytics or marketing technologies are controlled through the cookie choices available on the site where required.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
