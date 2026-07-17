'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import {
  currentMonthKey,
  formatMonth,
  isValidMonthKey,
  shiftMonth,
  type MonthKey,
} from '@/lib/format/date';

/**
 * Month stepper. RTL time direction: previous month = the chevron pointing
 * right (start side), next month = pointing left (end side).
 * State lives in the URL (?month=YYYY-MM) so views are deep-linkable.
 */
export function MonthSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get('month');
  const month: MonthKey = isValidMonthKey(raw) ? raw : currentMonthKey();
  // future months stay reachable — planning views label them "תכנון"
  const maxMonth = shiftMonth(currentMonthKey(), 12);

  function go(delta: number) {
    const next = shiftMonth(month, delta);
    const params = new URLSearchParams(searchParams);
    if (next === currentMonthKey()) params.delete('month');
    else params.set('month', next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className='flex items-center gap-1' role='group' aria-label='בחירת חודש'>
      <button
        type='button'
        onClick={() => go(-1)}
        aria-label='חודש קודם'
        className='flex size-8 items-center justify-center rounded-md text-mut outline-none transition-colors hover:bg-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50'
      >
        <Icon name='chevron_right' className='text-[20px]' />
      </button>
      <span
        className='min-w-24 text-center text-subhead font-bold text-ink tabular-amounts'
        aria-live='polite'
      >
        {formatMonth(month)}
      </span>
      <button
        type='button'
        onClick={() => go(1)}
        aria-label='חודש הבא'
        disabled={month >= maxMonth}
        className='flex size-8 items-center justify-center rounded-md text-mut outline-none transition-colors hover:bg-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40'
      >
        <Icon name='chevron_left' className='text-[20px]' />
      </button>
    </div>
  );
}
