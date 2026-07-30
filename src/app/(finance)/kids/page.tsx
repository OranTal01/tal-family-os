import type { Metadata } from 'next';
import { EmptyState } from '@/components/finance/empty-state';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { KidsView } from '@/features/kids/kids-view';
import { getPersistedKidsScreen } from '@/server/data/persisted-wealth';

export const metadata: Metadata = { title: 'חיסכון ילדים' };

export default async function KidsPage() {
  const entries = await getPersistedKidsScreen();

  return (
    <PageContainer>
      <PageHeader
        title='חיסכון לילדים'
        meta='מסלולים נפרדים · צבירה, הפקדות ויעדים'
      />
      {entries.length === 0 ? (
        <EmptyState
          icon='child_care'
          title='עדיין לא נוספו ילדים לחיסכון'
          body='לא מוצגים כאן שמות או סכומים לדוגמה. לאחר הגדרת הילדים והחסכונות הנתונים יופיעו כאן.'
        />
      ) : (
        <KidsView entries={entries} />
      )}
    </PageContainer>
  );
}
