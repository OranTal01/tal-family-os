import type { Agorot } from '@/types/money';
import { formatMoney } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

type CashflowBarProps = {
  /** actual spending (solid segment) */
  spent: Agorot;
  /** remaining expected expenses (hatched segment) */
  expected: Agorot;
  /** projected surplus (pos segment); deficit renders as a warn segment */
  surplus: Agorot;
  /** the whole = expected income */
  total: Agorot;
  className?: string;
};

/**
 * Monthly cashflow bar (dashboard): solid = הוצא, hatched = צפוי, pos = עודף.
 * Actual vs expected is distinguished by pattern + label, never color alone.
 * A textual legend accompanies the bar; the bar itself is one img with a
 * complete text alternative.
 */
export function CashflowBar({ spent, expected, surplus, total, className }: CashflowBarProps) {
  const deficit = surplus < 0;
  const safeTotal = Math.max(total, spent + expected + Math.abs(surplus), 1);
  const pct = (v: Agorot) => `${Math.max((Math.abs(v) / safeTotal) * 100, 0)}%`;

  const label = deficit
    ? `תזרים החודש: הוצא ${formatMoney(spent)}, צפוי ${formatMoney(expected)}, גירעון חזוי ${formatMoney(surplus)} מתוך הכנסה של ${formatMoney(total)}`
    : `תזרים החודש: הוצא ${formatMoney(spent)}, צפוי ${formatMoney(expected)}, עודף חזוי ${formatMoney(surplus)} מתוך הכנסה של ${formatMoney(total)}`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role='img'
        aria-label={label}
        className='flex h-3.5 w-full overflow-hidden rounded-full bg-surface-3'
      >
        <span className='h-full bg-accent-ink/80' style={{ width: pct(spent) }} />
        <span
          className='h-full'
          style={{
            width: pct(expected),
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--accent-brand) 0 4px, var(--accent-soft) 4px 9px)',
          }}
        />
        <span
          className={cn('h-full', deficit ? 'bg-warn' : 'bg-pos')}
          style={{ width: pct(surplus) }}
        />
      </div>
      <dl className='flex flex-wrap items-center gap-x-4 gap-y-1 text-caption font-semibold text-mut'>
        <div className='flex items-center gap-1.5'>
          <span aria-hidden className='size-2.5 rounded-full bg-accent-ink/80' />
          <dt>הוצא</dt>
          <dd className='font-bold text-ink'>{formatMoney(spent)}</dd>
        </div>
        <div className='flex items-center gap-1.5'>
          <span
            aria-hidden
            className='size-2.5 rounded-full'
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--accent-brand) 0 2px, var(--accent-soft) 2px 4px)',
            }}
          />
          <dt>צפוי</dt>
          <dd className='font-bold text-ink'>{formatMoney(expected)}</dd>
        </div>
        <div className='flex items-center gap-1.5'>
          <span aria-hidden className={cn('size-2.5 rounded-full', deficit ? 'bg-warn' : 'bg-pos')} />
          <dt>{deficit ? 'גירעון' : 'עודף'}</dt>
          <dd className={cn('font-bold', deficit ? 'text-warn-ink' : 'text-pos-ink')}>
            {formatMoney(surplus)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
