import { cn } from '@/lib/utils';

/**
 * Content container: max 1360px centered on large desktop, logical padding,
 * bottom padding clears the mobile bottom nav.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1360px] px-4 pt-4 pb-24 sm:px-6 sm:pt-6 lg:pb-10',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Standard page header: title + optional meta/actions row. */
export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className='mb-5 flex flex-wrap items-center gap-3'>
      <div className='flex flex-1 flex-col gap-0.5'>
        <h1 className='text-title font-extrabold text-ink'>{title}</h1>
        {meta && <div className='text-caption font-semibold text-mut'>{meta}</div>}
      </div>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
  );
}
