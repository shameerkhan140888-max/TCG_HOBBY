import { Container, Section } from '@tcg-hobby/ui';
import { getCustomerProfile } from '../../../lib/auth';
import { ProfileForm } from '../../../components/auth-forms';

export default async function AccountProfilePage() {
  const { user } = await getCustomerProfile();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Profile</p>
          <h1 className="text-3xl font-black sm:text-4xl">Customer details</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">Keep the basic account details attached to your storefront profile current.</p>
        </div>
        <div className="max-w-xl">
          <ProfileForm email={user?.email ?? ''} initialName={user?.name ?? ''} />
        </div>
      </Container>
    </Section>
  );
}

