import type { FinanceDb } from '@/types/domain';
import {
  accounts,
  budgetAdjustments,
  budgets,
  business,
  categories,
  household,
} from '@/mocks/core';
import {
  expected,
  incomeSources,
  installmentPlans,
  merchantRules,
  reviewItems,
  transactions,
} from '@/mocks/activity';
import {
  assets,
  goalContributions,
  goals,
  insurancePolicies,
  liabilities,
} from '@/mocks/wealth';

/** The complete mock database. Access only through src/server/data. */
export const financeDb: FinanceDb = {
  household,
  business,
  accounts,
  categories,
  budgets,
  budgetAdjustments,
  transactions,
  installmentPlans,
  expected,
  incomeSources,
  reviewItems,
  merchantRules,
  assets,
  liabilities,
  insurancePolicies,
  goals,
  goalContributions,
};
