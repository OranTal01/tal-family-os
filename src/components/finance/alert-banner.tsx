import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'warning' | 'error' | 'success';

const tones: Record<Tone, { icon: string; className: string; iconClass: string }> = {
  info: { icon: 'info', className: 'border-line bg-accent text-accent-foreground', iconClass: 'text-accent-ink' },
  warning: { icon: 'warning', className: 'border-near/30 bg-near-soft text-near-ink', iconClass: 'text-near-ink' },
  error: { icon: 'error', className: 'border-warn/30 bg-warn-soft text-warn-ink', iconClass: 'text-warn-ink' },
  success: { icon: 'check_circle', className: 'border-pos/30 bg-pos-soft text-pos-ink', iconClass: 'text-pos-ink' },
};

/**
 * Section/screen-level alert (handoff §5): icon + title + body + optional
 * action. Explains what to do, not only what happened; calm tone.
 */
export function AlertBanner({
  tone,
  title,
  body,
  action,
  icon,
  className,
}: {
  tone: Tone;
  title: string;
  body?: string;
  action?: React.ReactNode;
  /** override the default tone icon */
  icon?: string;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border p-3.5 shadow-sm', t.className, className)}
    >
      <Icon name={icon ?? t.icon} className={cn('mt-0.5 text-[20px]', t.iconClass)} />
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='text-body font-bold'>{title}</span>
        {body && <span className='text-caption font-semibold opacity-90'>{body}</span>}
      </div>
      {action && <div className='shrink-0'>{action}</div>}
    </div>
  );
}
