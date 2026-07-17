import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { ReviewView } from '@/features/review/review-view';
import { getReviewScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'תנועות לבדיקה' };

export default async function ReviewPage() {
  const { items, categories } = await getReviewScreen();

  return (
    <PageContainer className='max-w-[860px]'>
      <PageHeader
        title='תנועות לבדיקה'
        meta='כל פריט עם סיבה אחת ופעולה אחת — לרוקן את התור בכמה שפחות הקשות'
      />
      <ReviewView items={items} categories={categories} />
    </PageContainer>
  );
}
