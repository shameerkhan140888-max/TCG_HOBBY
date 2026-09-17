import { ironSprueBrand } from '../../lib/brand';

export default function DeliveryPage() {
  return (
    <section className="section-block info-page">
      <div className="section-head">
        <p className="eyebrow">Delivery</p>
        <h1>Delivery information</h1>
        <p className="lead">Where Iron Sprue delivers, delivery charges, dispatch, tracking and delivery problems.</p>
      </div>
      <div className="detail-panels">
        <article className="legal-board">
          <section>
            <h2>Where we deliver</h2>
            <p>Our standard delivery service is intended for addresses within mainland Great Britain that are supported by our checkout and selected carrier.</p>
            <p>Before payment is taken, checkout validates the delivery address and shows the delivery services available for that address.</p>
            <p>Iron Sprue does not currently offer standard mainland delivery to addresses in the following postcode territories: BT - Northern Ireland, GY - Guernsey, JE - Jersey, IM - Isle of Man, HS - Outer Hebrides, and ZE - Shetland Islands.</p>
            <p>Some postcode districts within IV, KA, KW, PA and PH include islands, remote areas or carrier-specific zones. The current checkout configuration does not yet publish a district-by-district exclusion list for those postcode areas. Until that configuration is explicit, availability for those addresses must be confirmed by checkout rather than guessed from postcode area alone.</p>
            <p>We do not describe a geographically mainland Scottish address as non-mainland simply because a carrier may classify it as a remote zone.</p>
            <p>If checkout does not offer a delivery service for your postcode, payment will not be taken for an unavailable delivery method.</p>
          </section>
          <section>
            <h2>Delivery charges</h2>
            <p>Standard delivery is currently £3.99. Express delivery, where available, is currently £5.99.</p>
            <p>Free standard delivery is available when the qualifying merchandise value reaches the free-delivery threshold shown on the site. The current threshold is £30 including VAT, calculated after discounts and excluding delivery charges.</p>
            <p>The threshold is controlled by our current delivery configuration. Where the storefront displays a different current threshold, the checkout value takes precedence.</p>
          </section>
          <section>
            <h2>Dispatch</h2>
            <p>We aim to dispatch stocked orders promptly after payment has been confirmed. The product or checkout page may indicate an expected dispatch time.</p>
            <p>Dispatch can occasionally take longer because of weekends or bank holidays, unusually high order volumes, fraud or payment checks, packaging requirements, stock discrepancies, or circumstances outside our reasonable control.</p>
          </section>
          <section>
            <h2>Delivery times</h2>
            <p>Any delivery estimate displayed during checkout is an estimate unless we expressly state that a particular delivery date is guaranteed.</p>
            <p>Unless otherwise agreed, goods will be delivered within the period required by applicable consumer law. Current UK distance-selling guidance states that goods should generally be delivered within 30 days unless another period has been agreed.</p>
          </section>
          <section>
            <h2>Tracking</h2>
            <p>Where the selected service provides tracking, we will send tracking information once the parcel has been dispatched.</p>
            <p>Tracking information is supplied by the carrier and may take time to update after the parcel first enters its network.</p>
          </section>
          <section>
            <h2>Delivery address</h2>
            <p>You are responsible for providing a complete and accurate delivery address. Please check the address carefully before placing the order.</p>
            <p>If you notice an error, contact us immediately. We cannot guarantee that an address can be changed after an order has entered fulfilment.</p>
          </section>
          <section>
            <h2>Failed or returned deliveries</h2>
            <p>If a parcel is returned to us because the carrier could not deliver it, we will contact you to discuss the available options.</p>
            <p>Additional delivery costs may apply where another delivery is requested and the failure was caused by an incorrect or incomplete address or another matter outside our responsibility, subject to your statutory rights.</p>
          </section>
          <section>
            <h2>Lost or delayed parcels</h2>
            <p>If tracking shows an unusual delay or a parcel appears to be lost, contact <a href={`mailto:${ironSprueBrand.contactEmail}`}>{ironSprueBrand.contactEmail}</a> and include your order number.</p>
            <p>We will investigate with the carrier.</p>
          </section>
          <section>
            <h2>Damaged parcels</h2>
            <p>If possible, photograph visible damage to the outer packaging before opening it and retain the packaging while the issue is investigated.</p>
            <p>See our <a href="/returns">Returns and Refunds</a> page for damaged goods.</p>
          </section>
        </article>
      </div>
    </section>
  );
}
