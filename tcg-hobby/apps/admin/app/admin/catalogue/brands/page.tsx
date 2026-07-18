import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getCatalogueMasterDataRecords } from '@tcg-hobby/database';
import { CatalogueMasterDataPage } from '../../../../components/catalogue-master-data-page';

export const dynamic = 'force-dynamic';

export default async function BrandsSettingsPage() {
  const records = await getCatalogueMasterDataRecords('brands');
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue Settings" title="Brands" description="Manage publishers, manufacturers and accessory brands." />
        <CatalogueMasterDataPage kind="brands" title="Brands" description="Publishers, manufacturers and accessory brands linked to products." records={records} />
      </Container>
    </Section>
  );
}
