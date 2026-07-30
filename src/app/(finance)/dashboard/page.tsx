import Link from 'next/link';
import type { Metadata } from 'next';
import { PageContainer } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { AlertBanner } from '@/components/finance/alert-banner';
import { CashflowBar } from '@/components/finance/cashflow-bar';
import { InsightCard } from '@/components/finance/insight-card';
import { KpiCard } from '@/components/finance/kpi-card';
import { SectionCard } from '@/components/finance/section-card';
import { TransactionRow } from '@/components/finance/transaction-row';
import { Icon } from '@/components/ui/icon';
import { RingsSection } from '@/features/dashboard/rings-section';
import { formatMoney } from '@/lib/format/currency';
import { formatMonth } from '@/lib/format/date';
import { routes } from '@/lib/routes';
import { getPersistedMonthOverview } from '@/server/data/persisted-overview';
import { resolveMonth } from '@/server/data/views';
import type { Agorot } from '@/types/money';

export const metadata: Metadata = { title: 'לוח חודשי' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = resolveMonth(rawMonth);
  const o = await getPersistedMonthOverview(month);
  const surplus = o.balance >= 0;

  return (
    <PageContainer>
      {/* mobile header — desktop gets the sticky top bar instead */}
      <header className='mb-4 flex items-center justify-between lg:hidden'>
        <div className='flex flex-col'>
          <span className='text-caption font-semibold text-mut'>
            {formatMonth(month)} · מסונכרן
          </span>
          <h1 className='text-title font-extrabold text-ink'>שלום, אורן 👋</h1>
        </div>
        <Link
          href={routes.review}
          aria-label={`התראות — ${o.reviewCount} תנועות לבדיקה`}
          className='relative flex size-10 items-center justify-center rounded-full bg-surface text-mut shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          <Icon name='notifications' className='text-[20px]' />
          {o.reviewCount > 0 && (
            <span className='absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-warn text-[10px] font-bold text-white'>
              {o.reviewCount}
            </span>
          )}
        </Link>
      </header>

      {/* mobile hero: projected end-of-month balance */}
      <section
        aria-label='יתרה חזויה לסוף החודש'
        className='mb-4 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-md lg:hidden'
      >
        <span className='text-caption font-semibold text-mut'>יתרה חזויה לסוף החודש</span>
        <Amount value={o.projectedEom} className='text-[34px] font-extrabold text-ink' />
        <div className='flex flex-wrap items-center gap-2'>
          <span
            className={
              surplus
                ? 'flex items-center gap-1 rounded-full bg-pos-soft px-2 py-0.5 text-caption font-bold text-pos-ink'
                : 'flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-caption font-bold text-warn-ink'
            }
          >
            <Icon name={surplus ? 'arrow_upward' : 'arrow_downward'} className='text-[14px]' />
            {surplus ? 'עודף' : 'גירעון'} {formatMoney(o.balance, { sign: 'never' })}
          </span>
          <span className='text-caption font-semibold text-mut'>
            כעת {formatMoney(o.currentBalance)}
          </span>
        </div>
      </section>

      {/* desktop KPI row */}
      <div className='mb-4 hidden gap-3 lg:grid lg:grid-cols-5'>
        <KpiCard label='הכנסה צפויה' value={o.expectedIncome} />
        <KpiCard label='הוצא בפועל' value={o.actualSpending} />
        <KpiCard label='נותרו צפויות' value={o.remainingExpected} variant='future' />
        <KpiCard
          label='יתרה חזויה'
          value={o.projectedEom}
          variant='emphasis'
          hint={`כעת ${formatMoney(o.currentBalance)}`}
        />
        <KpiCard
          label='מאזן החודש'
          value={o.balance}
          signed
          variant={surplus ? 'positive' : 'default'}
          delta={{
            icon: surplus ? 'arrow_upward' : 'arrow_downward',
            text: surplus ? 'עודף צפוי' : 'גירעון צפוי',
            tone: surplus ? 'positive' : 'negative',
          }}
        />
      </div>

      <SectionCard title={`תזרים החודש · מתוך ${formatMoney(o.expectedIncome)}`} className='mb-4'>
        <CashflowBar
          spent={o.actualSpending}
          expected={o.remainingExpected}
          surplus={o.balance}
          total={o.expectedIncome}
        />
      </SectionCard>

      <div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <div className='flex min-w-0 flex-col gap-4'>
          <RingsSection categories={o.categories} />

          <SectionCard
            title='תנועות אחרונות'
            action={
              <Link
                href={routes.transactions}
                className='rounded-md px-2 py-1 text-caption font-bold text-accent-ink outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'
              >
                הכול
              </Link>
            }
          >
            <ul className='divide-y divide-line'>
              {o.recentTransactions.map((t) => (
                <li key={t.id}>
                  <TransactionRow
                    icon={t.icon}
                    name={t.merchant}
                    meta={`${t.meta} · ${t.dateLabel}`}
                    amount={t.amount}
                    kind={t.kind === 'transfer' ? 'expense' : t.kind}
                    tag={t.tag}
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className='flex min-w-0 flex-col gap-4'>
          <InsightCard insights={o.insights} />

          <SectionCard title='תשלומים צפויים'>
            <ul className='flex flex-col gap-1'>
              {o.upcoming.map((u) => (
                <li key={u.id} className='flex items-center gap-3 rounded-md px-2 py-2'>
                  <span
                    aria-hidden
                    className='flex size-8 items-center justify-center rounded-full bg-surface-2 text-mut'
                  >
                    <Icon name={u.icon} className='text-[16px]' />
                  </span>
                  <span className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate text-body font-bold text-ink'>{u.name}</span>
                    <span className='text-caption font-semibold text-mut'>{u.dueLabel}</span>
                  </span>
                  <Amount
                    value={u.amount}
                    sign='never'
                    className='text-body font-bold text-ink-2'
                  />
                </li>
              ))}
            </ul>
          </SectionCard>

          {o.reviewCount > 0 && (
            <AlertBanner
              tone='info'
              icon='fact_check'
              title={`${o.reviewCount} תנועות ממתינות לבדיקה`}
              body='סיווג קצר ישמור על התמונה מדויקת.'
              action={
                <Link
                  href={routes.review}
                  className='rounded-md px-2 py-1 text-caption font-bold text-accent-ink underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50'
                >
                  לבדיקה
                </Link>
              }
            />
          )}

          {o.overspentAlerts.length > 0 && (
            <AlertBanner
              tone='error'
              icon='report'
              title='התראות חריגה'
              body={o.overspentAlerts
                .map((a) => `${a.name} · חריגה ${formatMoney(a.amount as Agorot)}`)
                .join('  ·  ')}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
