import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { EmptyState } from '@/components/finance/empty-state';
import { KpiCard } from '@/components/finance/kpi-card';
import { SectionCard } from '@/components/finance/section-card';
import { TransactionRow } from '@/components/finance/transaction-row';
import { Icon } from '@/components/ui/icon';
import { formatMoney } from '@/lib/format/currency';
import { formatMonth } from '@/lib/format/date';
import { getBusinessScreen, resolveMonth } from '@/server/data/views';

export const metadata: Metadata = { title: 'מבט עסק דניאל' };

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = resolveMonth(rawMonth);
  const b = await getBusinessScreen(month);

  return (
    <PageContainer>
      <PageHeader
        title={`מבט עסק דניאל · ${formatMonth(month)}`}
        meta='עוסק מורשה · הנתונים מופרדים לחלוטין מכספי הבית'
      />

      <div className='mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard label='הכנסות' value={b.revenue} />
        <KpiCard label='הוצאות עסקיות' value={b.expenses} />
        <KpiCard label='רווח לפני מס' value={b.profit} variant='positive' />
        <KpiCard
          label='מע״מ לתשלום (משוער)'
          value={b.vatDue}
          hint='אזור מידע בלבד — לא דיווח רשמי'
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <SectionCard title='תנועות עסקיות'>
          {b.transactions.length === 0 ? (
            <EmptyState
              icon='storefront'
              title='עדיין אין תנועות עסקיות'
              body='סמנו תנועה כ"עסק" מתוך פירוט התנועה — והיא תופיע כאן בלבד.'
            />
          ) : (
            <ul className='divide-y divide-line'>
              {b.transactions.map((t) => (
                <li key={t.id}>
                  <TransactionRow
                    icon={t.icon}
                    name={t.merchant}
                    meta={`${t.meta} · ${t.accountName}`}
                    amount={t.amount}
                    kind={t.kind === 'transfer' ? 'expense' : t.kind}
                    dateLabel={t.dateLabel}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className='flex flex-col gap-4'>
          <section className='flex flex-col gap-3 rounded-lg border border-near/30 bg-near-soft p-4 shadow-sm'>
            <h2 className='flex items-center gap-2 text-subhead font-bold text-near-ink'>
              <Icon name='receipt' className='text-[18px]' />
              לוח מע״מ
            </h2>
            <div className='flex items-baseline justify-between'>
              <span className='text-caption font-semibold text-near-ink/80'>מע״מ משוער לתקופה</span>
              <Amount value={b.vatDue} sign='never' className='text-title font-extrabold text-near-ink' />
            </div>
            <p className='flex items-center gap-2 text-caption font-bold text-near-ink'>
              <Icon name='event' className='text-[16px]' />
              דיווח הבא · {b.nextReportLabel}
            </p>
            <p className='text-caption font-semibold text-near-ink/80'>
              חישוב אינפורמטיבי לפי 18% — הדיווח בפועל נעשה מול רואה החשבון.
            </p>
          </section>

          {b.uncertainIncome > 0 && (
            <SectionCard title='הכנסות צפויות (לא ודאיות)'>
              <p className='text-body text-ink-2'>
                שיתופי פעולה בהמתנה בהיקף של כ־{formatMoney(b.uncertainIncome)}. הכנסה לא
                ודאית אינה נספרת בתחזיות עד לקבלתה.
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
