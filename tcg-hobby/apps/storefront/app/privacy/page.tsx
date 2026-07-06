import { StaticPage } from '../../components/static-page';

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Privacy"
      description="How customer data is handled across the storefront, account area, and checkout flow."
    >
      <p>The final privacy policy copy can be dropped in here without changing the route structure again.</p>
    </StaticPage>
  );
}
