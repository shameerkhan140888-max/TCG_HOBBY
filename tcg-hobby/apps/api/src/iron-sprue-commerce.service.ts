import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import {
  addIronSprueProductToCart,
  cancelIronSprueCheckoutSession,
  cancelIronSpruePaymentIntentCheckout,
  clearIronSprueCart,
  createIronSpruePaymentIntentCheckout,
  createIronSprueHostedCheckoutSession,
  getIronSprueAvailableShippingMethods,
  getIronSprueCustomerCartDetails,
  getIronSprueOrderByStripePaymentIntentId,
  getIronSprueOrderByStripeCheckoutSessionId,
  getIronSprueCustomerOrderByNumber,
  getIronSprueCustomerOrders,
  reconcileIronSpruePaymentIntentCheckout,
  removeIronSprueCartItem,
  resolveIronSprueGuestCart,
  sendIronSprueOrderConfirmationEmail,
  updateIronSprueCartItemQuantity,
} from '@tcg-hobby/database';
import type {
  CartSummary,
  CheckoutAddress,
  PublicBasket,
  PublicBasketInputItem,
  PublicCheckoutRequest,
  PublicCheckoutResponse,
  PublicOrderDetail,
  PublicOrderSummary,
  PublicStockState,
  ShippingMethod,
} from '@tcg-hobby/types';
import { AuthService } from './auth.service.js';

