'use client';

import { useEffect } from 'react';

export function GuestCartClearer({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void fetch('/api/checkout/guest-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => {});
  }, [enabled]);

  return null;
}
