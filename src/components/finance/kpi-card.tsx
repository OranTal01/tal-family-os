import type { Agorot } from '@/types/money';
import { Amount } from '@/components/finance/amount';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: Agorot;
  /** force a +/− sign on the value */
  signed?: boolean;
  /**
   * default: plain card · positive: pos-soft emphasis (surplus) ·
   * future: dashed border, expected amounts · emphasis: accent-soft (projected)
   */
  variant?: 'default' | 'positive' | 'future' | 'emphasis';
  /** delta/annotation line: icon + text, e.g. arrow_upward "עודף ₪5,600" */
  delta?: { icon: string; text: string; tone?: 'positive' | 'negative' | 'muted' };
  /** small caption under the value, e.g. "מתוך ₪39,600" */
  hint?: string;
};

/**
 * KPI card (handoff §5): label + large value + optional delta/hint.
 * "Future" values are visually distinct (dashed border + צפוי semantics from label).
 */
export function KpiCard({ label, value, signed, variant = 'default', delta, hint }: KpiCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border p-4 shadow-sm',
        variant === 'default' && 'border-line bg-surface',
        variant === 'positive' && 'border-pos/25 bg-pos-soft',
        variant === 'future' && 'border-dashed border-mut/40 bg-surface',
        variant === 'emphasis' && 'border-line bg-accent',
      )}
    >
      <span
        className={cn(
          'truncate text-caption font-semibold',
          variant === 'emphasis' ? 'text-accent-foreground' : 'text-mut',
        )}
      >
        {label}
      </span>
      <Amount
        value={value}
        sign={signed ? 'always' : 'auto'}
        className={cn(
          'text-display font-extrabold',
          variant === 'positive' && 'text-pos-ink',
          variant === 'emphasis' && 'text-accent-foreground',
          variant === 'future' && 'text-ink-2',
          variant === 'default' && 'text-ink',
        )}
      />
      {delta && (
        <span
          className={cn(
            'flex items-center gap-1 text-caption font-bold',
            delta.tone === 'positive' && 'text-pos-ink',
            delta.tone === 'negative' && 'text-warn-ink',
            (delta.tone ?? 'muted') === 'muted' && 'text-mut',
          )}
        >
          <Icon name={delta.icon} className='text-[14px]' />
          {delta.text}
        </span>
      )}
      {hint && <span className='truncate text-caption font-semibold text-mut'>{hint}</span>}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className='flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-sm' aria-busy>
      <Skeleton className='h-3.5 w-20' />
      <Skeleton className='h-8 w-28' />
      <Skeleton className='h-3.5 w-16' />
    </div>
  );
}
