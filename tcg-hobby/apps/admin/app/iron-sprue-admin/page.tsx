import { IronSprueAdminDashboard } from '../../components/iron-sprue-admin-dashboard';
import { IronSprueAdminShell } from '../../components/iron-sprue-admin-shell';
import { requireAdminSession } from '../../lib/auth.server';

export const dynamic = 'force-dynamic';

export default async function IronSprueAdminPage() {
  const session = await requireAdminSession('/iron-sprue-admin', '/iron-sprue-admin/login');
  return (
    <IronSprueAdminShell user={session.user}>
      <IronSprueAdminDashboard session={session} />
    </IronSprueAdminShell>
  );
}
