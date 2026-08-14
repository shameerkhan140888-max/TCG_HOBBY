'use client';

import { useEffect, useState } from 'react';
import { readIronSprueBasketCount } from './basket-client';

export function BasketLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(readIronSprueBasketCount());
    refresh();
    window.addEventListener('iron-sprue-basket-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('iron-sprue-basket-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const itemLabel = count === 1 ? 'item' : 'items';

  return (
    <a className="basket-link" href="/basket" aria-label={`Basket with ${count} ${itemLabel}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 9 9 4h6l2 5" />
        <path d="M5 9h14l-1.3 11H6.3L5 9Z" />
        <path d="M9 13v3M15 13v3" />
      </svg>
      <span>{count}</span>
    </a>
  );
}
