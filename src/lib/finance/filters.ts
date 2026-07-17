import type { Context, Transaction } from '@/types/domain';
import { monthKeyOf, type MonthKey } from '@/lib/format/date';

/** Internal transfers are never income or expense (core rule). */
export function isInternalTransfer(txn: Transaction): boolean {
  return txn.kind === 'transfer';
}

export function inMonth(txn: Transaction, month: MonthKey): boolean {
  return monthKeyOf(txn.date) === month;
}

export function inContext(txn: Transaction, context: Context): boolean {
  return txn.context === context;
}

/** Cash-movement rows that count toward income/spending aggregates. */
export function countableTransactions(
  txns: Transaction[],
  month: MonthKey,
  context?: Context,
): Transaction[] {
  return txns.filter(
    (t) =>
      inMonth(t, month) &&
      !isInternalTransfer(t) &&
      (context === undefined || t.context === context),
  );
}
