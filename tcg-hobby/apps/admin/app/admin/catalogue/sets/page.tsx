import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getCatalogueMasterDataOptions, getCatalogueMasterDataRecords } from '@tcg-hobby/database';
import { CatalogueMasterDataPage } from '../../../../components/catalogue-master-data-page';

export const dynamic = 'force-dynamic';

export default async function SetsSettingsPage() {
  const [records, options] = await Promise.all([getCatalogueMasterDataRecords('sets'), getCatalogueMasterDataOptions()]);
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue Settings" title="Sets" description="Manage game-specific sets and expansions." />
        <CatalogueMasterDataPage kind="sets" title="Sets" description="Game-specific sets and expansions for sealed products and singles." records={records} games={options.games} />
      </Container>
    </Section>
  );
}
