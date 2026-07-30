import type { Agorot } from '@/types/money';
import type { ISODate, MonthKey } from '@/lib/format/date';

/**
 * Domain model — mirrors docs/DATA_MODEL.md so the Supabase migration is
 * mechanical. All money is integer Agorot; expense flows are negative on
 * signed transaction amounts.
 */

export type Context = 'household' | 'business';

export type Person = {
  id: string;
  name: string;
  kind: 'adult' | 'child';
  /** display role, e.g. "בעלים · גישה מלאה" */
  role?: string;
  /** avatar initial */
  initial?: string;
};

export type Household = {
  id: string;
  name: string;
  members: Person[];
  carryOverEnabled: boolean;
};

export type Business = {
  id: string;
  ownerId: string;
  name: string;
  legalForm: 'עוסק מורשה';
  /** e.g. 0.18 — used only for the informational VAT card */
  vatRate: number;
  /** e.g. "15 באוגוסט" */
  nextVatReportLabel: string;
};

export type AccountType =
  | 'bank'
  | 'credit_card'
  | 'wallet'
  | 'cash'
  | 'investment'
  | 'savings'
  | 'pension'
  | 'education_fund'
  | 'other';

export type SyncState = 'ok' | 'syncing' | 'error';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** undefined = shared */
  ownerId?: string;
  icon: string;
  /** masked identifier, e.g. "••4821" */
  last4?: string;
  subtitle?: string;
  sync: SyncState;
  /** current balance (bank/wallet/cash) or expected charge (credit card) */
  balance?: Agorot;
  balanceLabel: 'יתרה' | 'חיוב צפוי';
  context: Context;
};

export type CategoryPriority = 'essential' | 'important' | 'flexible' | 'discretionary';

export type Category = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  context: Context;
  priority: CategoryPriority;
  sortOrder: number;
  archived?: boolean;
};

export type TransactionKind = 'expense' | 'income' | 'refund' | 'transfer';
export type IncomeClass = 'salary' | 'business' | 'other';
export type ReviewReason =
  | 'uncategorized'
  | 'unrecognized_merchant'
  | 'possible_duplicate'
  | 'possible_transfer'
  | 'low_confidence';

export type Transaction = {
  id: string;
  accountId: string;
  date: ISODate;
  /** "09:14" when known */
  time?: string;
  /** signed: outflow negative, inflow positive */
  amount: Agorot;
  merchant: string;
  icon: string;
  categoryId?: string;
  context: Context;
  ownerId?: string;
  kind: TransactionKind;
  incomeClass?: IncomeClass;
  needsReview?: boolean;
  reviewReason?: ReviewReason;
  /** set when this row is a monthly installment charge */
  installment?: { planId: string; sequence: number };
  /** links the two legs of an internal transfer */
  transferId?: string;
};

export type InstallmentPlan = {
  id: string;
  merchant: string;
  icon: string;
  totalAmount: Agorot;
  monthlyAmount: Agorot;
  count: number;
  firstChargeMonth: MonthKey;
  accountId: string;
  categoryId: string;
  context: Context;
};

export type ExpectedGroup = 'fixed' | 'variable_estimate' | 'one_time';

export type ExpectedTransaction = {
  id: string;
  month: MonthKey;
  name: string;
  icon: string;
  /** positive magnitude; direction carries the sign */
  amount: Agorot;
  estimate?: boolean;
  /** "25 ביולי" / "1 בכל חודש" / "שבועי" */
  dueLabel: string;
  group: ExpectedGroup;
  categoryId?: string;
  direction: 'inflow' | 'outflow';
  /** income only */
  certainty?: 'guaranteed' | 'uncertain';
  context: Context;
  /** already realized by an actual transaction (excluded from remaining) */
  fulfilled?: boolean;
};

export type IncomeSource = {
  id: string;
  personId: string;
  name: string;
  kind: IncomeClass;
  expectedAmount: Agorot;
  certainty: 'guaranteed' | 'uncertain';
};

export type BudgetItem = { categoryId: string; amount: Agorot };

export type MonthBudget = {
  month: MonthKey;
  context: Context;
  items: BudgetItem[];
};

export type BudgetAdjustment = {
  id: string;
  month: MonthKey;
  categoryId: string;
  delta: Agorot;
  kind: 'reallocation' | 'increase' | 'decrease' | 'exceptional';
  counterpartCategoryId?: string;
  scope: 'one_time' | 'permanent';
  note: string;
  byId: string;
  atLabel: string;
};

export type ReviewItem = {
  id: string;
  transactionId: string;
  reason: ReviewReason;
  reasonLabel: string;
  actionLabel: string;
  status: 'open' | 'resolved' | 'dismissed';
};

export type MerchantRule = {
  id: string;
  merchantPattern: string;
  categoryId?: string;
  context: Context;
  markAsTransfer?: boolean;
};

export type Asset = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  type:
    | 'real_estate'
    | 'pension'
    | 'education_fund'
    | 'provident_fund'
    | 'investment'
    | 'savings'
    | 'child_savings'
    | 'deposit';
  chip: string;
  value: Agorot;
  ownerId?: string;
};

export type Liability = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  /** positive magnitude, displayed negative */
  balance: Agorot;
};

export type InsurancePolicy = {
  id: string;
  name: string;
  provider: string;
  icon: string;
  premiumMonthly: Agorot;
  coverage: string;
  status: 'active' | 'renewal_due';
  /** e.g. "חידוש 20/08" */
  statusLabel: string;
  insuredId?: string;
};

export type Goal = {
  id: string;
  name: string;
  icon: string;
  target: Agorot;
  current: Agorot;
  monthlyDeposit: Agorot;
  beneficiaryId?: string;
  /** e.g. "בקצב הנוכחי: מרץ 2029" */
  forecastLabel?: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  amount: Agorot;
  date: ISODate;
  label: string;
};

/** Complete in-memory finance snapshot used by pure calculation helpers/tests. */
export type FinanceDb = {
  household: Household;
  business: Business;
  accounts: Account[];
  categories: Category[];
  budgets: MonthBudget[];
  budgetAdjustments: BudgetAdjustment[];
  transactions: Transaction[];
  installmentPlans: InstallmentPlan[];
  expected: ExpectedTransaction[];
  incomeSources: IncomeSource[];
  reviewItems: ReviewItem[];
  merchantRules: MerchantRule[];
  assets: Asset[];
  liabilities: Liability[];
  insurancePolicies: InsurancePolicy[];
  goals: Goal[];
  goalContributions: GoalContribution[];
};
