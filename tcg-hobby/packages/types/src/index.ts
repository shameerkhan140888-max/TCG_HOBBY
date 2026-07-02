export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  game: string;
  price: Money;
  inStock: boolean;
};

export type ApiHealth = {
  status: 'ok';
  service: 'tcg-hobby-api';
};
