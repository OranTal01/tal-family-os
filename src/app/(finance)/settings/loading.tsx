import { PageContainer } from '@/components/shell/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <PageContainer className='max-w-[980px]' aria-busy>
      <Skeleton className='mb-5 h-7 w-24' />
      <div className='grid gap-4 lg:grid-cols-2'>
        <Skeleton className='h-56 rounded-lg' />
        <Skeleton className='h-56 rounded-lg' />
        <Skeleton className='h-32 rounded-lg lg:col-span-2' />
      </div>
    </PageContainer>
  );
}
