import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { ImportTransactionsButton } from '@/features/transactions/import-transactions-button';
import { TransactionsView } from '@/features/transactions/transactions-view';
import { getPersistedTransactionsScreen } from '@/server/data/persisted-transactions';

export const metadata: Metadata = { title: 'תנועות' };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const data = await getPersistedTransactionsScreen();

  return (
    <PageContainer>
      <PageHeader
        title='תנועות'
        actions={
          <ImportTransactionsButton categories={data.categories} />
        }
      />
      <TransactionsView
        items={data.items}
        categories={data.categories}
        initialTab={tab === 'review' ? 'review' : 'all'}
      />
    </PageContainer>
  );
}
