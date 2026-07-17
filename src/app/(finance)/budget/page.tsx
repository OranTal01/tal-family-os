import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { BudgetView } from '@/features/budget/budget-view';
import { formatMonth } from '@/lib/format/date';
import { getMonthOverview, resolveMonth } from '@/server/data/views';

export const metadata: Metadata = { title: 'תקציב חודשי' };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = resolveMonth(rawMonth);
  const o = await getMonthOverview(month);

  return (
    <PageContainer>
      <PageHeader
        title={`תקציב · ${formatMonth(month)}`}
        meta={o.isFutureMonth ? 'חודש עתידי — מצב תכנון' : undefined}
      />
      <BudgetView
        household={o.categories}
        business={o.businessCategories}
        householdSpent={o.actualSpending}
      />
    </PageContainer>
  );
}
