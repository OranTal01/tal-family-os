import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { TransactionsView } from '@/features/transactions/transactions-view';
import { getTransactionsScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'תנועות' };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const data = await getTransactionsScreen();

  return (
    <PageContainer>
      <PageHeader title='תנועות' />
      <TransactionsView
        items={data.items}
        categories={data.categories}
        initialTab={tab === 'review' ? 'review' : 'all'}
      />
    </PageContainer>
  );
}
