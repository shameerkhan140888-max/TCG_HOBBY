import { IronSprueAdminSection } from '../../../components/iron-sprue-admin-section';
import { IronSprueAdminShell } from '../../../components/iron-sprue-admin-shell';
import { requireAdminSession } from '../../../lib/auth.server';

export const dynamic = 'force-dynamic';

export default async function IronSprueAdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const query = searchParams ? await searchParams : {};
  const session = await requireAdminSession(`/iron-sprue-admin/${section}`, '/iron-sprue-admin/login');
  return (
    <IronSprueAdminShell user={session.user}>
      <IronSprueAdminSection section={section} searchParams={query} />
    </IronSprueAdminShell>
  );
}
