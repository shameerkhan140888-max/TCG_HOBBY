'use client';

import { useEffect, useState } from 'react';

export function CheckoutCancelClient({ sessionId }: { sessionId: string | null }) {
  const cancelledCopy = 'Your payment was not completed. Your basket is still available if you would like to review your order or continue shopping.';
  const [status, setStatus] = useState(cancelledCopy);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function releaseReservation() {
      try {
        const response = await fetch('/api/checkout/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!cancelled) {
          setStatus(cancelledCopy);
        }
      } catch {
        if (!cancelled) setStatus(cancelledCopy);
      }
    }

    void releaseReservation();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <p className="sr-only" aria-live="polite">
      {status}
    </p>
  );
}
