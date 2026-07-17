import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanningLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-40' />
      <div className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-24 rounded-lg' />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
            <Skeleton className='mb-3 h-4 w-24' />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='flex items-center gap-3 py-2.5'>
                <Skeleton className='size-8 rounded-full' />
                <div className='flex flex-1 flex-col gap-1.5'>
                  <Skeleton className='h-3.5 w-28' />
                  <Skeleton className='h-3 w-16' />
                </div>
                <Skeleton className='h-4 w-12' />
              </div>
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
