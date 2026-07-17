import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type StatusTone = 'ok' | 'near' | 'warn' | 'sync' | 'future';

const tones: Record<StatusTone, string> = {
  ok: 'bg-pos-soft text-pos-ink',
  near: 'bg-near-soft text-near-ink',
  warn: 'bg-warn-soft text-warn-ink',
  sync: 'bg-surface-2 text-mut',
  future: 'bg-accent text-accent-foreground',
};

/**
 * Status chip — always icon + word, never color alone (a11y spec §7).
 */
export function StatusBadge({
  tone,
  icon,
  label,
  size = 'sm',
  spin = false,
  className,
}: {
  tone: StatusTone;
  icon: string;
  label: string;
  size?: 'micro' | 'sm';
  /** syncing spinner (disabled under reduced motion) */
  spin?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-bold',
        size === 'sm' ? 'px-2 py-0.5 text-caption' : 'px-1.5 py-px text-micro',
        tones[tone],
        className,
      )}
    >
      <Icon
        name={icon}
        className={cn(
          size === 'sm' ? 'text-[14px]' : 'text-[12px]',
          spin && 'animate-spin motion-reduce:animate-none',
        )}
      />
      {label}
    </span>
  );
}

/** Category budget statuses share one mapping across all screens. */
export const categoryStatus = {
  healthy: { tone: 'ok', icon: 'check_circle', label: 'תקין' },
  near: { tone: 'near', icon: 'warning', label: 'קרוב לגבול' },
  over: { tone: 'warn', icon: 'priority_high', label: 'חריגה' },
} as const satisfies Record<string, { tone: StatusTone; icon: string; label: string }>;

export type CategoryStatusKey = keyof typeof categoryStatus;
