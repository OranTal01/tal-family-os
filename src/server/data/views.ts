import type { CategoryStatusKey } from '@/components/finance/status-badge';
import {
  currentMonthKey,
  type MonthKey,
} from '@/lib/format/date';
import type { InsightModel } from '@/lib/finance/insights';
import type { Context, Transaction } from '@/types/domain';
import type { Agorot } from '@/types/money';

/**
 * Serializable view-model contracts shared by server data readers and UI
 * components. Implementations live in persisted-*.ts and read Supabase only.
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

/** Month param parsing shared by all month-scoped pages. */
export function resolveMonth(
  raw: string | string[] | undefined,
): MonthKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? (value as MonthKey)
    : currentMonthKey();
}

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
  isRecurring?: boolean;
};

export type TransactionsScreen = {
  items: TransactionItem[];
  categories: CategoryOption[];
  reviewCount: number;
};

export type ReviewCardView = {
  id: string;
  transactionId: string;
  icon: string;
  name: string;
  note: string;
  reasonLabel: string;
  actionLabel: string;
  amount: Agorot;
  suggestedCategoryId?: string;
  isIncome: boolean;
};

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
  groups: {
    key: 'fixed' | 'variable_estimate' | 'one_time';
    title: string;
    items: PlanItem[];
  }[];
};

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

export type BusinessScreen = SplitScreen['business'] & {
  uncertainIncome: Agorot;
  transactions: TransactionItem[];
};

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
  savingsMovements: {
    id: string;
    name: string;
    dateLabel: string;
    amount: Agorot;
  }[];
};

export type GoalView = {
  id: string;
  name: string;
  icon: string;
  target: Agorot;
  current: Agorot;
  monthlyDeposit: Agorot;
  forecastLabel?: string;
  utilization: number;
  beneficiaryId?: string;
  contributions: {
    id: string;
    label: string;
    dateLabel: string;
    amount: Agorot;
  }[];
};
