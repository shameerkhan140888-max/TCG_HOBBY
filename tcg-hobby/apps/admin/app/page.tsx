import { canAccessAdmin } from '@tcg-hobby/auth';
import { Button } from '@tcg-hobby/ui';

export default function AdminHomePage() {
  const allowed = canAccessAdmin({ id: 'staff_1', email: 'ops@tcghobby.test', role: 'ADMIN' });

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-50">
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-400">Operations</p>
          <h1 className="text-4xl font-bold">Admin dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {['Inventory', 'Suppliers', 'Orders'].map((label) => (
            <div key={label} className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="font-semibold">{label}</h2>
              <p className="mt-2 text-sm text-neutral-400">Ready for protected workflows.</p>
            </div>
          ))}
        </div>
        <Button variant="secondary">Access verified: {allowed ? 'yes' : 'no'}</Button>
      </section>
    </main>
  );
}
