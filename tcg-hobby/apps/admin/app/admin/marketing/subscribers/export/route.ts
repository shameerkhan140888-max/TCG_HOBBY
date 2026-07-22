import { requireAdminRole } from '../../../../../lib/auth.server';
import { MarketingSubscriberStatus, exportMarketingSubscribersCsv } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await requireAdminRole('/admin/marketing/subscribers');
  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status') ?? 'ALL';
  const status = Object.values(MarketingSubscriberStatus).includes(statusParam as MarketingSubscriberStatus)
    ? (statusParam as MarketingSubscriberStatus)
    : 'ALL';
  const csv = await exportMarketingSubscribersCsv({
    search: url.searchParams.get('search') ?? '',
    status,
    tag: url.searchParams.get('tag') ?? '',
    consent: (url.searchParams.get('consent') as 'all' | 'yes' | 'no' | null) ?? 'all',
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tcg-hobby-marketing-subscribers.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
