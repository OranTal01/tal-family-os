import type { Metadata } from 'next';
import { PageContainer, PageHeader } from '@/components/shell/page-container';
import { Amount } from '@/components/finance/amount';
import { ProgressBar } from '@/components/finance/progress-bar';
import { Icon } from '@/components/ui/icon';
import { DepositButton } from '@/features/goals/deposit-button';
import { formatMoney, formatPercent } from '@/lib/format/currency';
import { getGoalsScreen } from '@/server/data/views';

export const metadata: Metadata = { title: 'יעדים פיננסיים' };

export default async function GoalsPage() {
  const goals = await getGoalsScreen();

  return (
    <PageContainer>
      <PageHeader
        title='יעדים פיננסיים'
        meta='מעקב התקדמות, קצב הפקדות ותחזית מועד לכל יעד'
      />

      <ul className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {goals.map((g) => {
          const pct = g.utilization / 100;
          return (
            <li
              key={g.id}
              className='flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-sm'
            >
              <header className='flex items-center gap-3'>
                <span
                  aria-hidden
                  className='flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink'
                >
                  <Icon name={g.icon} className='text-[20px]' />
                </span>
                <div className='flex min-w-0 flex-1 flex-col'>
                  <h2 className='truncate text-subhead font-bold text-ink'>{g.name}</h2>
                  {g.forecastLabel && (
                    <span className='text-caption font-semibold text-mut'>{g.forecastLabel}</span>
                  )}
                </div>
                <span className='rounded-full bg-pos-soft px-2 py-0.5 text-caption font-bold text-pos-ink'>
                  {formatPercent(pct)}
                </span>
              </header>

              <div className='flex items-baseline justify-between gap-2'>
                <Amount value={g.current} className='text-title font-extrabold text-ink' />
                <span className='text-caption font-semibold text-mut'>
                  מתוך {formatMoney(g.target)}
                </span>
              </div>

              <ProgressBar
                value={g.current}
                max={g.target}
                tone='pos'
                label={`התקדמות ל${g.name}: ${formatPercent(pct)}`}
              />

              <div className='flex items-center justify-between'>
                <span className='text-caption font-semibold text-mut'>
                  הפקדה חודשית · {formatMoney(g.monthlyDeposit)}
                </span>
                <DepositButton goalName={g.name} />
              </div>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
}
