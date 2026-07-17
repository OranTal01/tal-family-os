import { PageContainer } from '@/components/shell/page-container';
import { TransactionRowSkeleton } from '@/components/finance/transaction-row';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransactionsLoading() {
  return (
    <PageContainer>
      <Skeleton className='mb-5 h-7 w-28' />
      <Skeleton className='mb-3 h-10 w-full rounded-lg' />
      <Skeleton className='mb-4 h-9 w-64 rounded-lg' />
      <div className='rounded-lg border border-line bg-surface p-3 shadow-sm' aria-busy>
        {Array.from({ length: 10 }).map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    </PageContainer>
  );
}
