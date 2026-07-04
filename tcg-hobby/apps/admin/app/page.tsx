import { BrandMark, Button, Card, CardContent, CardHeader, CardTitle, Container, SplitLayout } from '@tcg-hobby/ui';

const sidebarItems = ['Dashboard', 'Catalogue', 'Inventory', 'Suppliers', 'Orders', 'CMS', 'Tournaments'];
const metrics = [
  { label: 'Today revenue', value: 'GBP 0.00', detail: 'Commerce wiring arrives in a later sprint' },
  { label: 'Open orders', value: '0', detail: 'Fulfilment queue placeholder' },
  { label: 'Low stock lines', value: '0', detail: 'Inventory alerts placeholder' },
  { label: 'Upcoming events', value: '0', detail: 'Tournament schedule placeholder' },
];

function Sidebar() {
  return (
    <aside className="hidden bg-surface-ink p-5 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <BrandMark className="h-10 w-10 rounded-md border border-surface-line bg-black/60 p-1" />
        <div>
          <p className="font-bold">TCG Hobby</p>
          <p className="text-xs text-neutral-500">Admin</p>
        </div>
      </div>
      <nav className="space-y-1">
        {sidebarItems.map((item) => (
          <a
            key={item}
            href="#"
            className="block rounded-md px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-surface-panel hover:text-neutral-50"
          >
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default function AdminHomePage() {
  return (
    <SplitLayout sidebar={<Sidebar />}>
      <header className="border-b border-surface-line bg-surface-base">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Operations</p>
            <h1 className="text-lg font-bold">Dashboard</h1>
          </div>
          <Button variant="outline">Preview storefront</Button>
        </Container>
      </header>

      <Container className="py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent>
                <p className="text-sm text-neutral-400">{metric.label}</p>
                <p className="mt-3 text-3xl font-black">{metric.value}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-500">{metric.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Operational queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {['Catalogue setup', 'Supplier imports', 'Inventory receiving', 'CMS homepage blocks'].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-md border border-surface-line bg-surface-ink p-4">
                    <span className="font-medium">{item}</span>
                    <span className="text-sm text-accent-soft">Ready to build</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin shell status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-400">
              <p>Sidebar navigation, dashboard cards, and responsive content regions are in place.</p>
              <p>No authentication, database calls, or API integration are included in this frontend-only sprint.</p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </SplitLayout>
  );
}
