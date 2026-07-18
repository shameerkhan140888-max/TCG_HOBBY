import { Button, Card, CardContent, StatusBadge } from '@tcg-hobby/ui';
import type { CatalogueMasterDataKind, CatalogueMasterDataRecord } from '@tcg-hobby/database';
import { saveCatalogueMasterDataAction, toggleCatalogueMasterDataAction } from '../lib/admin-actions.server';

type CatalogueMasterDataPageProps = {
  kind: CatalogueMasterDataKind;
  title: string;
  description: string;
  records: CatalogueMasterDataRecord[];
  games?: CatalogueMasterDataRecord[];
};

function canEdit(kind: CatalogueMasterDataKind) {
  return kind !== 'categories';
}

function CreateSupplementalField({
  kind,
  games,
}: {
  kind: CatalogueMasterDataKind;
  games: CatalogueMasterDataRecord[];
}) {
  if (kind === 'sets') {
    return (
      <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
        Game
        <select name="gameId" required className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
          <option value="">Select a game</option>
          {games.map((game) => (
            <option key={game.id} value={game.id}>{game.name}</option>
          ))}
        </select>
      </label>
    );
  }

  if (kind === 'product-types') {
    return (
      <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
        Group
        <input name="group" placeholder="sealed, single, accessory" className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
      </label>
    );
  }

  if (kind === 'brands') {
    return (
      <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
        Website
        <input name="website" placeholder="https://..." className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
      </label>
    );
  }

  return <div aria-hidden="true" />;
}

function EditableSupplementalCell({
  kind,
  record,
  games,
  formId,
}: {
  kind: CatalogueMasterDataKind;
  record: CatalogueMasterDataRecord;
  games: CatalogueMasterDataRecord[];
  formId: string;
}) {
  if (kind === 'sets') {
    return (
      <select
        form={formId}
        name="gameId"
        defaultValue={record.gameId ?? ''}
        required
        className="h-9 w-full min-w-44 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        {games.map((game) => (
          <option key={game.id} value={game.id}>{game.name}</option>
        ))}
      </select>
    );
  }

  if (kind === 'product-types') {
    return (
      <input
        form={formId}
        name="group"
        defaultValue={record.group ?? ''}
        className="h-9 w-full min-w-36 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    );
  }

  if (kind === 'brands') {
    return (
      <input
        form={formId}
        name="website"
        defaultValue={record.website ?? ''}
        className="h-9 w-full min-w-44 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    );
  }

  return <span>{record.gameName ?? record.group ?? '-'}</span>;
}

export function CatalogueMasterDataPage({ kind, title, description, records, games = [] }: CatalogueMasterDataPageProps) {
  const editable = canEdit(kind);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Catalogue Settings</p>
            <h2 className="mt-1 text-xl font-black text-neutral-50">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">{description}</p>
          </div>

          {editable ? (
            <form action={saveCatalogueMasterDataAction} className="grid gap-3 lg:grid-cols-[1fr_180px_120px_180px_90px_auto]">
              <input type="hidden" name="kind" value={kind} />
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Name
                <input name="name" required className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                {kind === 'languages' ? 'Code' : 'Slug'}
                <input name={kind === 'languages' ? 'code' : 'slug'} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Sort
                <input name="sortOrder" type="number" defaultValue="0" className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
              </label>
              <CreateSupplementalField kind={kind} games={games} />
              <label className="flex items-end gap-3 pb-2 text-sm text-neutral-300">
                <input name="active" type="checkbox" defaultChecked value="true" />
                Active
              </label>
              <Button type="submit" className="self-end">Add</Button>
            </form>
          ) : (
            <p className="rounded-lg bg-surface-ink px-4 py-3 text-sm text-neutral-400">Categories remain managed by the existing catalogue category data path in this package.</p>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl bg-surface-base shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <table className="min-w-full divide-y divide-surface-line text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code / slug</th>
              <th className="px-4 py-3">Game / group</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-line text-neutral-300">
            {records.map((record) => {
              const formId = `edit-${record.id}`;

              return (
                <tr key={record.id} className="align-top">
                  {editable ? (
                    <>
                      <td className="px-4 py-3">
                        <form id={formId} action={saveCatalogueMasterDataAction} className="min-w-44">
                          <input type="hidden" name="kind" value={kind} />
                          <input type="hidden" name="id" value={record.id} />
                          <input name="name" defaultValue={record.name} required className="h-9 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm font-semibold text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
                        </form>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          form={formId}
                          name={kind === 'languages' ? 'code' : 'slug'}
                          defaultValue={record.code ?? record.slug}
                          className="h-9 w-full min-w-36 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <EditableSupplementalCell kind={kind} record={record} games={games} formId={formId} />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          form={formId}
                          name="sortOrder"
                          type="number"
                          defaultValue={record.sortOrder}
                          className="h-9 w-24 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                        />
                        <p className="mt-2 text-xs text-neutral-500">{record.productCount} products</p>
                      </td>
                      <td className="px-4 py-3">
                        <input form={formId} type="hidden" name="active" value={record.active ? 'true' : 'false'} />
                        <StatusBadge tone={record.active ? 'success' : 'neutral'}>{record.active ? 'Active' : 'Inactive'}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button form={formId} type="submit" size="sm">Save</Button>
                          <form action={toggleCatalogueMasterDataAction}>
                            <input type="hidden" name="kind" value={kind} />
                            <input type="hidden" name="id" value={record.id} />
                            <input type="hidden" name="active" value={record.active ? 'false' : 'true'} />
                            <Button type="submit" size="sm" variant="outline">
                              {record.active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-semibold text-neutral-50">{record.name}</td>
                      <td className="px-4 py-3">{record.code ?? record.slug}</td>
                      <td className="px-4 py-3">{record.gameName ?? record.group ?? '-'}</td>
                      <td className="px-4 py-3">{record.productCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone="success">Active</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-500">Managed by category data</span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
