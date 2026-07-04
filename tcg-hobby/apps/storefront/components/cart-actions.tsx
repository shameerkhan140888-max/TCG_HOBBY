import { Button, QuantitySelector } from '@tcg-hobby/ui';
import { addToCartAction, removeCartItemAction, updateCartQuantityAction } from '../lib/cart';

type BaseProps = {
  productId: string;
  returnTo: string;
};

export function AddToCartButton({ productId, returnTo }: BaseProps) {
  return (
    <form action={addToCartAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button size="sm" type="submit">
        Add to cart
      </Button>
    </form>
  );
}

export function AddToCartWithQuantityForm({ productId, returnTo, maxQuantity }: BaseProps & { maxQuantity?: number }) {
  return (
    <form action={addToCartAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <QuantitySelector name="quantity" value={1} {...(maxQuantity !== undefined ? { max: maxQuantity } : {})} />
      <Button type="submit">Add to cart</Button>
    </form>
  );
}

export function CartLineQuantityForm({
  productId,
  quantity,
  returnTo,
  maxQuantity,
}: BaseProps & { quantity: number; maxQuantity?: number }) {
  return (
    <form action={updateCartQuantityAction} className="flex items-end gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <QuantitySelector name="quantity" value={quantity} {...(maxQuantity !== undefined ? { max: maxQuantity } : {})} />
      <Button type="submit" variant="outline">
        Update
      </Button>
    </form>
  );
}

export function RemoveCartItemButton({ productId, returnTo }: BaseProps) {
  return (
    <form action={removeCartItemAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant="ghost">
        Remove
      </Button>
    </form>
  );
}
