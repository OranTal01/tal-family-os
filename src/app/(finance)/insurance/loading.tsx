import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsuranceLoading() {
  return (
    <PageContainer aria-busy>
      <div className='mb-5 flex items-center justify-between gap-3'>
        <Skeleton className='h-7 w-24' />
        <Skeleton className='h-10 w-40 rounded-lg' />
      </div>
      <ul className='grid gap-3 sm:grid-cols-2'>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className='flex items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm'>
            <Skeleton className='size-10 shrink-0 rounded-full' />
            <div className='flex flex-1 flex-col gap-1.5'>
              <Skeleton className='h-3.5 w-28' />
              <Skeleton className='h-3 w-36' />
            </div>
            <Skeleton className='h-4 w-14' />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
