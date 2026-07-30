import 'server-only';

import { formatDayMonth, type MonthKey } from '@/lib/format/date';
import { normalizeMerchant } from '@/lib/imports/categorization';
import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import type {
  PlanItem,
  PlanningScreen,
} from '@/server/data/views';
import { agorot } from '@/types/money';

type RecurringRow = {
  id: string;
  name: string;
  amount: number | null;
  estimate: boolean;
  category_id: string | null;
  account_id: string | null;
  direction: 'inflow' | 'outflow';
  day_of_month: number;
  cadence: 'monthly' | 'bimonthly' | 'weekly' | 'yearly';
  created_at: string;
};

type ExpectedRow = {
  id: string;
  name: string;
  icon: string | null;
  amount: number;
  estimate: boolean;
  due_date: string | null;
  group_kind: 'fixed' | 'variable_estimate' | 'one_time';
  category_id: string | null;
  direction: 'inflow' | 'outflow';
  certainty: 'guaranteed' | 'uncertain' | null;
  context: 'household' | 'business';
  recurring_id: string | null;
  fulfilled_txn_id: string | null;
};

function monthDifference(from: MonthKey, to: MonthKey): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

function recurringAppliesInMonth(
  recurring: RecurringRow,
  month: MonthKey,
): boolean {
  const firstMonth = recurring.created_at.slice(0, 7) as MonthKey;
  const difference = monthDifference(firstMonth, month);
  if (difference < 0) return false;

  if (recurring.cadence === 'monthly' || recurring.cadence === 'weekly') {
    return true;
  }

  return recurring.cadence === 'bimonthly'
    ? difference % 2 === 0
    : difference % 12 === 0;
}

function recurringDueLabel(recurring: RecurringRow): string {
  if (recurring.cadence === 'weekly') return 'שבועי';
  if (recurring.cadence === 'bimonthly') {
    return `${recurring.day_of_month} אחת לחודשיים`;
  }
  if (recurring.cadence === 'yearly') {
    return `${recurring.day_of_month} פעם בשנה`;
  }
  return `${recurring.day_of_month} בכל חודש`;
}

