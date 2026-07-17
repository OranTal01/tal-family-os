import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function DailyLoading() {
  return (
    <PageContainer className='max-w-[980px]' aria-busy>
      <Skeleton className='mb-5 h-7 w-32' />
      <div className='mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-4 shadow-md sm:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='flex flex-col gap-1.5'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-6 w-20' />
          </div>
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        <Skeleton className='h-64 rounded-lg' />
        <div className='flex flex-col gap-4'>
          <Skeleton className='h-40 rounded-lg' />
          <Skeleton className='h-32 rounded-lg' />
        </div>
      </div>
    </PageContainer>
  );
}
