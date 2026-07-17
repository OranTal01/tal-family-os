import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function GoalsLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-40' />
      <ul className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className='flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-sm'>
            <div className='flex items-center gap-3'>
              <Skeleton className='size-10 rounded-full' />
              <Skeleton className='h-4 w-24' />
            </div>
            <Skeleton className='h-7 w-32' />
            <Skeleton className='h-2 w-full rounded-full' />
            <Skeleton className='h-3 w-full' />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
