import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { KidsView } from '@/features/kids/kids-view';
import { getKidsScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'חיסכון ילדים' };

export default async function KidsPage() {
  const entries = await getKidsScreen();

  return (
    <PageContainer>
      <PageHeader
        title='חיסכון ילדים — אריאה ואלי'
        meta='שני מסלולים נפרדים · צבירה, הפקדות ויעד לגיל 18'
      />
      <KidsView entries={entries} />
    </PageContainer>
  );
}
