import { Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { getCatalogueMasterDataRecords } from '@tcg-hobby/database';
import { CatalogueMasterDataPage } from '../../../../components/catalogue-master-data-page';

export const dynamic = 'force-dynamic';

export default async function CategoriesSettingsPage() {
  const records = await getCatalogueMasterDataRecords('categories');
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader eyebrow="Catalogue Settings" title="Categories" description="Review customer-facing category values and product counts." />
        <CatalogueMasterDataPage kind="categories" title="Categories" description="Customer-facing catalogue categories used by storefront navigation." records={records} />
      </Container>
    </Section>
  );
}
