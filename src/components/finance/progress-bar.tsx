import { cn } from '@/lib/utils';

/**
 * Linear progress (goals, budgets). Over-fill never spills — it stops at 100%
 * and the overage is stated in text by the caller (a11y spec).
 */
export function ProgressBar({
  value,
  max,
  tone = 'accent',
  label,
  className,
}: {
  value: number;
  max: number;
  tone?: 'accent' | 'pos' | 'near' | 'warn';
  /** accessible label, e.g. "התקדמות ליעד דירה: 34%" */
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      role='progressbar'
      aria-valuenow={Math.round(Math.min(value, max))}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          tone === 'accent' && 'bg-primary',
          tone === 'pos' && 'bg-pos',
          tone === 'near' && 'bg-near',
          tone === 'warn' && 'bg-warn',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
