import 'server-only';

import type { Agorot } from '@/types/money';
import { agorot } from '@/types/money';
import type { Context, ExpectedTransaction, Transaction } from '@/types/domain';
import type { CategoryStatusKey } from '@/components/finance/status-badge';
import { currentMonthKey, formatRelativeDay, shiftMonth, type MonthKey } from '@/lib/format/date';
import { activeCategories, summarizeCategory, totalBudget } from '@/lib/finance/budgets';
import {
  actualBusinessRevenue,
  expectedGuaranteedIncome,
  expectedUncertainIncome,
  remainingGuaranteedIncome,
} from '@/lib/finance/income';
import { actualSpending, remainingExpectedSpending } from '@/lib/finance/spending';
import { monthBalance, projectedEndOfMonth, currentLiquidBalance } from '@/lib/finance/projections';
import { installmentLabel } from '@/lib/finance/installments';
import { buildInsights, type InsightModel } from '@/lib/finance/insights';
import { getFinanceDb } from '@/server/data/repository';

/**
 * Serializable view models assembled on the server. All numbers come from
 * lib/finance — screens never aggregate on their own.
 */

export type TxnListItem = {
  id: string;
  merchant: string;
  icon: string;
  meta: string;
  dateLabel: string;
  amount: Agorot;
  kind: Transaction['kind'];
  tag?: { label: string; tone: 'warn' | 'future' | 'sync'; icon: string };
};

export type CategoryView = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  priority: string;
  allocated: Agorot;
  spent: Agorot;
  remaining: Agorot;
  overspend: Agorot;
  utilization: number;
  status: CategoryStatusKey;
  projected: Agorot;
  transactions: TxnListItem[];
};

export type UpcomingItem = {
  id: string;
  name: string;
  icon: string;
  dueLabel: string;
  amount: Agorot;
  estimate: boolean;
};

export type MonthOverview = {
  month: MonthKey;
  isFutureMonth: boolean;
  expectedIncome: Agorot;
  uncertainIncome: Agorot;
  remainingIncome: Agorot;
  actualSpending: Agorot;
  remainingExpected: Agorot;
  projectedEom: Agorot;
  currentBalance: Agorot;
  balance: Agorot;
  totalBudget: Agorot;
  remainingBudget: Agorot;
  categories: CategoryView[];
  businessCategories: CategoryView[];
  recentTransactions: TxnListItem[];
  upcoming: UpcomingItem[];
  insights: InsightModel[];
  overspentAlerts: { name: string; amount: Agorot }[];
  reviewCount: number;
  businessRevenue: Agorot;
};

const accountNames = new Map<string, string>();

function txnMeta(
  t: Transaction,
  categoryName: string | undefined,
  withAccount: boolean,
): string {
  const parts: string[] = [];
  if (t.kind === 'income') parts.push('הכנסה');
  else if (t.kind === 'transfer') parts.push('העברה');
  else if (categoryName) parts.push(categoryName);
  else parts.push('ללא קטגוריה');
  if (withAccount && accountNames.get(t.accountId)) parts.push(accountNames.get(t.accountId)!);
  return parts.join(' · ');
}

export async function toTxnListItem(
  t: Transaction,
  options: { withAccount?: boolean } = {},
): Promise<TxnListItem> {
  const db = await getFinanceDb();
  const category = db.categories.find((c) => c.id === t.categoryId);
  const plan = t.installment
    ? db.installmentPlans.find((p) => p.id === t.installment!.planId)
    : undefined;

  let tag: TxnListItem['tag'];
  if (t.needsReview) tag = { label: 'לבדיקה', tone: 'warn', icon: 'error' };
  else if (t.kind === 'transfer') tag = { label: 'העברה', tone: 'sync', icon: 'swap_horiz' };
  else if (plan) {
    const label = installmentLabel(plan, t.date.slice(0, 7) as MonthKey);
    if (label) tag = { label, tone: 'future', icon: 'credit_card' };
  } else if (t.context === 'business') {
    tag = { label: 'עסק', tone: 'future', icon: 'storefront' };
  }

  return {
    id: t.id,
    merchant: t.merchant,
    icon: t.icon,
    meta: txnMeta(t, category?.name, options.withAccount ?? false),
    dateLabel: formatRelativeDay(t.date, { time: t.time }),
    amount: t.amount,
    kind: t.kind,
    tag,
  };
}

