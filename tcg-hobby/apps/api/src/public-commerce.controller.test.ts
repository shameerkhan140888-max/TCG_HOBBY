import { describe, expect, it, vi } from 'vitest';
import { PublicCommerceController } from './public-commerce.controller.js';

describe('public commerce controller contract', () => {
  it('passes the product identifier through member basket mutations', async () => {
    const service = {
      updateBasketItem: vi.fn().mockResolvedValue({ items: [] }),
      removeBasketItem: vi.fn().mockResolvedValue({ items: [] }),
      clearBasket: vi.fn().mockResolvedValue({ items: [] }),
    };
    const controller = new PublicCommerceController(service as never);

    await controller.updateBasketItem('Bearer token', 'product-1', { quantity: 2 });
    await controller.removeBasketItem('Bearer token', 'product-1');
    await controller.clearBasket('Bearer token');

    expect(service.updateBasketItem).toHaveBeenCalledWith('Bearer token', 'product-1', { quantity: 2 });
    expect(service.removeBasketItem).toHaveBeenCalledWith('Bearer token', 'product-1');
    expect(service.clearBasket).toHaveBeenCalledWith('Bearer token');
  });
});
