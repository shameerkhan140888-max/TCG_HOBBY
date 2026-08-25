import { Card, CardContent, PageShell } from '@tcg-hobby/ui';
import { redirect } from 'next/navigation';
import { IronSprueAdminLoginForm } from '../../../components/admin-login-form';
import { getCurrentIronSprueAdminSession } from '../../../lib/auth.server';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function IronSprueAdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const callbackUrl = raw?.startsWith('/iron-sprue-admin') && !raw.startsWith('//') ? raw : '/iron-sprue-admin';
  if (await getCurrentIronSprueAdminSession()) redirect(callbackUrl);

  return (
    <PageShell className="grid min-h-screen place-items-center bg-[#070907] px-4 py-10">
      <Card className="w-full max-w-md border-[#26372f] bg-[#0b100d] shadow-glow">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3 text-center">
            <img
              src="/iron-sprue/brand/iron-sprue-horizontal.svg"
              alt="Iron Sprue"
              width={190}
              height={54}
              className="mx-auto h-auto w-[180px] object-contain"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d59b3d]">Iron Sprue Admin</p>
              <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
            </div>
            <p className="text-sm text-neutral-400">
              Sign in with an authorised staff account to manage the Iron Sprue workspace.
            </p>
          </div>
          <IronSprueAdminLoginForm
            callbackUrl={callbackUrl}
            passwordResetUrl={`${(process.env.IRON_SPRUE_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'https://ironsprue.co.uk').replace(/\/$/, '')}/forgot-password`}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
