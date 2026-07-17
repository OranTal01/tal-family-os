import { cn } from '@/lib/utils';

/**
 * Standard content card with heading row + optional end-side action
 * (e.g. "הכול" link). The design's base surface: lg radius, line border,
 * sm/md shadow.
 */
export function SectionCard({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface p-4 shadow-sm', className)}>
      {(title || action) && (
        <div className='mb-3 flex items-center justify-between gap-3'>
          {title && <h2 className='text-subhead font-bold text-ink'>{title}</h2>}
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
