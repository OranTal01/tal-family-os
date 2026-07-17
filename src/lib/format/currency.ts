import type { Agorot } from '@/types/money';

/**
 * Single source of truth for currency display (see PRODUCT_SPEC §7):
 * - prefix ₪ attached to the number: ₪12,450
 * - comma thousands, en-US grouping
 * - whole shekels by default; agorot only in transaction detail
 * - true minus U+2212, plus sign only when explicitly requested
 * - values ≥ ₪1M abbreviated to ₪2.42M (unless exact requested)
 * - output is plain text; wrap in `ltr-embed` styling context when inside RTL prose
 */

const MINUS = '−';

export type FormatMoneyOptions = {
  /** 'auto' (default): minus only · 'always': force +/− · 'never': absolute value */
  sign?: 'auto' | 'always' | 'never';
  /** include agorot (transaction detail only) */
  withAgorot?: boolean;
  /** abbreviate ≥ 1M to ₪X.XXM (default true for display surfaces that opt in) */
  abbreviate?: boolean;
};

export function formatMoney(amount: Agorot, options: FormatMoneyOptions = {}): string {
  const { sign = 'auto', withAgorot = false, abbreviate = false } = options;
  const negative = amount < 0;
  const abs = Math.abs(amount);

  let body: string;
  if (abbreviate && abs >= 100_000_000) {
    // ≥ ₪1,000,000 → ₪2.42M
    body = `${trimZeros((abs / 100_000_000).toFixed(2))}M`;
  } else if (abbreviate && abs >= 10_000_000) {
    // ≥ ₪100,000 → ₪820K
    body = `${trimZeros((abs / 100_000).toFixed(0))}K`;
  } else if (withAgorot) {
    const shekels = Math.floor(abs / 100);
    const rest = abs % 100;
    body = `${shekels.toLocaleString('en-US')}.${rest.toString().padStart(2, '0')}`;
  } else {
    body = Math.round(abs / 100).toLocaleString('en-US');
  }

  const prefix =
    sign === 'never' ? '' : negative ? MINUS : sign === 'always' ? '+' : '';
  return `${prefix}₪${body}`;
}

function trimZeros(s: string): string {
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** "54%" — utilization display */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** "₪18,400 / ₪34,000" — spent-of-budget ranges */
export function formatMoneyRange(spent: Agorot, budget: Agorot): string {
  return `${formatMoney(spent, { sign: 'never' })} / ${formatMoney(budget, { sign: 'never' })}`;
}