export async function getMonthOverview(month: MonthKey): Promise<MonthOverview> {
  const db = await getFinanceDb();
  const today = new Date();
  for (const a of db.accounts) accountNames.set(a.id, a.name);

  const buildCategoryViews = async (context: Context): Promise<CategoryView[]> => {
    const budget = db.budgets.find((b) => b.month === month && b.context === context);
    const views: CategoryView[] = [];
    for (const category of activeCategories(db.categories, context)) {
      const s = summarizeCategory(category, budget, db.transactions, month, today);
      const catTxns = db.transactions
        .filter(
          (t) =>
            t.categoryId === category.id &&
            t.date.startsWith(month) &&
            t.kind !== 'transfer',
        )
        .slice(0, 6);
      views.push({
        id: category.id,
        name: category.name,
        shortName: category.shortName,
        icon: category.icon,
        priority: category.priority,
        allocated: s.allocated,
        spent: s.spent,
        remaining: s.remaining,
        overspend: s.overspend,
        utilization: s.utilization,
        status: s.status,
        projected: s.projected,
        transactions: await Promise.all(catTxns.map((t) => toTxnListItem(t))),
      });
    }
    return views;
  };

  const categories = await buildCategoryViews('household');
  const businessCategories = await buildCategoryViews('business');
  const budget = db.budgets.find((b) => b.month === month && b.context === 'household');

  const spent = actualSpending(db.transactions, month, 'household');
  const balance = monthBalance(db.transactions, db.expected, month);
  const budgetTotal = totalBudget(budget);

  const recent = db.transactions
    .filter((t) => t.date.startsWith(month) && t.context === 'household')
    .slice(0, 8);

  const nextMonth = shiftMonth(month, 1);
  const upcoming: UpcomingItem[] = [
    ...db.expected.filter(
      (e) => e.month === month && e.direction === 'outflow' && !e.fulfilled && !e.estimate,
    ),
    ...db.expected.filter(
      (e: ExpectedTransaction) =>
        e.month === nextMonth &&
        e.direction === 'outflow' &&
        e.group === 'fixed' &&
        e.amount >= 200000,
    ),
  ]
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: e.name,
      icon: e.icon,
      dueLabel: e.dueLabel,
      amount: e.amount,
      estimate: e.estimate ?? false,
    }));

  const summariesForInsights = activeCategories(db.categories, 'household').map((c) =>
    summarizeCategory(
      c,
      budget,
      db.transactions,
      month,
      today,
    ),
  );

  return {
    month,
    isFutureMonth: month > currentMonthKey(),
    expectedIncome: expectedGuaranteedIncome(db.expected, month),
    uncertainIncome: expectedUncertainIncome(db.expected, month),
    remainingIncome: remainingGuaranteedIncome(db.expected, month),
    actualSpending: spent,
    remainingExpected: remainingExpectedSpending(db.expected, month),
    projectedEom: projectedEndOfMonth(db.accounts, db.expected, month),
    currentBalance: currentLiquidBalance(db.accounts),
    balance,
    totalBudget: budgetTotal,
    remainingBudget: agorot(Math.max(budgetTotal - spent, 0)),
    categories,
    businessCategories,
    recentTransactions: await Promise.all(
      recent.map((t) => toTxnListItem(t)),
    ),
    upcoming,
    insights: buildInsights(summariesForInsights, balance),
    overspentAlerts: categories
      .filter((c) => c.status === 'over')
      .map((c) => ({ name: c.name, amount: c.overspend })),
    reviewCount: db.reviewItems.filter((r) => r.status === 'open').length,
    businessRevenue: actualBusinessRevenue(db.transactions, month),
  };
}

/** Month param parsing shared by all month-scoped pages. */
export function resolveMonth(raw: string | string[] | undefined): MonthKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? (value as MonthKey) : currentMonthKey();
}

/* ------------------------- transactions & review screens ------------------------ */

export type CategoryOption = {
  id: string;
  name: string;
  icon: string;
  context: Context;
};

export type TransactionItem = TxnListItem & {
  dateISO: string;
  categoryId?: string;
  categoryName?: string;
  accountName: string;
  context: Context;
  ownerId?: string;
  needsReview: boolean;
};

export type TransactionsScreen = {
  items: TransactionItem[];
  categories: CategoryOption[];
  reviewCount: number;
};

export async function getTransactionsScreen(): Promise<TransactionsScreen> {
  const db = await getFinanceDb();
  for (const a of db.accounts) accountNames.set(a.id, a.name);

  const items: TransactionItem[] = [];
  for (const t of db.transactions) {
    const base = await toTxnListItem(t);
    const category = db.categories.find((c) => c.id === t.categoryId);
    items.push({
      ...base,
      dateISO: t.date,
      categoryId: t.categoryId,
      categoryName: category?.name,
      accountName: accountNames.get(t.accountId) ?? '',
      context: t.context,
      ownerId: t.ownerId,
      needsReview: t.needsReview ?? false,
    });
  }

  return {
    items,
    categories: activeCategories(db.categories, 'household')
      .concat(activeCategories(db.categories, 'business'))
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, context: c.context })),
    reviewCount: db.reviewItems.filter((r) => r.status === 'open').length,
  };
}

