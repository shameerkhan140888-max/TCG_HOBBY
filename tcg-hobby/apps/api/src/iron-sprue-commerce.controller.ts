import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import type { PublicBasketInputItem, PublicCheckoutRequest } from '@tcg-hobby/types';
import { IronSprueCommerceService } from './iron-sprue-commerce.service.js';

@Controller('api')
export class IronSprueCommerceController {
  constructor(@Inject(IronSprueCommerceService) private readonly commerce: IronSprueCommerceService) {}

  @Post('cart/resolve')
  basket(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Body() body: { items?: PublicBasketInputItem[] }) {
    return this.commerce.basket(headers, authorization, Array.isArray(body.items) ? body.items : []);
  }

  @Get('cart')
  cart(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined) {
    return this.commerce.basket(headers, authorization);
  }

  @Post('cart/items')
  addBasketItem(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Body() body: Record<string, unknown>) {
    return this.commerce.addBasketItem(headers, authorization, body);
  }

  @Patch('cart/items/:productId')
  updateBasketItem(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Param('productId') productId: string, @Body() body: Record<string, unknown>) {
    return this.commerce.updateBasketItem(headers, authorization, productId, body);
  }

  @Delete('cart/items/:productId')
  removeBasketItem(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Param('productId') productId: string) {
    return this.commerce.removeBasketItem(headers, authorization, productId);
  }

  @Delete('cart')
  clearBasket(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined) {
    return this.commerce.clearBasket(headers, authorization);
  }

  @Get('shipping-methods')
  shipping(@Query('country') country = 'GB', @Query('subtotalMinor') subtotalMinor = '0') {
    return this.commerce.shipping(country, Number(subtotalMinor) || 0);
  }

  @Post('checkout/session')
  checkout(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Body() body: PublicCheckoutRequest) {
    return this.commerce.checkout(headers, authorization, body);
  }

  @Post('checkout/payment-intent')
  checkoutPaymentIntent(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Body() body: PublicCheckoutRequest) {
    return this.commerce.checkoutPaymentIntent(headers, authorization, body);
  }

  @Get('checkout/status/:sessionId')
  checkoutStatus(@Headers() headers: Record<string, string | string[] | undefined>, @Param('sessionId') sessionId: string) {
    return this.commerce.checkoutStatus(headers, sessionId);
  }

  @Get('checkout/payment-status/:paymentIntentId')
  checkoutPaymentStatus(@Headers() headers: Record<string, string | string[] | undefined>, @Param('paymentIntentId') paymentIntentId: string) {
    return this.commerce.checkoutPaymentStatus(headers, paymentIntentId);
  }

  @Post('checkout/cancel')
  checkoutCancel(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: { sessionId?: unknown }) {
    return this.commerce.cancelCheckout(headers, typeof body.sessionId === 'string' ? body.sessionId : '');
  }

  @Get('customer/orders')
  orders(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization?: string) {
    return this.commerce.orders(headers, authorization);
  }

  @Get('customer/orders/:orderNumber')
  order(@Headers() headers: Record<string, string | string[] | undefined>, @Headers('authorization') authorization: string | undefined, @Param('orderNumber') orderNumber: string) {
    return this.commerce.order(headers, authorization, orderNumber);
  }
}
