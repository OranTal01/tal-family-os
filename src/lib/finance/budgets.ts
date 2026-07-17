import type {
  BudgetAdjustment,
  Category,
  MonthBudget,
  Transaction,
} from '@/types/domain';
import type { MonthKey } from '@/lib/format/date';
import { daysInMonth, monthKeyOf, toISODate } from '@/lib/format/date';
import { agorot, ZERO, type Agorot } from '@/types/money';
import { categorySpending } from '@/lib/finance/spending';

export type CategoryStatus = 'healthy' | 'near' | 'over';

export type CategoryBudgetSummary = {
  category: Category;
  allocated: Agorot;
  spent: Agorot;
  /** positive remaining; 0 when over */
  remaining: Agorot;
  /** positive overspend; 0 when within budget */
  overspend: Agorot;
  /** spent / allocated, in percent (may exceed 100) */
  utilization: number;
  status: CategoryStatus;
  /** linear-pace projection of month-end spending */
  projected: Agorot;
};

export const NEAR_LIMIT_THRESHOLD = 0.8;

/**
 * Category card math used identically by every screen.
 * `today` drives the pace projection; for past months the projection equals
 * the actual spending.
 */
export function summarizeCategory(
  category: Category,
  budget: MonthBudget | undefined,
  txns: Transaction[],
  month: MonthKey,
  today: Date,
): CategoryBudgetSummary {
  const allocated =
    budget?.items.find((i) => i.categoryId === category.id)?.amount ?? ZERO;
  const spent = categorySpending(txns, month, category.id);
  const utilization = allocated > 0 ? (spent / allocated) * 100 : spent > 0 ? Infinity : 0;
  const status: CategoryStatus =
    spent > allocated ? 'over' : utilization >= NEAR_LIMIT_THRESHOLD * 100 ? 'near' : 'healthy';

  const todayMonth = monthKeyOf(toISODate(today));
  let projected: Agorot;
  if (month < todayMonth) {
    projected = spent;
  } else if (month > todayMonth) {
    projected = allocated;
  } else {
    const dayOfMonth = today.getDate();
    const pace = spent / Math.max(dayOfMonth, 1);
    projected = agorot(Math.round(pace * daysInMonth(month)));
  }

  return {
    category,
    allocated,
    spent,
    remaining: agorot(Math.max(allocated - spent, 0)),
    overspend: agorot(Math.max(spent - allocated, 0)),
    utilization: Number.isFinite(utilization) ? utilization : 100,
    status,
    projected,
  };
}

/** Total monthly budget = sum of category budgets (never stored). */
export function totalBudget(budget: MonthBudget | undefined): Agorot {
  return agorot(budget?.items.reduce((sum, i) => sum + i.amount, 0) ?? 0);
}

export function remainingBudget(budget: MonthBudget | undefined, spent: Agorot): Agorot {
  return agorot(totalBudget(budget) - spent);
}

/**
 * Apply an audited adjustment to a month budget (pure — returns a new budget).
 * Reallocation moves delta from the counterpart category; other kinds change
 * a single category. The audit event itself is recorded by the caller.
 */
export function applyAdjustment(
  budget: MonthBudget,
  adjustment: BudgetAdjustment,
): MonthBudget {
  const items = budget.items.map((item) => {
    if (item.categoryId === adjustment.categoryId) {
      return { ...item, amount: agorot(item.amount + adjustment.delta) };
    }
    if (
      adjustment.kind === 'reallocation' &&
      item.categoryId === adjustment.counterpartCategoryId
    ) {
      return { ...item, amount: agorot(item.amount - adjustment.delta) };
    }
    return item;
  });
  return { ...budget, items };
}

/** Active (non-archived) categories for pickers and budget grids. */
export function activeCategories(categories: Category[], context: 'household' | 'business') {
  return categories
    .filter((c) => c.context === context && !c.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
