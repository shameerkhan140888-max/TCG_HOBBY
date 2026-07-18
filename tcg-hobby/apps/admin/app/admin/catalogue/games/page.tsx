import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getCatalogueMasterDataRecords } from '@tcg-hobby/database';
import { CatalogueMasterDataPage } from '../../../../components/catalogue-master-data-page';

export const dynamic = 'force-dynamic';

export default async function GamesSettingsPage() {
  const records = await getCatalogueMasterDataRecords('games');
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue Settings" title="Games" description="Create, activate and deactivate controlled game values." />
        <CatalogueMasterDataPage kind="games" title="Games" description="Trading card games used by products, sets, filters and reporting." records={records} />
      </Container>
    </Section>
  );
}
