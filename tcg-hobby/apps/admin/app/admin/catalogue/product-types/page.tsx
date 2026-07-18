import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getCatalogueMasterDataRecords } from '@tcg-hobby/database';
import { CatalogueMasterDataPage } from '../../../../components/catalogue-master-data-page';

export const dynamic = 'force-dynamic';

export default async function ProductTypesSettingsPage() {
  const records = await getCatalogueMasterDataRecords('product-types');
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue Settings" title="Product Types" description="Manage controlled retail product formats." />
        <CatalogueMasterDataPage kind="product-types" title="Product Types" description="Controlled retail formats such as booster boxes, tins and sleeves." records={records} />
      </Container>
    </Section>
  );
}
