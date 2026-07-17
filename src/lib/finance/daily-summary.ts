import type { Category, ExpectedTransaction, FinanceDb, Transaction } from '@/types/domain';
import type { ISODate } from '@/lib/format/date';
import { monthKeyOf, parseISODate } from '@/lib/format/date';
import { agorot, type Agorot } from '@/types/money';
import { isInternalTransfer } from '@/lib/finance/filters';
import { summarizeCategory } from '@/lib/finance/budgets';
import { actualSpending, spendingByOwner } from '@/lib/finance/spending';
import { totalBudget } from '@/lib/finance/budgets';
import { projectedEndOfMonth } from '@/lib/finance/projections';

/**
 * Daily summary model (scheduled 21:30 Asia/Jerusalem — see
 * NotificationScheduler; delivery is out of MVP scope, the model and UI are in).
 */
export type DailySummary = {
  date: ISODate;
  spentToday: Agorot;
  incomeToday: Agorot;
  todayTransactions: Transaction[];
  /** category breakdown of today's spending */
  byCategory: { category: Category; amount: Agorot }[];
  /** אורן mול דניאל spending this day */
  byOwner: { ownerId: string; name: string; amount: Agorot }[];
  monthSpent: Agorot;
  monthBudget: Agorot;
  /** categories near/over their limit right now */
  attention: { name: string; status: 'near' | 'over'; detail: string }[];
  /** upcoming large payments (top expected outflows still due) */
  upcomingLarge: ExpectedTransaction[];
  openReviewCount: number;
  projectedEndOfMonth: Agorot;
};

export function buildDailySummary(db: FinanceDb, date: ISODate): DailySummary {
  const month = monthKeyOf(date);
  const today = parseISODate(date);
  const dayTxns = db.transactions.filter((t) => t.date === date && !isInternalTransfer(t));

  const spentToday = agorot(
    -dayTxns
      .filter((t) => (t.kind === 'expense' || t.kind === 'refund') && t.context === 'household')
      .reduce((sum, t) => sum + t.amount, 0),
  );
  const incomeToday = agorot(
    dayTxns.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0),
  );

  const byCategoryMap = new Map<string, number>();
  for (const t of dayTxns) {
    if (t.kind !== 'expense' && t.kind !== 'refund') continue;
    if (!t.categoryId || t.context !== 'household') continue;
    byCategoryMap.set(t.categoryId, (byCategoryMap.get(t.categoryId) ?? 0) - t.amount);
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([categoryId, amount]) => ({
      category: db.categories.find((c) => c.id === categoryId)!,
      amount: agorot(amount),
    }))
    .filter((e) => e.category)
    .sort((a, b) => b.amount - a.amount);

  const adults = db.household.members.filter((m) => m.kind === 'adult');
  const byOwner = adults.map((m) => ({
    ownerId: m.id,
    name: m.name,
    amount: spendingByOwner(
      db.transactions.filter((t) => t.date === date),
      month,
      m.id,
    ),
  }));

  const budget = db.budgets.find((b) => b.month === month && b.context === 'household');
  const attention = db.categories
    .filter((c) => c.context === 'household' && !c.archived)
    .map((c) => summarizeCategory(c, budget, db.transactions, month, today))
    .filter((s) => s.status !== 'healthy')
    .map((s) => ({
      name: s.category.name,
      status: s.status as 'near' | 'over',
      detail:
        s.status === 'over'
          ? `חריגה של ₪${Math.round(s.overspend / 100).toLocaleString('en-US')}`
          : `נוצל ${Math.round(s.utilization)}%`,
    }));

  const upcomingLarge = db.expected
    .filter((e) => e.month === month && e.direction === 'outflow' && !e.fulfilled)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return {
    date,
    spentToday,
    incomeToday,
    todayTransactions: dayTxns,
    byCategory,
    byOwner,
    monthSpent: actualSpending(db.transactions, month, 'household'),
    monthBudget: totalBudget(budget),
    attention,
    upcomingLarge,
    openReviewCount: db.reviewItems.filter((r) => r.status === 'open').length,
    projectedEndOfMonth: projectedEndOfMonth(db.accounts, db.expected, month),
  };
}

/**
 * Delivery scheduling interface — 21:30 Asia/Jerusalem. The MVP ships a
 * no-op implementation; a real provider (Supabase cron + push) plugs in later
 * without touching the summary model.
 */
export interface NotificationScheduler {
  scheduleDaily(time: `${number}:${number}`, timezone: 'Asia/Jerusalem'): void;
}

export const noopScheduler: NotificationScheduler = {
  scheduleDaily() {
    // intentionally empty — no paid notification provider in this phase
  },
};
