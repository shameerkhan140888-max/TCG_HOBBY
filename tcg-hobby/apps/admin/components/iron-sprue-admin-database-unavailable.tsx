import { getIronSprueAdminDatabaseTargetInfo } from '@tcg-hobby/database';
import { Card, CardContent, Container, PageHeader, Section } from '@tcg-hobby/ui';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isIronSprueAdminDatabaseUnavailable(error: unknown) {
  const details = error as { code?: string; meta?: unknown };
  const message = errorMessage(error);
  return (
    details.code === 'P1001' ||
    details.code === 'EACCES' ||
    message.includes("Can't reach database server") ||
    message.includes('DatabaseNotReachable') ||
    message.includes('P1001') ||
    message.includes('EACCES') ||
    JSON.stringify(details.meta ?? {}).includes('DatabaseNotReachable')
  );
}

export function IronSprueAdminDatabaseUnavailable({ error }: { error: unknown }) {
  const target = getIronSprueAdminDatabaseTargetInfo();
  const message = errorMessage(error).split('\n').find(Boolean) ?? 'The Iron Sprue admin database is unavailable.';
  const hostWithPort = target.port ? `${target.host}:${target.port}` : target.host;
  const tunnelCommand = target.host === '127.0.0.1' && target.port
    ? `railway connect Postgres --tunnel-only -P ${target.port}`
    : null;

  return (
    <Section className="py-8">
      <Container className="space-y-6">
        <PageHeader
          eyebrow="Iron Sprue Admin"
          title="Railway database tunnel unavailable"
          description="The admin is configured for the explicit Iron Sprue Railway database target, but the local tunnel is not reachable."
        />
        <Card>
          <CardContent className="space-y-5">
            <div className="rounded-md border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-100">
              {message}
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Database source</dt>
                <dd className="mt-1 font-semibold">{target.source}</dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3">
                <dt className="text-neutral-500">Environment</dt>
                <dd className="mt-1 font-semibold">{target.label}</dd>
                <dd className="mt-1 text-xs text-neutral-500">{target.environment}</dd>
              </div>
              <div className="rounded-md border border-surface-line bg-surface-ink p-3 md:col-span-2">
                <dt className="text-neutral-500">Local target</dt>
                <dd className="mt-1 break-all font-semibold">{hostWithPort}/{target.database}</dd>
              </div>
            </dl>
            <p className="text-sm leading-6 text-neutral-400">
              Start the existing Railway PostgreSQL tunnel for this local target, then refresh the admin. No data has been changed.
            </p>
            {tunnelCommand ? (
              <div className="rounded-md border border-amber-900/60 bg-amber-950/20 p-4 text-sm">
                <p className="font-semibold text-amber-100">Expected tunnel command</p>
                <code className="mt-2 block break-all text-amber-50">{tunnelCommand}</code>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
