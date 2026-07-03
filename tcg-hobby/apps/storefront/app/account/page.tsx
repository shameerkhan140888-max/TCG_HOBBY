import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { getCustomerProfile } from '../../lib/auth';

export default async function AccountOverviewPage() {
  const { user, wishlistItems } = await getCustomerProfile();
  const wishlistCount = wishlistItems?.items.length ?? 0;

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Account overview</p>
          <h1 className="text-3xl font-black sm:text-4xl">Welcome back, {user?.name ?? user?.email}</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">Manage your profile, review your saved products, and keep your customer details current.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Saved wishlist items', value: String(wishlistCount) },
            { label: 'Profile name', value: user?.name ?? 'Not set' },
            { label: 'Account email', value: user?.email ?? 'Unknown' },
            { label: 'Account status', value: 'Active' },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent>
                <p className="text-sm text-neutral-400">{item.label}</p>
                <p className="mt-3 text-2xl font-black">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Profile</p>
                <h2 className="mt-2 text-xl font-bold">Manage saved details</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">Update the customer name shown throughout the storefront experience.</p>
              </div>
              <Button asChild>
                <a href="/account/profile">Edit profile</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Wishlist</p>
                <h2 className="mt-2 text-xl font-bold">Saved products</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">Review the products you want to revisit, compare, or buy later.</p>
              </div>
              <Button asChild variant="outline">
                <a href="/account/wishlist">Open wishlist</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  );
}

