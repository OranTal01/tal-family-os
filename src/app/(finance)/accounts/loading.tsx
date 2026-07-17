import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountsLoading() {
  return (
    <PageContainer aria-busy>
      <div className='mb-5 flex items-center justify-between gap-3'>
        <Skeleton className='h-7 w-44' />
        <Skeleton className='h-10 w-32 rounded-lg' />
      </div>
      <div className='overflow-hidden rounded-lg border border-line bg-surface shadow-sm'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0'>
            <Skeleton className='size-10 shrink-0 rounded-full' />
            <div className='flex flex-1 flex-col gap-1.5'>
              <Skeleton className='h-3.5 w-32' />
              <Skeleton className='h-3 w-24' />
            </div>
            <Skeleton className='h-5 w-20 rounded-full' />
            <Skeleton className='h-4 w-16' />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
