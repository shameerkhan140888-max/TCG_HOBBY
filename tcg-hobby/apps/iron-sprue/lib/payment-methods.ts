export type IronSpruePaymentMethodId =
  | 'visa'
  | 'mastercard'
  | 'american-express'
  | 'apple-pay'
  | 'google-pay'
  | 'paypal';

export type IronSpruePaymentMethodConfig = {
  id: IronSpruePaymentMethodId;
  label: string;
  assetPath?: string;
  enabled: boolean;
  status: 'working-now' | 'eligible-through-stripe' | 'production-configuration-required' | 'not-enabled';
};

export const ironSpruePaymentMethods = [
  {
    id: 'visa',
    label: 'Visa',
    assetPath: '/payments/visa.svg',
    enabled: true,
    status: 'working-now',
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    assetPath: '/payments/mastercard.svg',
    enabled: true,
    status: 'working-now',
  },
  {
    id: 'american-express',
    label: 'American Express',
    assetPath: '/payments/american-express.svg',
    enabled: true,
    status: 'working-now',
  },
  {
    id: 'apple-pay',
    label: 'Apple Pay',
    assetPath: '/payments/apple-pay.svg',
    enabled: true,
    status: 'eligible-through-stripe',
  },
  {
    id: 'google-pay',
    label: 'Google Pay',
    assetPath: '/payments/google-pay.svg',
    enabled: true,
    status: 'eligible-through-stripe',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    assetPath: '/payments/paypal.svg',
    enabled: false,
    status: 'production-configuration-required',
  },
] as const satisfies IronSpruePaymentMethodConfig[];

export function getVisibleIronSpruePaymentMethods(
  methods: readonly IronSpruePaymentMethodConfig[] = ironSpruePaymentMethods,
) {
  return methods.filter((method) => method.enabled);
}

export function ironSpruePaymentSummary() {
  return 'Secure card payments are available now. Apple Pay and Google Pay may appear in the secure payment form where supported by Stripe, your device and browser.';
}
