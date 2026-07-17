import { PageContainer } from '@/components/shell/page-container';
import { KpiCardSkeleton } from '@/components/finance/kpi-card';
import { CategoryRingSkeleton } from '@/components/finance/category-ring';
import { TransactionRowSkeleton } from '@/components/finance/transaction-row';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <PageContainer aria-busy>
      <div className='mb-4 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-md lg:hidden'>
        <Skeleton className='h-3.5 w-36' />
        <Skeleton className='h-9 w-40' />
        <Skeleton className='h-4 w-52' />
      </div>
      <div className='mb-4 hidden gap-3 lg:grid lg:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className='mb-4 rounded-lg border border-line bg-surface p-4 shadow-sm'>
        <Skeleton className='mb-3 h-4 w-44' />
        <Skeleton className='h-3.5 w-full rounded-full' />
      </div>
      <div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <div className='flex flex-col gap-4'>
          <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
            <Skeleton className='mb-3 h-4 w-36' />
            <div className='grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 md:grid-cols-4'>
              {Array.from({ length: 8 }).map((_, i) => (
                <CategoryRingSkeleton key={i} size='sm' />
              ))}
            </div>
          </div>
          <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
            <Skeleton className='mb-3 h-4 w-32' />
            {Array.from({ length: 5 }).map((_, i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className='flex flex-col gap-4'>
          <Skeleton className='h-32 rounded-lg' />
          <Skeleton className='h-48 rounded-lg' />
        </div>
      </div>
    </PageContainer>
  );
}
