import Link from 'next/link';
import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Amount } from '@/components/finance/amount';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { formatMonth } from '@/lib/format/date';
import { routes } from '@/lib/routes';
import { getSplitScreen, resolveMonth } from '@/server/data/views';
import type { Agorot } from '@/types/money';

export const metadata: Metadata = { title: 'בית מול עסק' };

export default async function SplitPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month = resolveMonth(rawMonth);
  const s = await getSplitScreen(month);
  const surplus = s.household.balance >= 0;

  return (
    <PageContainer>
      <PageHeader title={`בית מול עסק · ${formatMonth(month)}`} />

      <div className='grid gap-4 lg:grid-cols-2'>
        <section
          aria-label='משק בית'
          className='flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-md'
        >
          <header className='flex items-center gap-2'>
            <span className='flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground'>
              <Icon name='home' className='text-[20px]' />
            </span>
            <h2 className='flex-1 text-heading font-bold text-ink'>משק בית</h2>
            <span className='rounded-full bg-accent px-2.5 py-1 text-micro font-bold text-accent-foreground'>
              ראשי
            </span>
          </header>
          <dl className='grid grid-cols-3 gap-3'>
            <SplitStat label='הכנסה' value={s.household.income} />
            <SplitStat label='הוצאות' value={s.household.expenses} />
            <div className='rounded-md bg-surface-2 p-3'>
              <dt className='text-caption font-semibold text-mut'>מאזן</dt>
              <dd className='flex items-center gap-1'>
                <Icon
                  name={surplus ? 'arrow_upward' : 'arrow_downward'}
                  className={surplus ? 'text-[16px] text-pos-ink' : 'text-[16px] text-warn-ink'}
                />
                <Amount
                  value={s.household.balance}
                  sign='always'
                  tone={surplus ? 'positive' : 'negative'}
                  className='text-subhead font-extrabold'
                />
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-label='העסק של דניאל'
          className='flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm'
        >
          <header className='flex items-center gap-2'>
            <span className='flex size-9 items-center justify-center rounded-lg bg-surface-2 text-mut'>
              <Icon name='storefront' className='text-[20px]' />
            </span>
            <h2 className='flex-1 text-heading font-bold text-ink'>העסק (עוסק מורשה)</h2>
            <span className='rounded-full bg-surface-2 px-2.5 py-1 text-micro font-bold text-mut'>
              בנפרד
            </span>
          </header>
          <dl className='grid grid-cols-3 gap-3'>
            <SplitStat label='הכנסות' value={s.business.revenue} />
            <SplitStat label='הוצאות' value={s.business.expenses} />
            <SplitStat label='רווח' value={s.business.profit} positive />
          </dl>
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-md bg-near-soft px-3 py-2.5'>
            <span className='flex items-center gap-2 text-caption font-bold text-near-ink'>
              <Icon name='receipt' className='text-[16px]' />
              מע״מ לתשלום (משוער)
            </span>
            <Amount value={s.business.vatDue} sign='never' className='text-body font-extrabold text-near-ink' />
          </div>
          <p className='flex items-center gap-2 text-caption font-semibold text-mut'>
            <Icon name='event' className='text-[16px]' />
            דיווח מע״מ הבא · {s.business.nextReportLabel}
          </p>
          <Button nativeButton={false} render={<Link href={routes.business} />} variant='outline'>
            מעבר למבט עסק דניאל
            <Icon name='arrow_back' className='text-[16px] rtl:-scale-x-100' />
          </Button>
        </section>
      </div>

      <AlertBanner
        tone='info'
        className='mt-4'
        title='ההפרדה נשמרת תמיד'
        body='הכנסות והוצאות העסק אינן נכללות בתקציב, במאזן או ביתרה החזויה של משק הבית. שווי נטו כולל את שניהם במסך "נכסים וחיסכון".'
      />
    </PageContainer>
  );
}

function SplitStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: Agorot;
  positive?: boolean;
}) {
  return (
    <div className='rounded-md bg-surface-2 p-3'>
      <dt className='text-caption font-semibold text-mut'>{label}</dt>
      <dd>
        <Amount
          value={value}
          sign='never'
          className={
            positive
              ? 'text-subhead font-extrabold text-pos-ink'
              : 'text-subhead font-extrabold text-ink'
          }
        />
      </dd>
    </div>
  );
}
