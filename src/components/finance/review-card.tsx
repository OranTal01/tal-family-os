'use client';

import type { Agorot } from '@/types/money';
import { Amount } from '@/components/finance/amount';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type ReviewCardProps = {
  icon: string;
  name: string;
  /** e.g. "ויזה ••21 · 12 ביולי" */
  note: string;
  /** the single clear reason: "סוחר לא זוהה" */
  reason: string;
  amount: Agorot;
  /** primary action label: "שיוך קטגוריה" / "זיהוי" / "סיווג" / "בדיקה" */
  actionLabel: string;
  onAction: () => void;
  onApprove: () => void;
  resolving?: boolean;
  className?: string;
};

/**
 * Review-queue card (handoff §5): one reason + one primary action + "תקין".
 * Mobile: full-width primary action.
 */
export function ReviewCard({
  icon,
  name,
  note,
  reason,
  amount,
  actionLabel,
  onAction,
  onApprove,
  resolving = false,
  className,
}: ReviewCardProps) {
  return (
    <article
      aria-label={`${name}, ${reason}`}
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center',
        resolving && 'opacity-60',
        className,
      )}
    >
      <span
        aria-hidden
        className='flex size-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn-ink'
      >
        <Icon name={icon} className='text-[20px]' />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='flex flex-wrap items-center gap-2'>
          <span className='truncate text-body font-bold text-ink' title={name}>
            {name}
          </span>
          <Amount value={amount} sign='never' className='text-body font-bold text-ink sm:hidden' />
        </span>
        <span className='truncate text-caption font-semibold text-mut'>{note}</span>
        <span className='flex items-center gap-1.5 text-caption font-bold text-warn-ink'>
          <Icon name='flag' className='text-[14px]' />
          {reason}
        </span>
      </div>
      <Amount
        value={amount}
        sign='never'
        className='hidden shrink-0 text-subhead font-bold text-ink sm:block'
      />
      <div className='flex shrink-0 gap-2'>
        <Button
          variant='outline'
          size='lg'
          onClick={onApprove}
          disabled={resolving}
          className='flex-1 sm:flex-none'
        >
          תקין
        </Button>
        <Button size='lg' onClick={onAction} disabled={resolving} className='flex-1 sm:flex-none'>
          {actionLabel}
        </Button>
      </div>
    </article>
  );
}
