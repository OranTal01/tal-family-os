import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function KidsLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-56' />
      <Skeleton className='mb-4 h-10 w-40 rounded-lg lg:hidden' />
      <div className='grid gap-4 lg:grid-cols-2'>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className='flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm'>
            <div className='flex items-center gap-3'>
              <Skeleton className='size-11 rounded-full' />
              <Skeleton className='h-4 w-28' />
            </div>
            <Skeleton className='h-20 rounded-md' />
            <Skeleton className='h-2 w-full rounded-full' />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className='h-10 w-full' />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
