import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const callbackUrl =
    raw?.startsWith('/iron-sprue-admin') && !raw.startsWith('//') ? raw : '/iron-sprue-admin';
  redirect(`/iron-sprue-admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
