import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { EmptyState } from '@/components/finance/empty-state';
import { KpiCard } from '@/components/finance/kpi-card';
import { SectionCard } from '@/components/finance/section-card';
import { StatusBadge } from '@/components/finance/status-badge';
import { Icon } from '@/components/ui/icon';
import { formatMoney } from '@/lib/format/currency';
import { formatMonth } from '@/lib/format/date';
import { getPersistedPlanningScreen } from '@/server/data/persisted-planning';
import { resolveMonth } from '@/server/data/views';

export const metadata: Metadata = { title: 'תכנון וצפי' };

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = resolveMonth(rawMonth);
  const p = await getPersistedPlanningScreen(month);
  const surplus = p.balance >= 0;
  const hasItems =
    p.committedInstallments > 0 ||
    p.groups.some((group) => group.items.length > 0);

  return (
    <PageContainer>
      <PageHeader
        title={`תכנון · ${formatMonth(month)}`}
        meta={
          p.uncertainIncome > 0
            ? `הכנסה לא ודאית של ${formatMoney(p.uncertainIncome)} אינה נכללת במאזן`
            : undefined
        }
      />

      <div className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <KpiCard label='הכנסה צפויה' value={p.income} />
        <KpiCard label='הוצאות צפויות' value={p.expectedExpenses} variant='future' />
        <KpiCard
          label='מאזן חזוי'
          value={p.balance}
          signed
          variant={surplus ? 'positive' : 'default'}
          delta={{
            icon: surplus ? 'arrow_upward' : 'arrow_downward',
            text: surplus ? 'עודף צפוי' : 'גירעון צפוי',
            tone: surplus ? 'positive' : 'negative',
          }}
        />
      </div>

      {!hasItems ? (
        <EmptyState
          icon='event_upcoming'
          title='אין הוצאות מתוכננות'
          body='פתחו הוצאה במסך התנועות, הפעילו „הוצאה קבועה” ושמרו. היא תופיע כאן אוטומטית בכל חודש.'
        />
      ) : (
        <div className='grid gap-4 lg:grid-cols-3'>
          {p.groups.map((group) => (
            <SectionCard key={group.key} title={group.title}>
              {group.items.length === 0 ? (
                <p className='py-3 text-body text-mut'>אין פריטים בקבוצה זו.</p>
              ) : (
                <ul className='flex flex-col'>
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className='flex items-center gap-3 border-b border-line px-1 py-2.5 last:border-b-0'
                    >
                      <span
                        aria-hidden
                        className='flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-mut'
                      >
                        <Icon name={item.icon} className='text-[16px]' />
                      </span>
                      <span className='flex min-w-0 flex-1 flex-col'>
                        <span className='truncate text-body font-bold text-ink'>{item.name}</span>
                        <span className='text-caption font-semibold text-mut'>{item.dueLabel}</span>
                      </span>
                      {item.fulfilled && (
                        <StatusBadge tone='ok' icon='check_circle' label='שולם' size='micro' />
                      )}
                      <Amount
                        value={item.amount}
                        sign='never'
                        className='shrink-0 text-body font-bold text-ink-2'
                      />
                    </li>
                  ))}
                </ul>
              )}
              {group.key === 'fixed' && p.committedInstallments > 0 && (
                <div className='mt-2 flex items-center gap-3 rounded-md border border-dashed border-mut/40 px-3 py-2.5'>
                  <Icon name='credit_card' className='text-[16px] text-mut' />
                  <span className='flex-1 text-caption font-bold text-ink-2'>
                    תשלומים מחויבים ({p.installmentsCount} עסקאות)
                  </span>
                  <Amount
                    value={p.committedInstallments}
                    sign='never'
                    className='text-caption font-bold text-ink-2'
                  />
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