export type ReviewCardView = {
  id: string;
  transactionId: string;
  icon: string;
  name: string;
  /** "ויזה כאל · 14 ביולי" */
  note: string;
  reasonLabel: string;
  actionLabel: string;
  amount: Agorot;
  suggestedCategoryId?: string;
  isIncome: boolean;
};

export async function getReviewScreen(): Promise<{
  items: ReviewCardView[];
  categories: CategoryOption[];
}> {
  const db = await getFinanceDb();
  for (const a of db.accounts) accountNames.set(a.id, a.name);

  const items: ReviewCardView[] = [];
  for (const item of db.reviewItems) {
    if (item.status !== 'open') continue;
    const t = db.transactions.find((x) => x.id === item.transactionId);
    if (!t) continue;
    const rule = db.merchantRules.find((r) => t.merchant.includes(r.merchantPattern));
    items.push({
      id: item.id,
      transactionId: t.id,
      icon: t.icon,
      name: t.merchant,
      note: `${accountNames.get(t.accountId) ?? ''} · ${formatRelativeDay(t.date)}`,
      reasonLabel: item.reasonLabel,
      actionLabel: item.actionLabel,
      amount: t.amount,
      suggestedCategoryId: rule?.categoryId,
      isIncome: t.amount > 0,
    });
  }

  return {
    items,
    categories: activeCategories(db.categories, 'household')
      .concat(activeCategories(db.categories, 'business'))
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, context: c.context })),
  };
}

/* ------------------------------ remaining screens ------------------------------ */

export type PlanItem = {
  id: string;
  name: string;
  icon: string;
  dueLabel: string;
  amount: Agorot;
  estimate: boolean;
  fulfilled: boolean;
  direction: 'inflow' | 'outflow';
};

export type PlanningScreen = {
  month: MonthKey;
  income: Agorot;
  uncertainIncome: Agorot;
  expectedExpenses: Agorot;
  balance: Agorot;
  committedInstallments: Agorot;
  installmentsCount: number;
  groups: { key: 'fixed' | 'variable_estimate' | 'one_time'; title: string; items: PlanItem[] }[];
};

export async function getPlanningScreen(month: MonthKey): Promise<PlanningScreen> {
  const db = await getFinanceDb();
  const { totalExpectedSpending } = await import('@/lib/finance/projections');
  const { committedInMonth } = await import('@/lib/finance/installments');

  const toItem = (e: ExpectedTransaction): PlanItem => ({
    id: e.id,
    name: e.name,
    icon: e.icon,
    dueLabel: e.dueLabel,
    amount: e.amount,
    estimate: e.estimate ?? false,
    fulfilled: e.fulfilled ?? false,
    direction: e.direction,
  });

  const outflows = db.expected.filter(
    (e) => e.month === month && e.direction === 'outflow' && e.context === 'household',
  );
  const groups = (
    [
      ['fixed', 'קבוע'],
      ['variable_estimate', 'משתנה · הערכה'],
      ['one_time', 'חד־פעמי'],
    ] as const
  ).map(([key, title]) => ({
    key,
    title,
    items: outflows.filter((e) => e.group === key).map(toItem),
  }));

  return {
    month,
    income: expectedGuaranteedIncome(db.expected, month),
    uncertainIncome: expectedUncertainIncome(db.expected, month),
    expectedExpenses: totalExpectedSpending(db.transactions, db.expected, month),
    balance: monthBalance(db.transactions, db.expected, month),
    committedInstallments: committedInMonth(db.installmentPlans, month),
    installmentsCount: db.installmentPlans.filter((p) => committedInMonth([p], month) > 0)
      .length,
    groups,
  };
}

export type SplitScreen = {
  household: { income: Agorot; expenses: Agorot; balance: Agorot };
  business: {
    revenue: Agorot;
    expenses: Agorot;
    profit: Agorot;
    vatDue: Agorot;
    nextReportLabel: string;
  };
};

export async function getSplitScreen(month: MonthKey): Promise<SplitScreen> {
  const db = await getFinanceDb();
  const { totalExpectedSpending } = await import('@/lib/finance/projections');
  const { summarizeBusiness } = await import('@/lib/finance/business');
  const b = summarizeBusiness(db.transactions, month, db.business);
  return {
    household: {
      income: expectedGuaranteedIncome(db.expected, month),
      expenses: totalExpectedSpending(db.transactions, db.expected, month),
      balance: monthBalance(db.transactions, db.expected, month),
    },
    business: {
      revenue: b.revenue,
      expenses: b.expenses,
      profit: b.profitBeforeTax,
      vatDue: b.vatDueEstimate,
      nextReportLabel: db.business.nextVatReportLabel,
    },
  };
}

