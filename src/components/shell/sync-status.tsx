import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export type SyncState = 'ok' | 'syncing' | 'error' | 'imported' | 'idle';

const config: Record<SyncState, { icon: string; label: string; className: string }> = {
  ok: { icon: 'check_circle', label: 'מסונכרן', className: 'text-pos-ink bg-pos-soft' },
  syncing: { icon: 'progress_activity', label: 'מסנכרן…', className: 'text-mut bg-surface-2' },
  error: { icon: 'error', label: 'שגיאת סנכרון', className: 'text-warn-ink bg-warn-soft' },
  imported: { icon: 'upload_file', label: 'עודכן מקובץ', className: 'text-pos-ink bg-pos-soft' },
  idle: { icon: 'cloud_off', label: 'טרם יובאו נתונים', className: 'text-mut bg-surface-2' },
};

/** Sync chip: icon + word, never color alone. */
export function SyncStatus({
  state,
  detail,
  className,
}: {
  state: SyncState;
  /** e.g. "לפני 6 ד׳" */
  detail?: string;
  className?: string;
}) {
  const c = config[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
        c.className,
        className,
      )}
      role='status'
    >
      <Icon
        name={c.icon}
        className={cn('text-[16px]', state === 'syncing' && 'animate-spin motion-reduce:animate-none')}
      />
      <span>
        {c.label}
        {detail ? ` · ${detail}` : ''}
      </span>
    </span>
  );
}
