import type { ExpectedTransaction, Transaction } from '@/types/domain';
import type { MonthKey } from '@/lib/format/date';
import { agorot, type Agorot } from '@/types/money';
import { countableTransactions } from '@/lib/finance/filters';

/**
 * Income rules (PRODUCT_SPEC §2):
 * - received = actual income transactions (salary + business + other),
 *   transfers excluded. Bit/PayBox income counts once, when received.
 * - expected guaranteed vs expected uncertain are never conflated.
 * - business income is family income (kept separate for business reporting).
 */

/** Actual income received in the month (household + business = family). */
export function actualFamilyIncome(txns: Transaction[], month: MonthKey): Agorot {
  return agorot(
    countableTransactions(txns, month)
      .filter((t) => t.kind === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
  );
}

/** Actual household-context income (salaries etc.) received in the month. */
export function actualHouseholdIncome(txns: Transaction[], month: MonthKey): Agorot {
  return agorot(
    countableTransactions(txns, month, 'household')
      .filter((t) => t.kind === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
  );
}

/** Actual business revenue received in the month (any channel: bank/Bit/PayBox). */
export function actualBusinessRevenue(txns: Transaction[], month: MonthKey): Agorot {
  return agorot(
    countableTransactions(txns, month, 'business')
      .filter((t) => t.kind === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
  );
}

function expectedInflows(expected: ExpectedTransaction[], month: MonthKey) {
  return expected.filter((e) => e.month === month && e.direction === 'inflow');
}

/** Total expected income for the month = guaranteed only (headline KPI). */
export function expectedGuaranteedIncome(
  expected: ExpectedTransaction[],
  month: MonthKey,
): Agorot {
  return agorot(
    expectedInflows(expected, month)
      .filter((e) => e.certainty !== 'uncertain')
      .reduce((sum, e) => sum + e.amount, 0),
  );
}

/** Uncertain expected income — shown separately, never treated as guaranteed. */
export function expectedUncertainIncome(
  expected: ExpectedTransaction[],
  month: MonthKey,
): Agorot {
  return agorot(
    expectedInflows(expected, month)
      .filter((e) => e.certainty === 'uncertain')
      .reduce((sum, e) => sum + e.amount, 0),
  );
}

/** Guaranteed income still to arrive (unfulfilled inflows). */
export function remainingGuaranteedIncome(
  expected: ExpectedTransaction[],
  month: MonthKey,
): Agorot {
  return agorot(
    expectedInflows(expected, month)
      .filter((e) => e.certainty !== 'uncertain' && !e.fulfilled)
      .reduce((sum, e) => sum + e.amount, 0),
  );
}
