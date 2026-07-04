import { Button, Container, EmptyState, ProductCard, Section, WishlistButton } from '@tcg-hobby/ui';
import { getCustomerProfile } from '../../../lib/auth';
import { AddToCartButton } from '../../../components/cart-actions';
import { toggleWishlistAction } from '../../../lib/wishlist';

export default async function AccountWishlistPage() {
  const { user, wishlistItems } = await getCustomerProfile();
  const items = wishlistItems?.items ?? [];
  const currentHref = '/account/wishlist';

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Wishlist</p>
          <h1 className="text-3xl font-black sm:text-4xl">Saved products for {user?.name ?? user?.email}</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">Remove items you no longer need or keep them here for future purchase decisions.</p>
        </div>

        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={item.product}
                href={`/catalogue/${item.product.slug}`}
                actionSlot={
                  <div className="flex items-center gap-2">
                    {item.product.inStock ? (
                      <AddToCartButton productId={item.product.id} returnTo={currentHref} />
                    ) : null}
                    <WishlistButton
                      productId={item.product.id}
                      wishlisted
                      authenticated
                      action={toggleWishlistAction}
                      loginHref="/login"
                      returnTo={currentHref}
                    />
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your wishlist is empty"
            description="Save products from the catalogue to keep track of the ones you want to revisit later."
            action={
              <Button asChild>
                <a href="/catalogue">Browse catalogue</a>
              </Button>
            }
          />
        )}
      </Container>
    </Section>
  );
}
