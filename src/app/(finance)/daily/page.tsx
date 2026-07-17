import Link from 'next/link';
import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { EmptyState } from '@/components/finance/empty-state';
import { InsightCard } from '@/components/finance/insight-card';
import { SectionCard } from '@/components/finance/section-card';
import { StatusBadge } from '@/components/finance/status-badge';
import { TransactionRow } from '@/components/finance/transaction-row';
import { Icon } from '@/components/ui/icon';
import { formatMoney } from '@/lib/format/currency';
import { routes } from '@/lib/routes';
import { getDailyScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'סיכום יומי' };

export default async function DailyPage() {
  const { summary, txnItems } = await getDailyScreen();
  const quiet = txnItems.length === 0;

  return (
    <PageContainer className='max-w-[980px]'>
      <PageHeader
        title='סיכום יומי'
        meta='נשלח מדי יום ב־21:30 · עדכון של 15 שניות בלי להיכנס לעומק'
      />

      <section
        aria-label='תקציר היום'
        className='mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-4 shadow-md sm:grid-cols-4'
      >
        <div className='flex flex-col gap-1'>
          <span className='text-caption font-semibold text-mut'>יצא היום</span>
          <Amount value={summary.spentToday} className='text-title font-extrabold text-ink' />
        </div>
        <div className='flex flex-col gap-1'>
          <span className='text-caption font-semibold text-mut'>נכנס היום</span>
          <Amount
            value={summary.incomeToday}
            sign={summary.incomeToday > 0 ? 'always' : 'auto'}
            tone={summary.incomeToday > 0 ? 'positive' : 'default'}
            className='text-title font-extrabold'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <span className='text-caption font-semibold text-mut'>הוצא החודש</span>
          <span className='ltr-embed tabular-amounts text-title font-extrabold text-ink-2'>
            {formatMoney(summary.monthSpent)}
          </span>
          <span className='text-micro font-semibold text-mut'>
            מתוך תקציב {formatMoney(summary.monthBudget)}
          </span>
        </div>
        <div className='flex flex-col gap-1'>
          <span className='text-caption font-semibold text-mut'>יתרה חזויה לסוף החודש</span>
          <Amount
            value={summary.projectedEndOfMonth}
            className='text-title font-extrabold text-accent-ink'
          />
        </div>
      </section>

      <div className='grid gap-4 lg:grid-cols-2'>
        <SectionCard title='תנועות היום'>
          {quiet ? (
            <EmptyState
              icon='self_improvement'
              variant='all-clear'
              title='יום שקט'
              body='אין תנועות חדשות היום. נעדכן אתכם בסיכום הערב.'
            />
          ) : (
            <ul className='divide-y divide-line'>
              {txnItems.map((t) => (
                <li key={t.id}>
                  <TransactionRow
                    icon={t.icon}
                    name={t.merchant}
                    meta={t.meta}
                    amount={t.amount}
                    kind={t.kind === 'transfer' ? 'expense' : t.kind}
                    tag={t.tag}
                  />
                </li>
              ))}
            </ul>
          )}

          {summary.byOwner.some((o) => o.amount > 0) && (
            <dl className='mt-3 flex gap-3 border-t border-line pt-3'>
              {summary.byOwner.map((o) => (
                <div key={o.ownerId} className='flex flex-1 flex-col rounded-md bg-surface-2 p-3'>
                  <dt className='text-caption font-semibold text-mut'>הוצאות {o.name}</dt>
                  <dd>
                    <Amount value={o.amount} className='text-subhead font-extrabold text-ink' />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </SectionCard>

        <div className='flex flex-col gap-4'>
          <SectionCard title='דורש טיפול היום'>
            <ul className='flex flex-col gap-2'>
              {summary.openReviewCount > 0 && (
                <li>
                  <Link
                    href={routes.review}
                    className='flex items-center gap-3 rounded-md bg-warn-soft px-3 py-2.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50'
                  >
                    <Icon name='fact_check' className='text-[18px] text-warn-ink' />
                    <span className='flex-1 text-body font-bold text-warn-ink'>
                      {summary.openReviewCount} תנועות ממתינות לבדיקה
                    </span>
                    <Icon name='chevron_left' className='text-[18px] text-warn-ink' />
                  </Link>
                </li>
              )}
              {summary.attention.map((a) => (
                <li
                  key={a.name}
                  className='flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2.5'
                >
                  <StatusBadge
                    tone={a.status === 'over' ? 'warn' : 'near'}
                    icon={a.status === 'over' ? 'priority_high' : 'warning'}
                    label={a.status === 'over' ? 'חריגה' : 'קרוב לגבול'}
                    size='micro'
                  />
                  <span className='flex-1 truncate text-body font-bold text-ink'>{a.name}</span>
                  <span className='text-caption font-semibold text-mut'>{a.detail}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {summary.upcomingLarge.length > 0 && (
            <SectionCard title='תשלומים גדולים מתקרבים'>
              <ul className='flex flex-col gap-1'>
                {summary.upcomingLarge.map((u) => (
                  <li key={u.id} className='flex items-center gap-3 px-1 py-2'>
                    <Icon name={u.icon} className='text-[18px] text-mut' />
                    <span className='flex-1 truncate text-body font-bold text-ink'>{u.name}</span>
                    <span className='text-caption font-semibold text-mut'>{u.dueLabel}</span>
                    <Amount value={u.amount} sign='never' className='text-body font-bold text-ink-2' />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <InsightCard
            title='תובנת היום'
            insights={[
              summary.attention.length > 0
                ? {
                    icon: 'lightbulb',
                    text: `${summary.attention.length} קטגוריות דורשות מבט. תשומת לב קטנה עכשיו חוסכת חריגה בסוף החודש.`,
                  }
                : {
                    icon: 'lightbulb',
                    text: 'אתם בכיוון טוב — כל הקטגוריות בתקציב והיום עבר בשקט.',
                  },
            ]}
          />

          <Link
            href={routes.dashboard}
            className='flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-body font-bold text-accent-ink shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'
          >
            <Icon name='space_dashboard' className='text-[18px]' />
            מעבר ללוח החודשי המלא
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
