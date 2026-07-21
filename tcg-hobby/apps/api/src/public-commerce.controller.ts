import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import type { PublicBasketInputItem, PublicCheckoutRequest } from '@tcg-hobby/types';
import { PublicCommerceService } from './public-commerce.service.js';

@Controller('v1')
export class PublicCommerceController {
  constructor(@Inject(PublicCommerceService) private readonly commerce: PublicCommerceService) {}

  @Get('home') home() { return this.commerce.home(); }
  @Get('catalogue') catalogue(@Query() query: Record<string, string | undefined>) { return this.commerce.catalogue(query); }
  @Get('catalogue/filters') filters() { return this.commerce.filters(); }
  @Get('catalogue/:slug') product(@Param('slug') slug: string) { return this.commerce.product(slug); }

  @Post('basket/resolve')
  basket(@Headers('authorization') authorization: string | undefined, @Body() body: { items?: PublicBasketInputItem[] }) {
    return this.commerce.basket(authorization, Array.isArray(body.items) ? body.items : []);
  }

  @Post('basket/items')
  addBasketItem(@Headers('authorization') authorization: string | undefined, @Body() body: Record<string, unknown>) {
    return this.commerce.addBasketItem(authorization, body);
  }

  @Patch('basket/items/:productId')
  updateBasketItem(@Headers('authorization') authorization: string | undefined, @Param('productId') productId: string, @Body() body: Record<string, unknown>) {
    return this.commerce.updateBasketItem(authorization, productId, body);
  }

  @Delete('basket/items/:productId')
  removeBasketItem(@Headers('authorization') authorization: string | undefined, @Param('productId') productId: string) {
    return this.commerce.removeBasketItem(authorization, productId);
  }

  @Delete('basket/items')
  clearBasket(@Headers('authorization') authorization: string | undefined) {
    return this.commerce.clearBasket(authorization);
  }

  @Get('shipping-methods') shipping(@Query('country') country = 'GB') { return this.commerce.shipping(country); }
  @Post('checkout/session') checkout(@Headers('authorization') authorization: string | undefined, @Body() body: PublicCheckoutRequest) {
    return this.commerce.checkout(authorization, body);
  }
  @Get('orders') orders(@Headers('authorization') authorization?: string) { return this.commerce.orders(authorization); }
  @Get('orders/:orderNumber') order(@Headers('authorization') authorization: string | undefined, @Param('orderNumber') orderNumber: string) {
    return this.commerce.order(authorization, orderNumber);
  }
}
