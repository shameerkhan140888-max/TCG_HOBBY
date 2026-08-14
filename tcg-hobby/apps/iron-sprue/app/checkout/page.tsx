import { BasketClient } from '../../components/basket-client';

export default function CheckoutPage() {
  return (
    <section className="section-block">
      <div className="section-head">
        <p className="eyebrow">Checkout</p>
        <h1>Delivery and secure payment</h1>
        <p className="lead">Enter delivery details, confirm the total and continue to Stripe for secure payment.</p>
      </div>
      <BasketClient mode="checkout" />
    </section>
  );
}
