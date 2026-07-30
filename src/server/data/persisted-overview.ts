import 'server-only';

import { cache } from 'react';
import {
  currentMonthKey,
  daysInMonth,
  type MonthKey,
} from '@/lib/format/date';
import { buildInsights } from '@/lib/finance/insights';
import { normalizeMerchant } from '@/lib/imports/categorization';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import { getPersistedAccountsScreen } from '@/server/data/persisted-accounts';
import { getPersistedPlanningScreen } from '@/server/data/persisted-planning';
import { getPersistedTransactionsScreen } from '@/server/data/persisted-transactions';
import type {
  CategoryView,
  MonthOverview,
  TransactionItem,
  TxnListItem,
} from '@/server/data/views';
import type { Category } from '@/types/domain';
import { agorot, type Agorot } from '@/types/money';

type CategoryRow = {
  id: string;
  name: string;
  short_name: string;
  icon: string;
  context: 'household' | 'business';
  priority: 'essential' | 'important' | 'flexible' | 'discretionary';
  sort_order: number;
};

type BudgetRow = {
  context: 'household' | 'business';
  monthly_budget_items: { category_id: string; amount: number }[];
};

function nextMonth(month: MonthKey): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}` as MonthKey;
}

function spending(items: TransactionItem[], context: 'household' | 'business'): Agorot {
  return agorot(
    -items
      .filter(
        (item) =>
          item.context === context &&
          (item.kind === 'expense' || item.kind === 'refund'),
      )
      .reduce((total, item) => total + item.amount, 0),
  );
}

function income(items: TransactionItem[], context: 'household' | 'business'): Agorot {
  return agorot(
    items
      .filter((item) => item.context === context && item.kind === 'income')
      .reduce((total, item) => total + item.amount, 0),
  );
}

function categoryViews({
  categories,
  allocations,
  transactions,
  month,
}: {
  categories: CategoryRow[];
  allocations: Map<string, number>;
  transactions: TransactionItem[];
  month: MonthKey;
}): CategoryView[] {
  const today = new Date();
  const currentMonth = currentMonthKey(today);

  return categories.map((category) => {
    const categoryTransactions = transactions.filter(
      (transaction) =>
        transaction.categoryId === category.id &&
        transaction.context === category.context &&
        (transaction.kind === 'expense' || transaction.kind === 'refund'),
    );
    const spent = agorot(
      -categoryTransactions.reduce(
        (total, transaction) => total + transaction.amount,
        0,
      ),
    );
    const allocated = agorot(allocations.get(category.id) ?? 0);
    const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;
    const status: CategoryView['status'] =
      allocated === 0
        ? 'healthy'
        : spent > allocated
          ? 'over'
          : utilization >= 80
            ? 'near'
            : 'healthy';
    const projected =
      month < currentMonth
        ? spent
        : month > currentMonth
          ? allocated
          : agorot(
              Math.round(
                (spent / Math.max(today.getDate(), 1)) * daysInMonth(month),
              ),
            );

    return {
      id: category.id,
      name: category.name,
      shortName: category.short_name,
      icon: category.icon,
      priority: category.priority,
      allocated,
      spent,
      remaining: agorot(Math.max(allocated - spent, 0)),
      overspend: agorot(Math.max(spent - allocated, 0)),
      utilization,
      status,
      projected,
      transactions: categoryTransactions.slice(0, 6),
    };
  });
}

function insightCategories(views: CategoryView[], rows: CategoryRow[]) {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return views.map((view) => {
    const row = rowById.get(view.id)!;
    const category: Category = {
      id: view.id,
      name: view.name,
      shortName: view.shortName,
      icon: view.icon,
      context: row.context,
      priority: row.priority,
      sortOrder: row.sort_order,
    };
    return {
      category,
      allocated: view.allocated,
      spent: view.spent,
      remaining: view.remaining,
      overspend: view.overspend,
      utilization: view.utilization,
      status: view.status,
      projected: view.projected,
    };
  });
}

function asListItem(item: TransactionItem): TxnListItem {
  return {
    id: item.id,
    merchant: item.merchant,
    icon: item.icon,
    meta: item.meta,
    dateLabel: item.dateLabel,
    amount: item.amount,
    kind: item.kind,
    tag: item.tag,
  };
}

/**
 * Builds every dashboard and budget figure from household-owned Supabase rows.
 * An empty table produces an honest zero/empty state; fixture values are never
 * mixed into imported transactions.
 */
export const getPersistedMonthOverview = cache(
  async (month: MonthKey): Promise<MonthOverview> => {
    const membership = await getCurrentHouseholdMembership();
    const empty: MonthOverview = {
      month,
      isFutureMonth: month > currentMonthKey(),
      expectedIncome: agorot(0),
      uncertainIncome: agorot(0),
      remainingIncome: agorot(0),
      actualSpending: agorot(0),
      remainingExpected: agorot(0),
      projectedEom: agorot(0),
      currentBalance: agorot(0),
      balance: agorot(0),
      totalBudget: agorot(0),
      remainingBudget: agorot(0),
      categories: [],
      businessCategories: [],
      recentTransactions: [],
      upcoming: [],
      insights: [],
      overspentAlerts: [],
      reviewCount: 0,
      businessRevenue: agorot(0),
    };
    if (!membership) return empty;

    const monthStart = `${month}-01`;
    const followingMonthStart = `${nextMonth(month)}-01`;
    const supabase = await createClient();
    const [
      transactionScreen,
      planning,
      accounts,
      categoriesResult,
      budgetsResult,
      expectedIncomeResult,
    ] = await Promise.all([
      getPersistedTransactionsScreen(),
      getPersistedPlanningScreen(month),
      getPersistedAccountsScreen(),
      supabase
        .from('categories')
        .select('id, name, short_name, icon, context, priority, sort_order')
        .eq('household_id', membership.householdId)
        .is('archived_at', null)
        .order('context', { ascending: true })
        .order('sort_order', { ascending: true }),
      supabase
        .from('monthly_budgets')
        .select('context, monthly_budget_items(category_id, amount)')
        .eq('household_id', membership.householdId)
        .eq('month', monthStart),
      supabase
        .from('expected_transactions')
        .select('name, amount, certainty, fulfilled_txn_id')
        .eq('household_id', membership.householdId)
        .eq('month', monthStart)
        .eq('context', 'household')
        .eq('direction', 'inflow'),
    ]);

    const error =
      categoriesResult.error ??
      budgetsResult.error ??
      expectedIncomeResult.error;
    if (error) {
      throw new Error('Unable to load persisted month overview', {
        cause: error,
      });
    }

    const monthTransactions = transactionScreen.items.filter(
      (item) =>
        item.dateISO >= monthStart && item.dateISO < followingMonthStart,
    );
    const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
    const budgetRows = (budgetsResult.data ?? []) as BudgetRow[];
    const allocations = new Map(
      budgetRows.flatMap((budget) =>
        budget.monthly_budget_items.map(
          (item) => [item.category_id, item.amount] as const,
        ),
      ),
    );
    const householdCategories = categoryViews({
      categories: categoryRows.filter(
        (category) => category.context === 'household',
      ),
      allocations,
      transactions: monthTransactions,
      month,
    });
    const businessCategories = categoryViews({
      categories: categoryRows.filter(
        (category) => category.context === 'business',
      ),
      allocations,
      transactions: monthTransactions,
      month,
    });
    const actualHouseholdSpending = spending(
      monthTransactions,
      'household',
    );
    const actualHouseholdIncome = income(monthTransactions, 'household');
    const actualBusinessIncome = income(monthTransactions, 'business');
    const realizedIncomeMerchants = monthTransactions
      .filter(
        (transaction) =>
          transaction.context === 'household' &&
          transaction.kind === 'income',
      )
      .map((transaction) => normalizeMerchant(transaction.merchant));
    const stillExpectedIncome = (expectedIncomeResult.data ?? []).filter(
      (expected) => {
        if (expected.fulfilled_txn_id !== null) return false;
        const expectedName = normalizeMerchant(expected.name);
        return !realizedIncomeMerchants.some(
          (merchant) =>
            merchant.includes(expectedName) ||
            expectedName.includes(merchant),
        );
      },
    );
    const remainingIncome = agorot(
      stillExpectedIncome
        .filter(
          (expected) => expected.certainty !== 'uncertain',
        )
        .reduce((total, expected) => total + expected.amount, 0),
    );
    const uncertainIncome = agorot(
      stillExpectedIncome
        .filter(
          (expected) => expected.certainty === 'uncertain',
        )
        .reduce((total, expected) => total + expected.amount, 0),
    );
    const remainingExpected = agorot(
      planning.groups
        .flatMap((group) => group.items)
        .filter((item) => !item.fulfilled)
        .reduce((total, item) => total + item.amount, 0),
    );
    const currentBalance = agorot(
      accounts
        .filter(
          (account) =>
            account.context === 'household' &&
            ['bank', 'wallet', 'cash'].includes(account.type),
        )
        .reduce((total, account) => total + account.balance, 0),
    );
    const expectedIncome = agorot(
      actualHouseholdIncome + remainingIncome,
    );
    const balance = agorot(
      expectedIncome - actualHouseholdSpending - remainingExpected,
    );
    const projectedEom = agorot(
      currentBalance + remainingIncome - remainingExpected,
    );
    const totalBudget = agorot(
      budgetRows
        .filter((budget) => budget.context === 'household')
        .flatMap((budget) => budget.monthly_budget_items)
        .reduce((total, item) => total + item.amount, 0),
    );
    const upcoming = planning.groups
      .flatMap((group) => group.items)
      .filter((item) => !item.fulfilled)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        dueLabel: item.dueLabel,
        amount: item.amount,
        estimate: item.estimate,
      }));
    const budgetedHouseholdCategories = householdCategories.filter(
      (category) => category.allocated > 0,
    );

    return {
      month,
      isFutureMonth: month > currentMonthKey(),
      expectedIncome,
      uncertainIncome,
      remainingIncome,
      actualSpending: actualHouseholdSpending,
      remainingExpected,
      projectedEom,
      currentBalance,
      balance,
      totalBudget,
      remainingBudget: agorot(
        Math.max(totalBudget - actualHouseholdSpending, 0),
      ),
      categories: householdCategories,
      businessCategories,
      recentTransactions: monthTransactions
        .filter((item) => item.context === 'household')
        .slice(0, 8)
        .map(asListItem),
      upcoming,
      insights:
        budgetedHouseholdCategories.length > 0
          ? buildInsights(
              insightCategories(
                budgetedHouseholdCategories,
                categoryRows,
              ),
              balance,
            )
          : [],
      overspentAlerts: householdCategories
        .filter((category) => category.allocated > 0 && category.status === 'over')
        .map((category) => ({
          name: category.name,
          amount: category.overspend,
        })),
      reviewCount: transactionScreen.reviewCount,
      businessRevenue: actualBusinessIncome,
    };
  },
);
