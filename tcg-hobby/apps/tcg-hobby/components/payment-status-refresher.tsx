'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function PaymentStatusRefresher({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(interval);
  }, [enabled, router]);

  return null;
}
