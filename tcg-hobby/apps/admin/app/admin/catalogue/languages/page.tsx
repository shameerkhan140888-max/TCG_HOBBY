import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getCatalogueMasterDataRecords } from '@tcg-hobby/database';
import { CatalogueMasterDataPage } from '../../../../components/catalogue-master-data-page';

export const dynamic = 'force-dynamic';

export default async function LanguagesSettingsPage() {
  const records = await getCatalogueMasterDataRecords('languages');
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue Settings" title="Languages" description="Manage controlled product language values." />
        <CatalogueMasterDataPage kind="languages" title="Languages" description="Product language codes available for catalogue records." records={records} />
      </Container>
    </Section>
  );
}
