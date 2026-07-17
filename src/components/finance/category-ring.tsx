'use client';

import type { Agorot } from '@/types/money';
import { Amount } from '@/components/finance/amount';
import { categoryStatus, type CategoryStatusKey } from '@/components/finance/status-badge';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

const sizes = {
  sm: { box: 84, stroke: 7, amount: 'text-caption' },
  md: { box: 96, stroke: 8, amount: 'text-subhead' },
  lg: { box: 108, stroke: 8, amount: 'text-subhead' },
} as const;

const ringColor: Record<CategoryStatusKey, string> = {
  healthy: 'stroke-pos',
  near: 'stroke-near',
  over: 'stroke-warn',
};

export type CategoryRingProps = {
  /** category icon (Material Symbols name) */
  icon: string;
  /** short display name, e.g. "קניות" */
  name: string;
  /** utilization 0..∞ as percent (ring caps visually at 100) */
  utilization: number;
  status: CategoryStatusKey;
  /** remaining amount (positive) or overspend amount (positive) when over */
  centerAmount: Agorot;
  size?: keyof typeof sizes;
  /** hide the status chip (compact mobile grids show icon-only status) */
  compactStatus?: boolean;
  onOpen?: () => void;
  className?: string;
};

/**
 * Category budget ring (handoff §5). SVG with pathLength=100, mirrored with
 * -scale-x-100 so progress runs in the RTL direction. Ring stops at 100% on
 * overspend — the exact amount is conveyed in text. Full textual aria-label.
 */
export function CategoryRing({
  icon,
  name,
  utilization,
  status,
  centerAmount,
  size = 'md',
  compactStatus = false,
  onOpen,
  className,
}: CategoryRingProps) {
  const s = sizes[size];
  const st = categoryStatus[status];
  const shown = Math.min(Math.round(utilization), 100);
  const over = status === 'over';
  const centerLabel = over ? 'חריגה' : 'נותרו';
  const ariaLabel = `${name}, נוצל ${Math.round(utilization)} אחוז, ${centerLabel} ${formatMoney(
    centerAmount,
    { sign: 'never' },
  )}, ${st.label}`;

  const body = (
    <>
      <span className='relative inline-flex' style={{ width: s.box, height: s.box }}>
        <svg
          viewBox='0 0 100 100'
          className='size-full -scale-x-100'
          aria-hidden
          focusable='false'
        >
          <circle
            cx='50'
            cy='50'
            r='44'
            fill='none'
            strokeWidth={s.stroke}
            className='stroke-surface-3'
          />
          <circle
            cx='50'
            cy='50'
            r='44'
            fill='none'
            strokeWidth={s.stroke}
            strokeLinecap='round'
            pathLength={100}
            strokeDasharray={`${shown} 100`}
            transform='rotate(-90 50 50)'
            className={cn('transition-[stroke-dasharray] duration-300', ringColor[status])}
          />
        </svg>
        <span className='absolute inset-0 flex flex-col items-center justify-center gap-0.5'>
          <Icon name={icon} className='text-[16px] text-mut' />
          <Amount
            value={centerAmount}
            sign='never'
            className={cn('font-extrabold text-ink', s.amount, over && 'before:content-["−"]')}
          />
          <span className='text-micro font-semibold text-mut'>{centerLabel}</span>
        </span>
      </span>
      <span className='max-w-full truncate text-caption font-bold text-ink-2'>{name}</span>
      <span
        className={cn(
          'flex items-center gap-1 text-micro font-bold',
          st.tone === 'ok' && 'text-pos-ink',
          st.tone === 'near' && 'text-near-ink',
          st.tone === 'warn' && 'text-warn-ink',
        )}
      >
        <Icon name={st.icon} className='text-[13px]' />
        {!compactStatus && st.label}
      </span>
    </>
  );

  const baseClass = cn(
    'flex min-w-0 flex-col items-center gap-1 rounded-lg p-2 outline-none',
    onOpen &&
      'cursor-pointer transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
    className,
  );

  if (!onOpen) {
    // decorative composition still exposes the full text to screen readers
    return (
      <span className={baseClass} role='img' aria-label={ariaLabel}>
        {body}
      </span>
    );
  }
  return (
    <button type='button' onClick={onOpen} aria-label={ariaLabel} className={baseClass}>
      {body}
    </button>
  );
}

export function CategoryRingSkeleton({ size = 'md' }: { size?: keyof typeof sizes }) {
  const s = sizes[size];
  return (
    <div className='flex flex-col items-center gap-2 p-2' aria-busy>
      <Skeleton className='rounded-full' style={{ width: s.box, height: s.box }} />
      <Skeleton className='h-3 w-14' />
    </div>
  );
}