function nextMonth(month: MonthKey): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}` as MonthKey;
}

/**
 * Reads the private planning model from Supabase. Recurring rows are templates:
 * an explicit expected row for the viewed month takes precedence so it can
 * carry a one-month amount, due date, or fulfillment link.
 */
export async function getPersistedPlanningScreen(
  month: MonthKey,
): Promise<PlanningScreen> {
  const empty: PlanningScreen = {
    month,
    income: agorot(0),
    uncertainIncome: agorot(0),
    expectedExpenses: agorot(0),
    balance: agorot(0),
    committedInstallments: agorot(0),
    installmentsCount: 0,
    groups: [
      { key: 'fixed', title: 'קבוע', items: [] },
      { key: 'variable_estimate', title: 'משתנה · הערכה', items: [] },
      { key: 'one_time', title: 'חד־פעמי', items: [] },
    ],
  };

  const membership = await getCurrentHouseholdMembership();
  if (!membership) return empty;

  const monthStart = `${month}-01`;
  const followingMonthStart = `${nextMonth(month)}-01`;
  const supabase = await createClient();
  const [
    recurringResult,
    expectedResult,
    transactionsResult,
    categoriesResult,
    installmentEntriesResult,
    installmentPlansResult,
  ] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select(
        'id, name, amount, estimate, category_id, account_id, direction, day_of_month, cadence, created_at',
      )
      .eq('household_id', membership.householdId)
      .eq('context', 'household')
      .eq('active', true),
    supabase
      .from('expected_transactions')
      .select(
        'id, name, icon, amount, estimate, due_date, group_kind, category_id, direction, certainty, context, recurring_id, fulfilled_txn_id',
      )
      .eq('household_id', membership.householdId)
      .eq('month', monthStart),
    supabase
      .from('transactions')
      .select('account_id, merchant_name, kind')
      .eq('household_id', membership.householdId)
      .eq('context', 'household')
      .is('archived_at', null)
      .gte('date', monthStart)
      .lt('date', followingMonthStart),
    supabase
      .from('categories')
      .select('id, icon')
      .eq('household_id', membership.householdId)
      .is('archived_at', null),
    supabase
      .from('installment_entries')
      .select('plan_id, amount')
      .eq('household_id', membership.householdId)
      .eq('due_month', monthStart),
    supabase
      .from('installment_plans')
      .select('id')
      .eq('household_id', membership.householdId)
      .eq('context', 'household'),
  ]);

  const error =
    recurringResult.error ??
    expectedResult.error ??
    transactionsResult.error ??
    categoriesResult.error ??
    installmentEntriesResult.error ??
    installmentPlansResult.error;
  if (error) {
    throw new Error('Unable to load persisted planning', { cause: error });
  }

  const recurringRows = (recurringResult.data ?? []) as RecurringRow[];
  const expectedRows = (expectedResult.data ?? []) as ExpectedRow[];
  const transactionRows = transactionsResult.data ?? [];
  const categoryIcons = new Map(
    (categoriesResult.data ?? []).map((category) => [
      category.id,
      category.icon,
    ]),
  );
  const expectedRecurringIds = new Set(
    expectedRows.flatMap((expected) =>
      expected.context === 'household' &&
      expected.direction === 'outflow' &&
      expected.recurring_id
        ? [expected.recurring_id]
        : [],
    ),
  );
  const paidRecurringKeys = new Set(
    transactionRows
      .filter((transaction) => transaction.kind === 'expense')
      .map(
        (transaction) =>
          `${transaction.account_id}:${normalizeMerchant(transaction.merchant_name)}`,
      ),
  );

  const recurringItems: PlanItem[] = recurringRows
    .filter(
      (recurring) =>
        recurring.direction === 'outflow' &&
        recurring.amount !== null &&
        !expectedRecurringIds.has(recurring.id) &&
        recurringAppliesInMonth(recurring, month),
    )
    .map((recurring) => ({
      id: `recurring-${recurring.id}`,
      name: recurring.name,
      icon:
        (recurring.category_id
          ? categoryIcons.get(recurring.category_id)
          : undefined) ?? 'event_repeat',
      dueLabel: recurringDueLabel(recurring),
      amount: agorot(recurring.amount ?? 0),
      estimate: recurring.estimate,
      fulfilled: paidRecurringKeys.has(
        `${recurring.account_id ?? ''}:${normalizeMerchant(recurring.name)}`,
      ),
      direction: 'outflow',
    }));

  const expectedOutflows = expectedRows.filter(
    (expected) =>
      expected.context === 'household' &&
      expected.direction === 'outflow',
  );
  const expectedItems = expectedOutflows.map((expected) => ({
    group: expected.group_kind,
    item: {
      id: expected.id,
      name: expected.name,
      icon:
        expected.icon ??
        (expected.category_id
          ? categoryIcons.get(expected.category_id)
          : undefined) ??
        'event',
      dueLabel: expected.due_date
        ? formatDayMonth(expected.due_date)
        : expected.estimate
          ? 'הערכה לחודש'
          : 'במהלך החודש',
      amount: agorot(expected.amount),
      estimate: expected.estimate,
      fulfilled: expected.fulfilled_txn_id !== null,
      direction: 'outflow' as const,
    },
  }));

  const planIds = new Set(
    (installmentPlansResult.data ?? []).map((plan) => plan.id),
  );
  const installmentAmounts = (installmentEntriesResult.data ?? [])
    .filter((entry) => planIds.has(entry.plan_id))
    .map((entry) => entry.amount);
  const committedInstallments = agorot(
    installmentAmounts.reduce((total, amount) => total + amount, 0),
  );
  const income = agorot(
    expectedRows
      .filter(
        (expected) =>
          expected.direction === 'inflow' &&
          expected.certainty !== 'uncertain',
      )
      .reduce((total, expected) => total + expected.amount, 0),
  );
  const uncertainIncome = agorot(
    expectedRows
      .filter(
        (expected) =>
          expected.direction === 'inflow' &&
          expected.certainty === 'uncertain',
      )
      .reduce((total, expected) => total + expected.amount, 0),
  );
  const plannedOutflows = expectedOutflows.reduce(
    (total, expected) => total + expected.amount,
    recurringItems.reduce((total, item) => total + item.amount, 0),
  );
  const expectedExpenses = agorot(
    plannedOutflows + committedInstallments,
  );

  return {
    month,
    income,
    uncertainIncome,
    expectedExpenses,
    balance: agorot(income - expectedExpenses),
    committedInstallments,
    installmentsCount: installmentAmounts.length,
    groups: [
      {
        key: 'fixed',
        title: 'קבוע',
        items: recurringItems.concat(
          expectedItems
            .filter(({ group }) => group === 'fixed')
            .map(({ item }) => item),
        ),
      },
      {
        key: 'variable_estimate',
        title: 'משתנה · הערכה',
        items: expectedItems
          .filter(({ group }) => group === 'variable_estimate')
          .map(({ item }) => item),
      },
      {
        key: 'one_time',
        title: 'חד־פעמי',
        items: expectedItems
          .filter(({ group }) => group === 'one_time')
          .map(({ item }) => item),
      },
    ],
  };
}
