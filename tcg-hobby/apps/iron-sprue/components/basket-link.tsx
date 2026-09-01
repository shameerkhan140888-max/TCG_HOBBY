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
        <path d="M7.2 9.5c.6-3.4 2.2-5.1 4.8-5.1s4.2 1.7 4.8 5.1" />
        <path d="M4.8 9.5h14.4l-1.4 9.8H6.2L4.8 9.5Z" />
        <path d="M8.4 12.4h7.2" />
      </svg>
      <span>{count}</span>
    </a>
  );
}
