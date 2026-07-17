import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssetsLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-36' />
      <div className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-24 rounded-lg' />
        ))}
      </div>
      <div className='overflow-hidden rounded-lg border border-line bg-surface shadow-sm'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0'>
            <Skeleton className='size-9 shrink-0 rounded-full' />
            <div className='flex flex-1 flex-col gap-1.5'>
              <Skeleton className='h-3.5 w-40' />
              <Skeleton className='h-3 w-24' />
            </div>
            <Skeleton className='h-4 w-16' />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
