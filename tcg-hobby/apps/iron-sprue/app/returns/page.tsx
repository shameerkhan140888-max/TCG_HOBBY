import { ironSprueBrand } from '../../lib/brand';

export default function ReturnsPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Returns</p>
        <h1>Returns and refunds</h1>
        <p className="lead">How cancellations, changed-mind returns, faulty or damaged goods, incorrect items and refunds are handled by Iron Sprue.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>About this policy</h2>
            <p>This policy explains how cancellations, changed-mind returns, faulty or damaged goods, incorrect items and refunds are handled by Iron Sprue.</p>
            <p>Iron Sprue is a trading name of {ironSprueBrand.legalEntity}.</p>
          </section>
          <section>
            <h2>Cancelling an online order</h2>
            <p>If you are a consumer buying goods online, you will usually have a legal right to cancel your order without giving a reason.</p>
            <p>For most eligible goods, you have 14 days from the day after you receive the goods to tell us that you wish to cancel. If an order contains several goods delivered separately, the cancellation period normally runs from the day after you receive the final item.</p>
            <p>To cancel, email <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a> and include your name, order number, the item or items you wish to cancel, and a clear statement that you wish to cancel the order. You do not have to use any particular wording.</p>
          </section>
          <section>
            <h2>Returning goods after cancellation</h2>
            <p>After telling us that you wish to cancel, you normally have a further 14 days to send the goods back.</p>
            <p>Please contact us before posting a return so that we can confirm the correct return instructions and return address.</p>
            <p>Unless the goods are faulty, damaged, incorrect or we agree otherwise, you are normally responsible for the direct cost of returning goods following a changed-mind cancellation. Please obtain proof of posting or other evidence of return.</p>
          </section>
          <section>
            <h2>Condition of changed-mind returns</h2>
            <p>You may inspect goods in the way that you reasonably could in a shop. You should take reasonable care of the goods while they are in your possession.</p>
            <p>Where handling goes beyond what is reasonably necessary to establish the nature, characteristics and functioning of the goods, we may make a deduction from the refund to reflect any reduction in value permitted by law.</p>
            <p>Opening outer packaging does not automatically remove your cancellation rights. Model kits, puzzles, tools and accessories should, where reasonably possible, be returned with their supplied parts, instructions, accessories and packaging.</p>
          </section>
          <section>
            <h2>Goods that may be excluded</h2>
            <p>Some goods may be exempt from the statutory right to cancel where the law provides an exception.</p>
            <p>For example, this may apply to certain sealed goods where the seal has been broken and the goods are not suitable for return for health-protection or hygiene reasons, or to goods made to a customer's specification.</p>
            <p>We will not apply an exception unless it genuinely applies to the product concerned.</p>
          </section>
          <section>
            <h2>Faulty, damaged or incorrect goods</h2>
            <p>Your statutory rights are separate from the changed-mind cancellation rights above.</p>
            <p>If goods are faulty, damaged, not as described or you receive the wrong item, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a> as soon as reasonably possible.</p>
            <p>Please provide your order number, the product involved, a description of the problem, and photographs where these help us understand the issue. We may ask for photographs of packaging, manufacturer references, sprues, components or other relevant details.</p>
            <p>Depending on the circumstances and your statutory rights, the appropriate remedy may include repair, replacement, price reduction or refund. Nothing in this policy limits your rights under applicable consumer law.</p>
          </section>
          <section>
            <h2>Refunds</h2>
            <p>Where you validly cancel an eligible online order, we will refund the sums due to you, including the cost of our least expensive standard delivery option where the law requires this.</p>
            <p>If you selected a more expensive delivery service, we do not have to refund the additional amount above our standard delivery charge.</p>
            <p>We may withhold a refund until we have received the goods back or you provide evidence that you have sent them back, whichever happens first, where the law permits.</p>
            <p>We will make the refund without undue delay and normally within 14 days of the relevant statutory refund trigger. Refunds will normally be made using the original payment method unless otherwise agreed. Your bank or payment provider may take additional time to display the refund.</p>
          </section>
          <section>
            <h2>Return postage for faulty goods</h2>
            <p>Where goods are faulty, damaged in transit, incorrectly supplied or otherwise require a remedy for which we are responsible, we will provide appropriate return instructions and will not require you to bear return costs where the law requires us to cover them.</p>
          </section>
          <section>
            <h2>Missing components</h2>
            <p>If a kit or puzzle appears to contain a missing or defective manufacturer-supplied component, contact us before disposing of any packaging.</p>
            <p>Where appropriate, we may work with the manufacturer or distributor to resolve the issue, but this does not reduce the rights you have against us as the retailer.</p>
          </section>
          <section>
            <h2>Contact</h2>
            <p>For cancellations, returns or refunds, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a> and include your order number.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
