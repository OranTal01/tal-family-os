import type { Agorot } from '@/types/money';
import { formatMoney, type FormatMoneyOptions } from '@/lib/format/currency';
import { cn } from '@/lib/utils';

type AmountProps = FormatMoneyOptions & {
  value: Agorot;
  /**
   * Visual tone. Positive amounts (income/surplus) use pos-ink; overspend uses
   * warn-ink. Default: regular ink. Meaning is always also conveyed by
   * sign/label per the a11y spec — never by this color alone.
   */
  tone?: 'default' | 'positive' | 'negative' | 'muted';
  className?: string;
};

/** Monetary value: LTR-embedded, tabular numerals, centralized formatting. */
export function Amount({ value, tone = 'default', className, ...format }: AmountProps) {
  return (
    <span
      className={cn(
        'ltr-embed tabular-amounts whitespace-nowrap',
        tone === 'positive' && 'text-pos-ink',
        tone === 'negative' && 'text-warn-ink',
        tone === 'muted' && 'text-mut',
        className,
      )}
    >
      {formatMoney(value, format)}
    </span>
  );
}
