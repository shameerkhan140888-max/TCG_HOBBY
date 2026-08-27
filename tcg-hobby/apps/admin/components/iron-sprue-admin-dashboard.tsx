import {
  getIronSprueAdminDashboard,
  getIronSprueAdminImplementationMap,
  getIronSprueAdminPermissionMatrix,
  resolveIronSprueAdminPermissions,
} from '@capital-hobby/database';
import { Card, CardContent, Container, PageHeader, Section } from '@capital-hobby/ui';
import type { AdminSession } from '../lib/auth.server';

function StatusPill({ status }: { status: string }) {
  const tone = status === 'blocked' ? 'text-red-300 border-red-900/70 bg-red-950/30' : status === 'ready' || status === 'configured' || status === 'connected' ? 'text-emerald-300 border-emerald-900/70 bg-emerald-950/30' : 'text-amber-200 border-amber-900/70 bg-amber-950/30';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>{status}</span>;
}

export async function IronSprueAdminDashboard({ session }: { session: AdminSession }) {
  const [{ role, permissions }, dashboard] = await Promise.all([
    resolveIronSprueAdminPermissions(session.user),
    getIronSprueAdminDashboard(),
  ]);
  const implementationMap = getIronSprueAdminImplementationMap();
  const permissionMatrix = getIronSprueAdminPermissionMatrix();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Iron Sprue"
          title="Dedicated Admin workspace"
          description="Store-scoped product, inventory, media, content and merchandising administration for Iron Sprue."
        />

        <Card>
          <CardContent className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">Operational boundary</p>
                <h2 className="mt-2 text-xl font-bold">IRON_SPRUE only</h2>
              </div>
              <p className="max-w-4xl text-sm leading-6 text-neutral-400">
                Every read and write in this workspace is server-scoped to Iron Sprue. The UI never trusts a browser-supplied store ID.
              </p>
              {dashboard.warnings.length ? (
                <ul className="space-y-2 text-sm text-amber-200">
                  {dashboard.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Store</dt>
                <dd className="mt-1 font-semibold">{dashboard.storeCode}</dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Environment</dt>
                <dd className="mt-1 font-semibold">{dashboard.databaseTarget.label}</dd>
                <dd className="mt-1 text-xs text-neutral-500">{dashboard.environment}</dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Signed in</dt>
                <dd className="mt-1 truncate font-semibold">{session.user.name ?? session.user.email}</dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Role</dt>
                <dd className="mt-1 font-semibold">{role}</dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Database</dt>
                <dd className="mt-1"><StatusPill status={dashboard.databaseStatus} /></dd>
                <dd className="mt-2 break-all text-xs text-neutral-500">
                  {dashboard.databaseTarget.source}: {dashboard.databaseTarget.host}/{dashboard.databaseTarget.database}
                </dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Worker read</dt>
                <dd className="mt-1"><StatusPill status={dashboard.workerReadStatus} /></dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboard.metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{metric.label}</p>
                <p className="text-3xl font-black text-neutral-50">{metric.value}</p>
                <p className="text-xs leading-5 text-neutral-400">{metric.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Workspace navigation</p>
              <h2 className="mt-2 text-xl font-bold">Iron Sprue controls</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-400">
                These sections are wired as Iron Sprue-scoped workspaces. TCG Hobby catalogue and storefront controls are not reused as the parent shell.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.workspace.map((card) => (
                <a key={card.key} href={card.href} className="rounded-md border border-surface-line bg-surface-ink p-4 transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-neutral-50">{card.label}</h3>
                    <StatusPill status={card.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{card.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-neutral-500">{card.requiredPermission}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-xl font-bold">Permission matrix</h2>
              <div className="space-y-3">
                {permissionMatrix.map((item) => (
                  <div key={item.role} className="rounded-md border border-surface-line bg-surface-ink p-3">
                    <p className="font-semibold">{item.role}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-400">{item.permissions.join(', ')}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-neutral-400">Current session permissions: {permissions.length ? permissions.join(', ') : 'none'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-xl font-bold">Implementation map</h2>
              <div className="space-y-3">
                {implementationMap.map((item) => (
                  <div key={item.capability} className="rounded-md border border-surface-line bg-surface-ink p-3">
                    <p className="font-semibold">{item.capability}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-accent">{item.classification}</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">{item.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
