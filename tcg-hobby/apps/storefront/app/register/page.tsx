import { Container, PageShell, Section } from '@tcg-hobby/ui';
import { SiteHeader } from '../../components/site-header';
import { RegisterForm } from '../../components/auth-forms';

type SearchParamsValue = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SearchParamsValue> }) {
  const params = (await searchParams) ?? {};
  const callbackUrl = asString(params.callbackUrl) || '/account';

  return (
    <PageShell>
      <SiteHeader />
      <main>
        <Section className="py-14 sm:py-20">
          <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Create account</p>
              <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl">Join TCG Hobby and keep your collection close.</h1>
              <p className="max-w-xl text-base leading-8 text-neutral-300">
                Save cards you want to revisit, manage your profile details, and return to a faster shopping experience the next time you visit.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {['Wishlist tracking', 'Profile management', 'Retail-ready browsing', 'Secure account access'].map((item) => (
                  <div key={item} className="rounded-lg border border-surface-line bg-surface-panel p-4 text-sm text-neutral-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <RegisterForm callbackUrl={callbackUrl} />
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}

