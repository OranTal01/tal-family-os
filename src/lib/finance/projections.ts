import type { Account, ExpectedTransaction, Transaction } from '@/types/domain';
import type { MonthKey } from '@/lib/format/date';
import { agorot, type Agorot } from '@/types/money';
import {
  expectedGuaranteedIncome,
  remainingGuaranteedIncome,
} from '@/lib/finance/income';
import { actualSpending, remainingExpectedSpending } from '@/lib/finance/spending';

/**
 * Projections (glossary):
 * - יתרה חזויה = current liquid balance + remaining guaranteed income
 *   − remaining expected expenses. A forecast, always labeled as such.
 * - מאזן החודש = expected income − (actual spending + remaining expected).
 * Uncertain income is never part of either.
 */

/** Liquid family cash now: bank + wallets + cash (not investments/pensions). */
export function currentLiquidBalance(accounts: Account[]): Agorot {
  return agorot(
    accounts
      .filter((a) => (a.type === 'bank' || a.type === 'wallet' || a.type === 'cash') && a.context === 'household')
      .reduce((sum, a) => sum + (a.balance ?? 0), 0),
  );
}

export function projectedEndOfMonth(
  accounts: Account[],
  expected: ExpectedTransaction[],
  month: MonthKey,
): Agorot {
  const current = currentLiquidBalance(accounts);
  const incomeRemaining = remainingGuaranteedIncome(expected, month);
  const expensesRemaining = remainingExpectedSpending(expected, month);
  return agorot(current + incomeRemaining - expensesRemaining);
}

/** Surplus (positive) or deficit (negative) for the month. */
export function monthBalance(
  txns: Transaction[],
  expected: ExpectedTransaction[],
  month: MonthKey,
): Agorot {
  const income = expectedGuaranteedIncome(expected, month);
  const spent = actualSpending(txns, month, 'household');
  const remaining = remainingExpectedSpending(expected, month);
  return agorot(income - spent - remaining);
}

/** Total expected spending for the month = already spent + still expected. */
export function totalExpectedSpending(
  txns: Transaction[],
  expected: ExpectedTransaction[],
  month: MonthKey,
): Agorot {
  return agorot(
    actualSpending(txns, month, 'household') + remainingExpectedSpending(expected, month),
  );
}
