import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicBasket, PublicBasketInputItem } from '@tcg-hobby/types';
import { apiRequest } from './api';
import { useAuth } from './auth-context';

const BASKET_KEY = 'tcg-hobby-guest-basket';
const emptyBasket: PublicBasket = { items: [], subtotalMinor: 0, currency: 'GBP', totalItems: 0 };
type BasketContextValue = {
  basket: PublicBasket; loading: boolean; error: string | null;
  refresh(): Promise<void>; add(productId: string, quantity?: number): Promise<void>;
  update(itemId: string, productId: string, quantity: number): Promise<void>; remove(itemId: string, productId: string): Promise<void>;
  clear(): Promise<void>;
  guestItems: PublicBasketInputItem[];
};
const BasketContext = createContext<BasketContextValue | null>(null);

async function loadGuestItems(): Promise<PublicBasketInputItem[]> {
  try { return JSON.parse(await AsyncStorage.getItem(BASKET_KEY) ?? '[]') as PublicBasketInputItem[]; }
  catch { return []; }
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [basket, setBasket] = useState(emptyBasket);
  const [guestItems, setGuestItems] = useState<PublicBasketInputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (items?: PublicBasketInputItem[]) => {
    const next = token ? [] : items ?? await loadGuestItems();
    const result = await apiRequest<PublicBasket>('/v1/basket/resolve', { method: 'POST', token, body: JSON.stringify({ items: next }) });
    setGuestItems(next); setBasket(result); setError(null);
  }, [token]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { await resolve(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Basket unavailable.'); }
    finally { setLoading(false); }
  }, [resolve]);
  useEffect(() => { void refresh(); }, [token]);

  const saveGuest = useCallback(async (items: PublicBasketInputItem[]) => {
    await AsyncStorage.setItem(BASKET_KEY, JSON.stringify(items));
    await resolve(items);
  }, [resolve]);

  const value = useMemo<BasketContextValue>(() => ({
    basket, guestItems, loading, error, refresh,
    add: async (productId, quantity = 1) => {
      if (token) {
        setBasket(await apiRequest('/v1/basket/items', { method: 'POST', token, body: JSON.stringify({ productId, quantity }) }));
      } else {
        const current = guestItems.find((item) => item.productId === productId)?.quantity ?? 0;
        await saveGuest([...guestItems.filter((item) => item.productId !== productId), { productId, quantity: current + quantity }]);
      }
    },
    update: async (_itemId, productId, quantity) => {
      if (token) setBasket(await apiRequest(`/v1/basket/items/${encodeURIComponent(productId)}`, { method: 'PATCH', token, body: JSON.stringify({ quantity }) }));
      else await saveGuest(guestItems.map((item) => item.productId === productId ? { ...item, quantity } : item));
    },
    remove: async (_itemId, productId) => {
      if (token) setBasket(await apiRequest(`/v1/basket/items/${encodeURIComponent(productId)}`, { method: 'DELETE', token }));
      else await saveGuest(guestItems.filter((item) => item.productId !== productId));
    },
    clear: async () => {
      if (token) setBasket(await apiRequest('/v1/basket/items', { method: 'DELETE', token }));
      else await saveGuest([]);
    },
  }), [basket, error, guestItems, loading, refresh, saveGuest, token]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const value = useContext(BasketContext);
  if (!value) throw new Error('useBasket must be used inside BasketProvider.');
  return value;
}
