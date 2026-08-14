import { CheckoutCancelClient } from '../../../components/checkout-cancel-client';

export const dynamic = 'force-dynamic';

export default async function CheckoutCancelPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  return (
    <section className="section-block checkout-result-page">
      <p className="eyebrow">Iron Sprue checkout</p>
      <h1>Checkout cancelled.</h1>
      <p className="lead">Your payment was not completed. Your basket is still available so you can review it before trying again.</p>
      <CheckoutCancelClient sessionId={sessionId ?? null} />
      <div className="hero-actions">
        <a className="button" href="/basket">Return to basket</a>
        <a className="button secondary" href="/shop">Continue shopping</a>
      </div>
    </section>
  );
}
