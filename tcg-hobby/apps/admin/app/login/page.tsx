import { BrandMark, Card, CardContent, PageShell } from '@tcg-hobby/ui';
import { redirect } from 'next/navigation';
import { AdminLoginForm } from '../../components/admin-login-form';
import { getCurrentAdminSession } from '../../lib/auth.server';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (await getCurrentAdminSession()) redirect('/admin');
  const params = await searchParams;
  const raw = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const callbackUrl =
    raw?.startsWith('/') && !raw.startsWith('//') ? raw : '/admin';

  return (
    <PageShell className="grid place-items-center px-4 py-10">
      <Card className="w-full max-w-md shadow-glow">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2 text-center">
            <BrandMark
              width={168}
              height={56}
              className="mx-auto w-[160px] object-contain"
            />
            <h1 className="text-2xl font-bold">Admin sign in</h1>
            <p className="text-sm text-neutral-400">
              Sign in with an authorised staff account.
            </p>
          </div>
          <AdminLoginForm
            callbackUrl={callbackUrl}
            passwordResetUrl={`${(process.env.PUBLIC_STOREFRONT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tcg-hobby.co.uk').replace(/\/$/, '')}/forgot-password`}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
