import { cn } from '@/lib/utils';

type IconProps = {
  /** Material Symbols Rounded icon name, e.g. "space_dashboard" */
  name: string;
  /**
   * Accessible label. Omit (default) for decorative icons — they are
   * aria-hidden per the design a11y spec.
   */
  label?: string;
  /** Filled variant (active nav items, emphasized states) */
  filled?: boolean;
  /** Font size utility; defaults to inherit via `size-*`/`text-*` on className */
  className?: string;
};

export function Icon({ name, label, filled, className }: IconProps) {
  return (
    <span
      className={cn(
        'material-symbols-rounded inline-block text-[1.25em]',
        filled && 'icon-filled',
        className,
      )}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
