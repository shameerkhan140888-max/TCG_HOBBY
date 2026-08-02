import { Button, QuantitySelector } from '@tcg-hobby/ui';
import { addToBuylistAction, removeBuylistItemAction, updateBuylistQuantityAction } from '../lib/buylist';

type BaseProps = {
  productId: string;
  returnTo: string;
};

export function AddToBuylistButton({ productId, returnTo }: BaseProps) {
  return (
    <form action={addToBuylistAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" size="sm" variant="secondary">
        Add to buylist
      </Button>
    </form>
  );
}

export function BuylistQuantityForm({ productId, quantity, returnTo, maxQuantity }: BaseProps & { quantity: number; maxQuantity?: number }) {
  return (
    <form action={updateBuylistQuantityAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <QuantitySelector name="quantity" value={quantity} {...(maxQuantity !== undefined ? { max: maxQuantity } : {})} />
      <Button type="submit" variant="outline">
        Update
      </Button>
    </form>
  );
}

export function RemoveBuylistItemButton({ productId, returnTo }: BaseProps) {
  return (
    <form action={removeBuylistItemAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant="ghost">
        Remove
      </Button>
    </form>
  );
}
