import { PageContainer } from '@/components/shell/page-container';
import { CategoryRingSkeleton } from '@/components/finance/category-ring';
import { Skeleton } from '@/components/ui/skeleton';

export default function BudgetLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-48' />
      <div className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-24 rounded-lg' />
        ))}
      </div>
      <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
        <div className='grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 md:grid-cols-4'>
          {Array.from({ length: 12 }).map((_, i) => (
            <CategoryRingSkeleton key={i} size='lg' />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
