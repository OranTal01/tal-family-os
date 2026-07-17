import type { Context, ExpectedTransaction, Transaction } from '@/types/domain';
import type { MonthKey } from '@/lib/format/date';
import { agorot, type Agorot } from '@/types/money';
import { countableTransactions } from '@/lib/finance/filters';

/**
 * Spending rules:
 * - expenses are negative amounts; spending is reported as a positive number
 * - refunds (positive, kind=refund) reduce spending in their own month
 * - internal transfers never count
 * - installment rows are the monthly charges, so a month naturally contains
 *   only its own installment portion
 * - business spending never mixes into household totals
 */

/** Positive total spent in the month for a context (refunds credited). */
export function actualSpending(
  txns: Transaction[],
  month: MonthKey,
  context: Context = 'household',
): Agorot {
  const outflows = countableTransactions(txns, month, context).filter(
    (t) => t.kind === 'expense' || t.kind === 'refund',
  );
  const net = outflows.reduce((sum, t) => sum + t.amount, 0);
  // net is negative (expenses dominate); spending is its magnitude
  return agorot(-net);
}

/** Positive spending attributed to one category in the month. */
export function categorySpending(
  txns: Transaction[],
  month: MonthKey,
  categoryId: string,
): Agorot {
  const net = countableTransactions(txns, month)
    .filter((t) => t.categoryId === categoryId && (t.kind === 'expense' || t.kind === 'refund'))
    .reduce((sum, t) => sum + t.amount, 0);
  return agorot(-net);
}

/** Remaining expected (unfulfilled) outflows for the month, positive. */
export function remainingExpectedSpending(
  expected: ExpectedTransaction[],
  month: MonthKey,
  context: Context = 'household',
): Agorot {
  return agorot(
    expected
      .filter(
        (e) =>
          e.month === month &&
          e.direction === 'outflow' &&
          e.context === context &&
          !e.fulfilled,
      )
      .reduce((sum, e) => sum + e.amount, 0),
  );
}

/** Spent by a specific person (owner) in the month — daily summary needs this. */
export function spendingByOwner(
  txns: Transaction[],
  month: MonthKey,
  ownerId: string,
  context: Context = 'household',
): Agorot {
  const net = countableTransactions(txns, month, context)
    .filter((t) => t.ownerId === ownerId && (t.kind === 'expense' || t.kind === 'refund'))
    .reduce((sum, t) => sum + t.amount, 0);
  return agorot(-net);
}
