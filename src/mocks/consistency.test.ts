import { describe, expect, it } from 'vitest';
import { financeDb } from '@/mocks';
import { currentMonthKey } from '@/lib/format/date';
import { actualFamilyIncome, actualHouseholdIncome, actualBusinessRevenue } from '@/lib/finance/income';
import { actualSpending } from '@/lib/finance/spending';
import { summarizeBusiness } from '@/lib/finance/business';
import { summarizeNetWorth } from '@/lib/finance/net-worth';
import { totalBudget } from '@/lib/finance/budgets';
import { ils } from '@/types/money';

/**
 * Guards the core promise: every screen derives from the same dataset through
 * the same engine, so numbers can never contradict across screens.
 */

const month = currentMonthKey();
const db = financeDb;

describe('mock dataset consistency', () => {
  it('every transaction references a real account and category', () => {
    const accountIds = new Set(db.accounts.map((a) => a.id));
    const categoryIds = new Set(db.categories.map((c) => c.id));
    for (const t of db.transactions) {
      expect(accountIds.has(t.accountId), `account ${t.accountId}`).toBe(true);
      if (t.categoryId) expect(categoryIds.has(t.categoryId), `category ${t.categoryId}`).toBe(true);
    }
  });

  it('transfers always come in balanced pairs', () => {
    const byTransfer = new Map<string, number>();
    for (const t of db.transactions) {
      if (t.kind !== 'transfer') continue;
      expect(t.transferId).toBeDefined();
      byTransfer.set(t.transferId!, (byTransfer.get(t.transferId!) ?? 0) + t.amount);
    }
    expect(byTransfer.size).toBeGreaterThan(0);
    for (const [id, sum] of byTransfer) {
      expect(sum, `transfer ${id} must net to zero`).toBe(0);
    }
  });

  it('family income = household income + business revenue (transfers excluded)', () => {
    const family = actualFamilyIncome(db.transactions, month);
    const household = actualHouseholdIncome(db.transactions, month);
    const business = actualBusinessRevenue(db.transactions, month);
    expect(family).toBe(household + business);
  });

  it('household spending contains no business transaction', () => {
    const withoutBusiness = db.transactions.filter((t) => t.context !== 'business');
    expect(actualSpending(db.transactions, month, 'household')).toBe(
      actualSpending(withoutBusiness, month, 'household'),
    );
  });

  it('business summary matches its own transactions', () => {
    const s = summarizeBusiness(db.transactions, month, db.business);
    expect(s.profitBeforeTax).toBe(s.revenue - s.expenses);
  });

  it('wealth figures reproduce the design totals', () => {
    const s = summarizeNetWorth(db.assets, db.liabilities);
    expect(s.totalAssets).toBe(ils(3241900));
    expect(s.totalLiabilities).toBe(ils(820000));
    expect(s.netWorth).toBe(ils(2421900));
  });

  it('insurance premiums total ₪1,033 per month, as on the insurance screen', () => {
    const total = db.insurancePolicies.reduce((sum, p) => sum + p.premiumMonthly, 0);
    expect(total).toBe(ils(1033));
  });

  it('children savings assets equal the kids goal balances', () => {
    const aria = db.assets.find((a) => a.id === 'as-kid-aria')!.value;
    const eli = db.assets.find((a) => a.id === 'as-kid-eli')!.value;
    expect(db.goals.find((g) => g.id === 'goal-aria')!.current).toBe(aria);
    expect(db.goals.find((g) => g.id === 'goal-eli')!.current).toBe(eli);
  });

  it('open review items reference review-flagged transactions', () => {
    const flagged = new Set(db.transactions.filter((t) => t.needsReview).map((t) => t.id));
    expect(db.reviewItems.length).toBe(flagged.size);
    for (const item of db.reviewItems) {
      expect(flagged.has(item.transactionId)).toBe(true);
    }
  });

  it('household monthly budget is the sum of its category budgets', () => {
    const budget = db.budgets.find((b) => b.month === month && b.context === 'household')!;
    const manual = budget.items.reduce((sum, i) => sum + i.amount, 0);
    expect(totalBudget(budget)).toBe(manual);
    expect(totalBudget(budget)).toBeGreaterThan(0);
  });
});