function publicStockState(line: { inStock: boolean }): PublicStockState {
  return line.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

function requireAddress(input: CheckoutAddress): CheckoutAddress {
  const required: Array<keyof CheckoutAddress> = ['fullName', 'email', 'line1', 'city', 'postalCode', 'country'];
  if (required.some((key) => typeof input?.[key] !== 'string' || !input[key].trim())) {
    throw new BadRequestException('Complete the delivery address before continuing.');
  }
  return { ...input, country: input.country.trim().toUpperCase(), line2: input.line2 ?? null, region: input.region ?? null };
}

function isCustomerCheckoutError(message: string) {
  return (
    message === 'Complete the delivery address before continuing.' ||
    message === 'Selected delivery method is not available for this address.' ||
    message === 'Product is not available.' ||
    message === 'Quantity must be at least 1.' ||
    /^Only \d+ in stock for this item\.$/.test(message)
    || message === 'Discount code is not valid.'
    || message === 'Discount code has expired.'
    || message === 'Discount code has already been used.'
    || message === 'Discount code does not apply to this basket.'
    || /^Discount code requires a basket subtotal of at least £\d+\.\d{2}\.$/.test(message)
  );
}

function requireIronSprueProxy(headers: Record<string, string | string[] | undefined>) {
  const store = headers['x-iron-sprue-internal-store'];
  const keyId = headers['x-iron-sprue-internal-key-id'];
  const expectedKeyId = process.env.IRON_SPRUE_INTERNAL_API_KEY_ID?.trim();
  if (store !== 'IRON_SPRUE' || !expectedKeyId || keyId !== expectedKeyId) {
    throw new UnauthorizedException('Iron Sprue commerce proxy authentication failed.');
  }
}

@Injectable()
export class IronSprueCommerceService {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  toPublicBasket(cart: CartSummary & { cartId?: string | null }): PublicBasket {
    return {
      items: cart.items.map((item) => ({
        ...item,
        image: item.imageUrl ? { id: `${item.productId}-basket`, url: item.imageUrl, altText: item.imageAlt ?? item.productName, sortOrder: 1, isPrimary: true } : null,
        stockState: publicStockState(item),
      })),
      subtotalMinor: cart.subtotalMinor,
      currency: cart.currency,
      totalItems: cart.totalItems,
    };
  }

  async basket(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, guestItems: PublicBasketInputItem[] = []): Promise<PublicBasket> {
    requireIronSprueProxy(headers);
    const user = await this.auth.getOptionalUser(authorization);
    const cart = user ? await getIronSprueCustomerCartDetails(user.id) : await resolveIronSprueGuestCart(guestItems);
    return this.toPublicBasket(cart);
  }

  async addBasketItem(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, body: { productId?: unknown; quantity?: unknown }): Promise<PublicBasket> {
    requireIronSprueProxy(headers);
    const user = await this.auth.requireUser(authorization);
    await addIronSprueProductToCart(user.id, String(body.productId ?? ''), Number(body.quantity) || 1);
    return this.basket(headers, authorization);
  }

  async updateBasketItem(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, productId: string, body: { quantity?: unknown }): Promise<PublicBasket> {
    requireIronSprueProxy(headers);
    const user = await this.auth.requireUser(authorization);
    await updateIronSprueCartItemQuantity(user.id, productId, Number(body.quantity));
    return this.basket(headers, authorization);
  }

  async removeBasketItem(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, productId: string): Promise<PublicBasket> {
    requireIronSprueProxy(headers);
    const user = await this.auth.requireUser(authorization);
    await removeIronSprueCartItem(user.id, productId);
    return this.basket(headers, authorization);
  }

  async clearBasket(headers: Record<string, string | string[] | undefined>, authorization: string | undefined): Promise<PublicBasket> {
    requireIronSprueProxy(headers);
    const user = await this.auth.requireUser(authorization);
    await clearIronSprueCart(user.id);
    return this.basket(headers, authorization);
  }

  async shipping(country: string, subtotalMinor = 0): Promise<ShippingMethod[]> {
    return getIronSprueAvailableShippingMethods(country.trim().toUpperCase() || 'GB', Math.max(Math.trunc(subtotalMinor), 0));
  }

  async checkout(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, input: PublicCheckoutRequest): Promise<PublicCheckoutResponse> {
    requireIronSprueProxy(headers);
    const user = await this.auth.getOptionalUser(authorization);
    const cart = user ? await getIronSprueCustomerCartDetails(user.id) : await resolveIronSprueGuestCart(input.guestItems ?? []);
    if (cart.items.length === 0) throw new BadRequestException('Your basket is empty.');
    try {
      return await createIronSprueHostedCheckoutSession({
        userId: user?.id ?? null,
        cart,
        shippingAddress: requireAddress(input.shippingAddress),
        shippingMethodCode: input.shippingMethodCode,
        ...(input.discountCode ? { discountCode: input.discountCode } : {}),
        ...(input.checkoutAttemptId ? { checkoutAttemptId: input.checkoutAttemptId } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Secure payment is temporarily unavailable. Please try again later.';
      if (isCustomerCheckoutError(message)) {
        throw new BadRequestException(message);
      }
      console.error('iron_sprue_checkout_start_failed', {
        reason: /required|configured/i.test(message) ? 'missing_or_invalid_stripe_config' : 'checkout_start_failed',
      });
      throw new ServiceUnavailableException('Secure payment is temporarily unavailable. Please try again later.');
    }
  }

  async checkoutPaymentIntent(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, input: PublicCheckoutRequest) {
    requireIronSprueProxy(headers);
    const user = await this.auth.getOptionalUser(authorization);
    const cart = user ? await getIronSprueCustomerCartDetails(user.id) : await resolveIronSprueGuestCart(input.guestItems ?? []);
    if (cart.items.length === 0) throw new BadRequestException('Your basket is empty.');
    try {
      return await createIronSpruePaymentIntentCheckout({
        userId: user?.id ?? null,
        cart,
        shippingAddress: requireAddress(input.shippingAddress),
        shippingMethodCode: input.shippingMethodCode,
        ...(input.discountCode ? { discountCode: input.discountCode } : {}),
        ...(input.checkoutAttemptId ? { checkoutAttemptId: input.checkoutAttemptId } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Secure payment is temporarily unavailable. Please try again later.';
      if (isCustomerCheckoutError(message)) {
        throw new BadRequestException(message);
      }
      console.error('iron_sprue_payment_intent_start_failed', {
        reason: /required|configured|publishable/i.test(message) ? 'missing_or_invalid_stripe_config' : 'payment_intent_start_failed',
      });
      throw new ServiceUnavailableException('Secure payment is temporarily unavailable. Please try again later.');
    }
  }

  async checkoutStatus(headers: Record<string, string | string[] | undefined>, sessionId: string): Promise<PublicOrderDetail> {
    requireIronSprueProxy(headers);
    const order = await getIronSprueOrderByStripeCheckoutSessionId(sessionId);
    if (!order) throw new NotFoundException('Order not found.');
    return {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      discountMinor: order.discountMinor,
      discountCode: order.discountCode,
      totalMinor: order.totalMinor,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      shippingMethodName: order.shippingMethodName,
      shippingFullName: order.shippingFullName,
      shippingEmail: order.shippingEmail,
      shippingLine1: order.shippingLine1,
      shippingLine2: order.shippingLine2,
      shippingCity: order.shippingCity,
      shippingRegion: order.shippingRegion,
      shippingPostalCode: order.shippingPostalCode,
      shippingCountry: order.shippingCountry,
      trackingCarrier: order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      items: order.items,
    };
  }

  async checkoutPaymentStatus(headers: Record<string, string | string[] | undefined>, paymentIntentId: string): Promise<PublicOrderDetail> {
    requireIronSprueProxy(headers);
    const order = await reconcileIronSpruePaymentIntentCheckout(paymentIntentId)
      ?? await getIronSprueOrderByStripePaymentIntentId(paymentIntentId);
    if (!order) throw new NotFoundException('Order not found.');
    if (order.paymentStatus === 'SUCCEEDED') {
      try {
        const emailResult = await sendIronSprueOrderConfirmationEmail(order.id);
        if (emailResult.outcome === 'provider_unconfigured' || emailResult.outcome === 'failed') {
          console.warn('iron_sprue_order_confirmation_email_not_sent', {
            orderId: order.id,
            outcome: emailResult.outcome,
            source: 'payment_status_reconciliation',
          });
        }
      } catch (error) {
        console.warn('iron_sprue_order_confirmation_email_not_sent', {
          orderId: order.id,
          outcome: 'failed',
          source: 'payment_status_reconciliation',
          reason: error instanceof Error ? error.message : 'Unknown email error',
        });
      }
    }
    return {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      discountMinor: order.discountMinor,
      discountCode: order.discountCode,
      totalMinor: order.totalMinor,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      shippingMethodName: order.shippingMethodName,
      shippingFullName: order.shippingFullName,
      shippingEmail: order.shippingEmail,
      shippingLine1: order.shippingLine1,
      shippingLine2: order.shippingLine2,
      shippingCity: order.shippingCity,
      shippingRegion: order.shippingRegion,
      shippingPostalCode: order.shippingPostalCode,
      shippingCountry: order.shippingCountry,
      trackingCarrier: order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      items: order.items,
    };
  }

  async cancelCheckout(headers: Record<string, string | string[] | undefined>, sessionId: string) {
    requireIronSprueProxy(headers);
    await cancelIronSprueCheckoutSession(sessionId);
    return { ok: true };
  }

  async cancelCheckoutPaymentIntent(headers: Record<string, string | string[] | undefined>, paymentIntentId: string) {
    requireIronSprueProxy(headers);
    await cancelIronSpruePaymentIntentCheckout(paymentIntentId);
    return { ok: true };
  }

  async orders(headers: Record<string, string | string[] | undefined>, authorization?: string): Promise<PublicOrderSummary[]> {
    requireIronSprueProxy(headers);
    const user = await this.auth.requireUser(authorization);
    return (await getIronSprueCustomerOrders(user.id)).map((order) => ({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      discountMinor: order.discountMinor,
      discountCode: order.discountCode,
      totalMinor: order.totalMinor,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }

  async order(headers: Record<string, string | string[] | undefined>, authorization: string | undefined, orderNumber: string): Promise<PublicOrderDetail> {
    requireIronSprueProxy(headers);
    const user = await this.auth.requireUser(authorization);
    const order = await getIronSprueCustomerOrderByNumber(user.id, orderNumber);
    if (!order) throw new NotFoundException('Order not found.');
    return {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      fulfilmentStatus: order.fulfilmentStatus,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      taxMinor: order.taxMinor,
      totalMinor: order.totalMinor,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      shippingMethodName: order.shippingMethodName,
      shippingFullName: order.shippingFullName,
      shippingEmail: order.shippingEmail,
      shippingLine1: order.shippingLine1,
      shippingLine2: order.shippingLine2,
      shippingCity: order.shippingCity,
      shippingRegion: order.shippingRegion,
      shippingPostalCode: order.shippingPostalCode,
      shippingCountry: order.shippingCountry,
      trackingCarrier: order.trackingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      items: order.items,
    };
  }
}
