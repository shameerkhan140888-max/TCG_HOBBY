import { BrandMark, Button, Card, CardContent, Input, PageShell } from '@tcg-hobby/ui';

export default function LoginPage() {
  return (
    <PageShell className="grid place-items-center px-4 py-10">
      <Card className="w-full max-w-md shadow-glow">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2 text-center">
            <BrandMark width={168} height={56} className="mx-auto w-[160px] object-contain" />
            <h1 className="text-2xl font-bold">Admin sign in</h1>
            <p className="text-sm text-neutral-400">UI only placeholder for the future staff authentication flow.</p>
          </div>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300" htmlFor="email">
                Email
              </label>
              <Input id="email" type="email" placeholder="ops@tcghobby.co.uk" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300" htmlFor="password">
                Password
              </label>
              <Input id="password" type="password" placeholder="Password" />
            </div>
            <Button className="w-full" type="button">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
