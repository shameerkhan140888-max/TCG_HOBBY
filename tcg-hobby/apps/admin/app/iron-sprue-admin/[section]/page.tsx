import { resetIronSprueAdminPrisma } from '@tcg-hobby/database';
import { IronSprueAdminSection } from '../../../components/iron-sprue-admin-section';
import { IronSprueAdminDatabaseUnavailable, isIronSprueAdminDatabaseUnavailable } from '../../../components/iron-sprue-admin-database-unavailable';
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
  let content;
  try {
    content = await IronSprueAdminSection({ section, searchParams: query });
  } catch (error) {
    if (isIronSprueAdminDatabaseUnavailable(error)) {
      await resetIronSprueAdminPrisma();
      content = <IronSprueAdminDatabaseUnavailable error={error} />;
    } else {
      throw error;
    }
  }

  return (
    <IronSprueAdminShell user={session.user}>
      {content}
    </IronSprueAdminShell>
  );
}
