import { ironSprueBrand } from '../../lib/brand';

export default function PrivacyPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy policy</h1>
        <p className="lead">How Capital Hobby Group Ltd collects and uses personal information through Iron Sprue.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Who we are</h2>
            <p>Iron Sprue is a trading name of {ironSprueBrand.legalEntity}. {ironSprueBrand.legalEntity} is the data controller for personal information processed through Iron Sprue.</p>
            <p>Registered office: {ironSprueBrand.registeredOffice.join(', ')}. Company number {ironSprueBrand.companyNumber}. Privacy enquiries: <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>.</p>
          </section>
          <section>
            <h2>Information we may collect</h2>
            <ul>
              <li>Identity and contact information, including name, email address, delivery address, billing address and contact information.</li>
              <li>Account information, including account identifiers, profile information, saved preferences, wishlist information and authentication or security records.</li>
              <li>Order information, including products ordered, quantities, prices, VAT, delivery information, fulfilment status, returns, refunds and order communications.</li>
              <li>Payment information, including payment status, transaction references and limited information returned by our payment provider. We do not store full payment-card details.</li>
              <li>Customer-service information, including messages, photographs and information you send when contacting us about an order, product, return or enquiry.</li>
              <li>Marketing information, including newsletter subscription status, consent records, consent wording, source, timestamp, unsubscribe status and marketing preferences.</li>
              <li>Technical and security information, including IP address, device/browser information, request information, session/security identifiers, fraud-prevention information, cookie preferences and limited diagnostic information.</li>
              <li>Analytics information where optional analytics has been enabled and you have given the required consent.</li>
            </ul>
          </section>
          <section>
            <h2>Why we use information</h2>
            <p>To process and deliver orders, we use information necessary to take payment, arrange delivery, provide order updates, manage returns and perform our contract with you. Lawful basis: contract.</p>
            <p>To provide accounts and requested features, we process information needed to operate accounts, order history, wishlists and customer features you choose to use. Lawful basis: contract and, where appropriate, legitimate interests in operating and securing our service.</p>
            <p>To comply with legal and financial obligations, we retain information necessary for accounting, taxation, fraud prevention, regulatory requirements and legal claims. Lawful basis: legal obligation and, where appropriate, legitimate interests.</p>
            <p>To provide customer support, we use information to answer enquiries and resolve order or product issues. Lawful basis: contract and legitimate interests.</p>
            <p>To protect the website and prevent fraud, we process limited technical/security information to maintain the integrity of accounts, payments, orders and the website. Lawful basis: legitimate interests and, where applicable, legal obligation.</p>
            <p>To send marketing emails, we normally rely on consent for Iron Sprue email marketing. You can unsubscribe at any time.</p>
            <p>Analytics and optional marketing technologies operate only in accordance with applicable consent requirements. Lawful basis: normally consent.</p>
          </section>
          <section>
            <h2>Who we share information with</h2>
            <p>We may share information with service providers where necessary to operate Iron Sprue, including payment processors, delivery and logistics providers, email and transactional-message providers, website, hosting and infrastructure providers, security and fraud-prevention providers, accounting and professional advisers, analytics providers where enabled and consented to, and government, tax, regulatory or law-enforcement bodies where legally required.</p>
            <p>Current provider categories reflected in the service include Stripe for payment processing, Resend for transactional and marketing email where configured, Cloudflare for storefront delivery, security and media storage, Railway and database-hosting infrastructure for the API and operational data, Google Maps Platform for checkout address lookup and validation where configured, and Google Analytics or Meta technologies only where configured and consented to.</p>
            <p>Providers receive only the information reasonably required for their role. We do not sell personal information to advertisers.</p>
          </section>
          <section>
            <h2>Payment information</h2>
            <p>Payments are processed using the payment provider presented at checkout. Full card details are handled by the payment provider rather than stored by Iron Sprue.</p>
          </section>
          <section>
            <h2>International transfers</h2>
            <p>Some service providers may process information outside the United Kingdom. Where personal information is transferred internationally, we will use an appropriate lawful transfer mechanism where required, such as an adequacy regulation, recognised contractual safeguards or another mechanism permitted by data-protection law.</p>
            <p>This policy describes the transfer position at a customer-appropriate level. Provider-specific safeguards are reviewed as part of operational supplier management.</p>
          </section>
          <section>
            <h2>How long we keep information</h2>
            <p>We keep personal information only for as long as reasonably necessary for the purpose for which it was collected, including applicable legal, tax, accounting, fraud-prevention and dispute-resolution requirements.</p>
            <ul>
              <li>Order and accounting records are retained for the period required for tax, accounting, legal and dispute-resolution obligations.</li>
              <li>Account records are retained while the account remains active and afterwards where reasonably required to operate the service, protect the account, resolve disputes or comply with legal obligations.</li>
              <li>Customer-service correspondence is retained for an appropriate period to resolve enquiries, returns, disputes and service records.</li>
              <li>Marketing consent records are retained as necessary to demonstrate consent and honour unsubscribe choices.</li>
              <li>Security and fraud logs are retained for a limited period proportionate to the security purpose.</li>
            </ul>
          </section>
          <section>
            <h2>Your rights</h2>
            <p>Depending on the circumstances, you may have rights including access to your personal information, correction of inaccurate information, deletion, restriction of processing, data portability, objection to processing, and withdrawal of consent where processing is based on consent.</p>
            <p>These rights are not absolute in every situation. To exercise a right, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a>. If you withdraw marketing consent, this will not affect processing carried out lawfully before withdrawal.</p>
          </section>
          <section>
            <h2>Direct marketing</h2>
            <p>You have the right to object to direct marketing. Every marketing email should provide an unsubscribe method.</p>
          </section>
          <section>
            <h2>Automated decision-making</h2>
            <p>Iron Sprue does not currently intend to make decisions producing legal or similarly significant effects about customers solely by automated processing.</p>
          </section>
          <section>
            <h2>Complaints</h2>
            <p>If you have concerns about how we use your information, please contact us first so we can investigate.</p>
            <p>You also have the right to complain to the Information Commissioner's Office. The ICO provides information about complaints and data-protection rights at its official website.</p>
          </section>
          <section>
            <h2>Security</h2>
            <p>We use technical and organisational measures intended to protect personal information. No internet-based service can guarantee absolute security.</p>
          </section>
          <section>
            <h2>Cookies</h2>
            <p>See our <a href="/cookies">Cookie Policy</a> and cookie-preference controls for information about browser storage and optional analytics or marketing technologies.</p>
          </section>
          <section>
            <h2>Changes to this policy</h2>
            <p>We may update this policy when our processing activities, service providers or legal obligations change. The current version will be published on this page.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
