import { BrandMark, Container, PageShell, Section } from '@tcg-hobby/ui';
import { SiteHeader } from '../../components/site-header';
import { LoginForm } from '../../components/auth-forms';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const callbackUrl = asString(params.callbackUrl) || '/account';

  return (
    <PageShell>
      <SiteHeader />
      <main>
        <Section className="py-14 sm:py-20">
          <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-6">
              <BrandMark className="h-20 w-20 rounded-md border border-surface-line bg-black/60 p-2" />
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Customer access</p>
              <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl">Sign in to manage your account and wishlist.</h1>
              <p className="max-w-xl text-base leading-8 text-neutral-300">
                Return to saved products, update your profile, and move through the storefront with your preferences already in place.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {['Wishlist and saved items', 'Customer profile details', 'Fast return to browsing', 'Secure password-based access'].map((item) => (
                  <div key={item} className="rounded-lg border border-surface-line bg-surface-panel p-4 text-sm text-neutral-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <LoginForm callbackUrl={callbackUrl} />
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
