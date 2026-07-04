import 'server-only';

import type { CheckoutAddress, ShippingMethod, ShippingMethodCode } from '@tcg-hobby/types';
import { getAvailableShippingMethods, prisma } from '@tcg-hobby/database';
import { getCurrentCustomerSession, requireCustomerSession } from './auth';
import { getCurrentCustomerCart } from './cart';

export type CheckoutFieldErrors = Record<string, string>;

export type CheckoutFormState = {
  formError?: string;
  fieldErrors: CheckoutFieldErrors;
  values: CheckoutAddress & {
    shippingMethodCode: ShippingMethodCode | '';
  };
  shippingMethods: ShippingMethod[];
};

export type CheckoutPageData = {
  cart: Awaited<ReturnType<typeof getCurrentCustomerCart>>;
  shippingMethods: ShippingMethod[];
  defaults: CheckoutFormState['values'];
  sessionEmail: string;
};

const emptyCheckoutValues: CheckoutFormState['values'] = {
  fullName: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'GB',
  shippingMethodCode: '',
};

export async function getCheckoutPageData(): Promise<CheckoutPageData> {
  const session = await requireCustomerSession('/login?callbackUrl=%2Fcheckout');
  const [cart, customerSession, userRecord] = await Promise.all([
    getCurrentCustomerCart(),
    getCurrentCustomerSession(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        addresses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
  ]);
  const user = customerSession ? customerSession.user : session.user;
  const defaultAddress = userRecord?.addresses[0] ?? null;
  const shippingMethods = await getAvailableShippingMethods(defaultAddress?.country ?? 'GB');
  const defaults: CheckoutFormState['values'] = {
    ...emptyCheckoutValues,
    fullName: user.name ?? '',
    email: user.email ?? '',
    line1: defaultAddress?.line1 ?? '',
    line2: defaultAddress?.line2 ?? '',
    city: defaultAddress?.city ?? '',
    region: defaultAddress?.region ?? '',
    postalCode: defaultAddress?.postalCode ?? '',
    country: defaultAddress?.country ?? 'GB',
    shippingMethodCode: shippingMethods[0]?.code ?? '',
  };

  return {
    cart,
    shippingMethods,
    defaults,
    sessionEmail: user.email,
  };
}
