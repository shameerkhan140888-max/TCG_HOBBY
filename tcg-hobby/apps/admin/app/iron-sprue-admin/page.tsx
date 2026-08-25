import { IronSprueAdminDashboard } from '../../components/iron-sprue-admin-dashboard';
import { IronSprueAdminDatabaseUnavailable, isIronSprueAdminDatabaseUnavailable } from '../../components/iron-sprue-admin-database-unavailable';
import { IronSprueAdminShell } from '../../components/iron-sprue-admin-shell';
import { requireAdminSession } from '../../lib/auth.server';

export const dynamic = 'force-dynamic';

export default async function IronSprueAdminPage() {
  const session = await requireAdminSession('/iron-sprue-admin', '/iron-sprue-admin/login');
  let content;
  try {
    content = await IronSprueAdminDashboard({ session });
  } catch (error) {
    if (isIronSprueAdminDatabaseUnavailable(error)) {
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
