import { PageContainer } from '@/components/shell/page-container';
import { KpiCardSkeleton } from '@/components/finance/kpi-card';
import { TransactionRowSkeleton } from '@/components/finance/transaction-row';
import { Skeleton } from '@/components/ui/skeleton';

export default function BusinessLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-44' />
      <div className='mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
          <Skeleton className='mb-3 h-4 w-32' />
          {Array.from({ length: 5 }).map((_, i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
        <Skeleton className='h-40 rounded-lg' />
      </div>
    </PageContainer>
  );
}
