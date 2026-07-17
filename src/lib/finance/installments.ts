import type { InstallmentPlan } from '@/types/domain';
import { shiftMonth, type MonthKey } from '@/lib/format/date';
import { agorot, ZERO, type Agorot } from '@/types/money';

/**
 * Installments: the plan stores the full commitment; each month carries only
 * its own charge. The final installment absorbs rounding so the sum of
 * charges equals the original amount exactly.
 */

export function chargeMonths(plan: InstallmentPlan): MonthKey[] {
  return Array.from({ length: plan.count }, (_, i) => shiftMonth(plan.firstChargeMonth, i));
}

/** 1-based sequence charged in `month`, or null when the plan is idle. */
export function sequenceInMonth(plan: InstallmentPlan, month: MonthKey): number | null {
  const months = chargeMonths(plan);
  const index = months.indexOf(month);
  return index === -1 ? null : index + 1;
}

/** The portion of the plan that belongs to `month` (0 outside the schedule). */
export function monthlyPortion(plan: InstallmentPlan, month: MonthKey): Agorot {
  const seq = sequenceInMonth(plan, month);
  if (seq === null) return ZERO;
  if (seq === plan.count) {
    // last charge absorbs rounding
    return agorot(plan.totalAmount - plan.monthlyAmount * (plan.count - 1));
  }
  return plan.monthlyAmount;
}

export function paidCount(plan: InstallmentPlan, asOfMonth: MonthKey): number {
  return chargeMonths(plan).filter((m) => m <= asOfMonth).length;
}

export function remainingCount(plan: InstallmentPlan, asOfMonth: MonthKey): number {
  return plan.count - paidCount(plan, asOfMonth);
}

/** Remaining commitment after (and excluding) `asOfMonth`. */
export function remainingCommitment(plan: InstallmentPlan, asOfMonth: MonthKey): Agorot {
  return agorot(
    chargeMonths(plan)
      .filter((m) => m > asOfMonth)
      .reduce((sum, m) => sum + monthlyPortion(plan, m), 0),
  );
}

/** Total committed installment charges across plans for a given future month. */
export function committedInMonth(plans: InstallmentPlan[], month: MonthKey): Agorot {
  return agorot(plans.reduce((sum, p) => sum + monthlyPortion(p, month), 0));
}

/** "תשלום 2 מתוך 12" */
export function installmentLabel(plan: InstallmentPlan, month: MonthKey): string | null {
  const seq = sequenceInMonth(plan, month);
  return seq === null ? null : `תשלום ${seq} מתוך ${plan.count}`;
}
