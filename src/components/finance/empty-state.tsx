import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/**
 * Empty state (handoff §5): soft icon + heading + one explaining sentence +
 * CTA. Variants: first-use, filtered-empty, all-clear (positive, celebrates
 * order rather than emptiness).
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  variant = 'first-use',
  className,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  variant?: 'first-use' | 'filtered' | 'all-clear';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-line bg-surface px-6 py-12 text-center shadow-sm',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          variant === 'all-clear' ? 'bg-pos-soft text-pos-ink' : 'bg-surface-2 text-mut',
        )}
      >
        <Icon name={icon} className='text-[28px]' />
      </span>
      <h2 className='text-heading font-bold text-ink'>{title}</h2>
      {body && <p className='max-w-sm text-body text-mut'>{body}</p>}
      {action && <div className='mt-1'>{action}</div>}
    </div>
  );
}
