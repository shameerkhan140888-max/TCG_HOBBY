import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function IronSprueAdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  redirect(`/iron-sprue-admin/${section}`);
}
