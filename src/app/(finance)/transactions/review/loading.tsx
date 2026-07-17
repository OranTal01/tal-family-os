import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReviewLoading() {
  return (
    <PageContainer className='max-w-[860px]'>
      <Skeleton className='mb-5 h-7 w-40' />
      <div className='flex flex-col gap-3' aria-busy>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-28 rounded-lg' />
        ))}
      </div>
    </PageContainer>
  );
}
