'use client';

import { useEffect } from 'react';
import { clearIronSprueBasket } from './basket-client';

export function ClearBasketOnSuccess({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled) clearIronSprueBasket();
  }, [enabled]);

  return null;
}