export type BusinessScreen = SplitScreen['business'] & {
  uncertainIncome: Agorot;
  transactions: TransactionItem[];
};

export async function getBusinessScreen(month: MonthKey): Promise<BusinessScreen> {
  const db = await getFinanceDb();
  const split = await getSplitScreen(month);
  const screen = await getTransactionsScreen();
  return {
    ...split.business,
    uncertainIncome: expectedUncertainIncome(
      db.expected.filter((e) => e.context === 'business'),
      month,
    ),
    transactions: screen.items.filter((t) => t.context === 'business').slice(0, 20),
  };
}

export type AssetsScreen = {
  netWorth: Agorot;
  totalAssets: Agorot;
  totalLiabilities: Agorot;
  rows: {
    id: string;
    name: string;
    subtitle: string;
    icon: string;
    chip: string;
    value: Agorot;
    liability: boolean;
  }[];
};

export async function getAssetsScreen(): Promise<AssetsScreen> {
  const db = await getFinanceDb();
  const { summarizeNetWorth } = await import('@/lib/finance/net-worth');
  const s = summarizeNetWorth(db.assets, db.liabilities);
  return {
    netWorth: s.netWorth,
    totalAssets: s.totalAssets,
    totalLiabilities: s.totalLiabilities,
    rows: [
      ...db.assets.map((a) => ({
        id: a.id,
        name: a.name,
        subtitle: a.subtitle,
        icon: a.icon,
        chip: a.chip,
        value: a.value,
        liability: false,
      })),
      ...db.liabilities.map((l) => ({
        id: l.id,
        name: l.name,
        subtitle: l.subtitle,
        icon: l.icon,
        chip: 'התחייבות',
        value: l.balance,
        liability: true,
      })),
    ],
  };
}

export async function getInsuranceScreen() {
  const db = await getFinanceDb();
  const totalPremium = db.insurancePolicies.reduce(
    (sum, p) => sum + p.premiumMonthly,
    0,
  ) as Agorot;
  return { totalPremium, policies: db.insurancePolicies };
}

export type GoalView = {
  id: string;
  name: string;
  icon: string;
  target: Agorot;
  current: Agorot;
  monthlyDeposit: Agorot;
  forecastLabel?: string;
  utilization: number;
  contributions: { id: string; label: string; dateLabel: string; amount: Agorot }[];
};

export async function getGoalsScreen(): Promise<GoalView[]> {
  const db = await getFinanceDb();
  return db.goals.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    target: g.target,
    current: g.current,
    monthlyDeposit: g.monthlyDeposit,
    forecastLabel: g.forecastLabel,
    utilization: g.target > 0 ? (g.current / g.target) * 100 : 0,
    contributions: db.goalContributions
      .filter((c) => c.goalId === g.id)
      .map((c) => ({
        id: c.id,
        label: c.label,
        dateLabel: formatRelativeDay(c.date),
        amount: c.amount,
      })),
  }));
}

export async function getKidsScreen() {
  const db = await getFinanceDb();
  const goals = await getGoalsScreen();
  const kids = db.household.members.filter((m) => m.kind === 'child');
  return kids.map((kid) => {
    const goal = goals.find((g) => db.goals.find((x) => x.id === g.id)?.beneficiaryId === kid.id);
    return { kid: { id: kid.id, name: kid.name }, goal: goal ?? null };
  });
}

export async function getAccountsScreen() {
  const db = await getFinanceDb();
  return db.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    subtitle: a.subtitle ?? '',
    icon: a.icon,
    sync: a.sync,
    balance: a.balance ?? null,
    balanceLabel: a.balanceLabel,
    context: a.context,
  }));
}

export async function getDailyScreen() {
  const db = await getFinanceDb();
  const { buildDailySummary } = await import('@/lib/finance/daily-summary');
  const todayISO = new Date().toISOString().slice(0, 10);
  const summary = buildDailySummary(db, todayISO);
  const txnItems = await Promise.all(summary.todayTransactions.map((t) => toTxnListItem(t)));
  return { summary, txnItems };
}

export async function getSettingsScreen() {
  const db = await getFinanceDb();
  return {
    members: db.household.members,
    rules: db.merchantRules.map((r) => ({
      id: r.id,
      pattern: r.merchantPattern,
      categoryName: db.categories.find((c) => c.id === r.categoryId)?.name ?? 'העברה פנימית',
    })),
  };
}
