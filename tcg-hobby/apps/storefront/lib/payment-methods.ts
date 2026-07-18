export type PaymentMethodId =
  | 'visa'
  | 'mastercard'
  | 'paypal'
  | 'klarna'
  | 'clearpay'
  | 'apple-pay'
  | 'google-pay'
  | 'american-express';

export type PaymentMethodConfig = {
  id: PaymentMethodId;
  label: string;
  displayLabel: string;
  assetPath?: string;
  enabled: boolean;
  processor: 'stripe-card' | 'paypal' | 'future';
};

export const storefrontPaymentMethods = [
  { id: 'visa', label: 'Visa', displayLabel: 'VISA', assetPath: '/payments/visa.svg', enabled: true, processor: 'stripe-card' },
  { id: 'mastercard', label: 'Mastercard', displayLabel: 'Mastercard', assetPath: '/payments/mastercard.svg', enabled: true, processor: 'stripe-card' },
  { id: 'paypal', label: 'PayPal', displayLabel: 'PayPal', assetPath: '/payments/paypal.svg', enabled: false, processor: 'paypal' },
  { id: 'klarna', label: 'Klarna', displayLabel: 'Klarna', enabled: false, processor: 'future' },
  { id: 'clearpay', label: 'Clearpay', displayLabel: 'Clearpay', enabled: false, processor: 'future' },
  { id: 'apple-pay', label: 'Apple Pay', displayLabel: 'Apple Pay', enabled: false, processor: 'future' },
  { id: 'google-pay', label: 'Google Pay', displayLabel: 'Google Pay', enabled: false, processor: 'future' },
  { id: 'american-express', label: 'American Express', displayLabel: 'Amex', enabled: false, processor: 'future' },
] as const satisfies PaymentMethodConfig[];

export function getEnabledPaymentMethods(methods: readonly PaymentMethodConfig[] = storefrontPaymentMethods): PaymentMethodConfig[] {
  return methods.filter((method) => method.enabled);
}
