import { BasketClient } from '../../components/basket-client';

export default function CheckoutPage() {
  return (
    <section className="section-block commerce-flow-page checkout-route">
      <div className="section-head">
        <p className="eyebrow">Checkout</p>
        <h1>Delivery and secure payment</h1>
        <p className="lead">Enter delivery details, review the order total and complete payment within the Iron Sprue checkout.</p>
      </div>
      <BasketClient mode="checkout" />
    </section>
  );
}
