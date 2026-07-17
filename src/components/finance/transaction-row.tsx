'use client';

import type { Agorot } from '@/types/money';
import { Amount } from '@/components/finance/amount';
import { StatusBadge, type StatusTone } from '@/components/finance/status-badge';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type TransactionRowProps = {
  icon: string;
  name: string;
  /** secondary line: "קניות ומזון · היום" or "קטגוריה · חשבון" */
  meta: string;
  /** signed amount: outflow negative, inflow positive */
  amount: Agorot;
  kind: 'expense' | 'income' | 'transfer' | 'refund';
  /** e.g. לבדיקה / תשלום 2 מתוך 12 / העברה */
  tag?: { label: string; tone: StatusTone; icon: string };
  /** desktop table variant shows the date in its own column */
  dateLabel?: string;
  onOpen?: () => void;
  className?: string;
};

/**
 * Transaction row (handoff §5): category icon + name + meta + amount.
 * Income carries an explicit "+" and pos-ink; transfers are neutralized —
 * meaning is never conveyed by color alone.
 */
export function TransactionRow({
  icon,
  name,
  meta,
  amount,
  kind,
  tag,
  dateLabel,
  onOpen,
  className,
}: TransactionRowProps) {
  const inflow = kind === 'income' || kind === 'refund';
  const Comp = onOpen ? 'button' : 'div';
  return (
    <Comp
      {...(onOpen ? { type: 'button' as const, onClick: onOpen } : {})}
      className={cn(
        'flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-2.5 text-start outline-none',
        onOpen &&
          'cursor-pointer transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          inflow && 'bg-pos-soft text-pos-ink',
          kind === 'expense' && (tag?.tone === 'warn' ? 'bg-warn-soft text-warn-ink' : 'bg-surface-2 text-mut'),
          kind === 'transfer' && 'bg-surface-2 text-mut',
        )}
      >
        <Icon name={icon} className='text-[18px]' />
      </span>
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='flex min-w-0 items-center gap-2'>
          <span className='truncate text-body font-bold text-ink' title={name}>
            {name}
          </span>
          {tag && <StatusBadge tone={tag.tone} icon={tag.icon} label={tag.label} size='micro' />}
        </span>
        <span className='truncate text-caption font-semibold text-mut'>{meta}</span>
      </span>
      {dateLabel && (
        <span className='hidden shrink-0 text-caption font-semibold text-mut sm:block'>
          {dateLabel}
        </span>
      )}
      <Amount
        value={amount}
        sign={inflow ? 'always' : 'auto'}
        tone={inflow ? 'positive' : kind === 'transfer' ? 'muted' : 'default'}
        className='shrink-0 text-body font-bold'
      />
    </Comp>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className='flex items-center gap-3 px-2 py-2.5' aria-busy>
      <Skeleton className='size-9 rounded-full' />
      <div className='flex flex-1 flex-col gap-1.5'>
        <Skeleton className='h-3.5 w-32' />
        <Skeleton className='h-3 w-24' />
      </div>
      <Skeleton className='h-4 w-14' />
    </div>
  );
}
