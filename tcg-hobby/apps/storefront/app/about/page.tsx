import { StaticPage } from '../../components/static-page';

export default function AboutPage() {
  return (
    <StaticPage
      eyebrow="Company"
      title="About TCG Hobby"
      description="A premium trading card destination built for collectors, traders, players, and stores."
    >
      <p>
        TCG Hobby brings commerce, collection tools, releases, buying, and account management together in one polished
        experience.
      </p>
    </StaticPage>
  );
}
