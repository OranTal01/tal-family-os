'use client';

import * as React from 'react';
import type { GoalView } from '@/server/data/views';
import { Amount } from '@/components/finance/amount';
import { ProgressBar } from '@/components/finance/progress-bar';
import { DepositButton } from '@/features/goals/deposit-button';
import { Icon } from '@/components/ui/icon';
import { formatMoney, formatPercent } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

type KidEntry = { kid: { id: string; name: string }; goal: GoalView | null };

/**
 * Kids savings (design screen 11): two side-by-side tracks on desktop,
 * a segmented child selector showing one card on mobile.
 */
export function KidsView({ entries }: { entries: KidEntry[] }) {
  const [activeId, setActiveId] = React.useState(entries[0]?.kid.id);

  return (
    <>
      <div
        role='radiogroup'
        aria-label='בחירת ילד'
        className='mb-4 inline-flex rounded-lg bg-surface-2 p-1 lg:hidden'
      >
        {entries.map((e) => {
          const active = e.kid.id === activeId;
          return (
            <button
              key={e.kid.id}
              type='button'
              role='radio'
              aria-checked={active}
              onClick={() => setActiveId(e.kid.id)}
              className={cn(
                'min-h-10 rounded-md px-5 text-body font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                active ? 'bg-surface text-ink shadow-sm' : 'text-mut hover:text-ink-2',
              )}
            >
              {e.kid.name}
            </button>
          );
        })}
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {entries.map((entry) => (
          <KidCard
            key={entry.kid.id}
            entry={entry}
            className={cn(entry.kid.id !== activeId && 'hidden lg:flex')}
          />
        ))}
      </div>
    </>
  );
}

function KidCard({ entry, className }: { entry: KidEntry; className?: string }) {
  const { kid, goal } = entry;
  if (!goal) {
    return (
      <section
        aria-label={`חיסכון ${kid.name}`}
        className={cn(
          'flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center shadow-sm',
          className,
        )}
      >
        <Icon name='savings' className='text-[28px] text-mut' />
        <h2 className='text-heading font-bold text-ink'>עדיין לא נפתח חיסכון ל{kid.name}</h2>
        <p className='text-body text-mut'>פתיחה בהקשה אחת — נגדיר יעד והפקדה חודשית.</p>
      </section>
    );
  }

  return (
    <section
      aria-label={`חיסכון ${kid.name}`}
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm',
        className,
      )}
    >
      <header className='flex items-center gap-3'>
        <span
          aria-hidden
          className='flex size-11 items-center justify-center rounded-full bg-accent text-subhead font-extrabold text-accent-ink'
        >
          {kid.name.slice(0, 1)}
        </span>
        <div className='flex flex-1 flex-col'>
          <h2 className='text-heading font-bold text-ink'>חיסכון {kid.name}</h2>
          <span className='text-caption font-semibold text-mut'>{goal.forecastLabel}</span>
        </div>
        <span className='rounded-full bg-pos-soft px-2 py-0.5 text-caption font-bold text-pos-ink'>
          {formatPercent(goal.utilization / 100)}
        </span>
      </header>

      <div className='flex flex-col gap-1 rounded-md bg-surface-2 p-4'>
        <span className='text-caption font-semibold text-mut'>יתרה וצבירה</span>
        <Amount value={goal.current} className='text-display font-extrabold text-ink' />
        <span className='text-caption font-semibold text-mut'>
          יעד {formatMoney(goal.target)} · הפקדה חודשית {formatMoney(goal.monthlyDeposit)}
        </span>
      </div>

      <ProgressBar
        value={goal.current}
        max={goal.target}
        tone='pos'
        label={`התקדמות חיסכון ${kid.name}: ${formatPercent(goal.utilization / 100)}`}
      />

      <div>
        <h3 className='mb-1 text-caption font-bold text-mut'>הפקדות אחרונות</h3>
        <ul className='divide-y divide-line'>
          {goal.contributions.slice(0, 4).map((c) => (
            <li key={c.id} className='flex items-center gap-3 py-2'>
              <Icon name='add_circle' className='text-[18px] text-pos-ink' />
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-body font-bold text-ink'>{c.label}</span>
                <span className='text-caption font-semibold text-mut'>{c.dateLabel}</span>
              </span>
              <Amount value={c.amount} sign='always' tone='positive' className='text-body font-bold' />
            </li>
          ))}
        </ul>
      </div>

      <div className='flex justify-end'>
        <DepositButton goalName={`חיסכון ${kid.name}`} />
      </div>
    </section>
  );
}
