import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function SplitLoading() {
  return (
    <PageContainer aria-busy>
      <Skeleton className='mb-5 h-7 w-48' />
      <div className='grid gap-4 lg:grid-cols-2'>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className='h-64 rounded-lg' />
        ))}
      </div>
      <Skeleton className='mt-4 h-16 rounded-lg' />
    </PageContainer>
  );
}
