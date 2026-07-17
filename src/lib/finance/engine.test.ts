import { describe, expect, it } from 'vitest';
import type {
  Account,
  Business,
  Category,
  ExpectedTransaction,
  InstallmentPlan,
  MonthBudget,
  Transaction,
} from '@/types/domain';
import { ils } from '@/types/money';
import {
  actualBusinessRevenue,
  actualFamilyIncome,
  actualHouseholdIncome,
  expectedGuaranteedIncome,
  expectedUncertainIncome,
  remainingGuaranteedIncome,
} from '@/lib/finance/income';
import {
  actualSpending,
  categorySpending,
  remainingExpectedSpending,
} from '@/lib/finance/spending';
import {
  activeCategories,
  applyAdjustment,
  summarizeCategory,
  totalBudget,
} from '@/lib/finance/budgets';
import {
  installmentLabel,
  monthlyPortion,
  paidCount,
  remainingCommitment,
  remainingCount,
} from '@/lib/finance/installments';
import { monthBalance, projectedEndOfMonth } from '@/lib/finance/projections';
import { summarizeBusiness } from '@/lib/finance/business';
import { summarizeNetWorth } from '@/lib/finance/net-worth';

const M = '2026-07';
const midMonth = new Date(2026, 6, 17);

let n = 0;
function t(partial: Partial<Transaction> & { amount: Transaction['amount'] }): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    accountId: 'acc-joint',
    date: '2026-07-10',
    merchant: 'עסק',
    icon: 'shopping_cart',
    context: 'household',
    kind: 'expense',
    ...partial,
  };
}

const groceries: Category = {
  id: 'cat-groceries',
  name: 'סופר וקניות',
  shortName: 'סופר',
  icon: 'shopping_cart',
  context: 'household',
  priority: 'essential',
  sortOrder: 1,
};

describe('internal transfers', () => {
  const txns = [
    t({ kind: 'income', amount: ils(10000), incomeClass: 'salary' }),
    t({ amount: ils(-500), categoryId: 'cat-groceries' }),
    // ATM withdrawal bank→cash: never income or expense
    t({ kind: 'transfer', amount: ils(-1000), transferId: 'tr1' }),
    t({ kind: 'transfer', amount: ils(1000), accountId: 'acc-cash', transferId: 'tr1' }),
  ];

  it('are excluded from income', () => {
    expect(actualFamilyIncome(txns, M)).toBe(ils(10000));
  });

  it('are excluded from spending', () => {
    expect(actualSpending(txns, M)).toBe(ils(500));
  });
});

describe('Bit and PayBox income', () => {
  // business income lands in the wallet, then moves to the bank as a transfer
  const txns = [
    t({
      kind: 'income',
      amount: ils(2600),
      accountId: 'acc-bit',
      context: 'business',
      incomeClass: 'business',
    }),
    t({ kind: 'transfer', amount: ils(-2600), accountId: 'acc-bit', transferId: 'tr2' }),
    t({ kind: 'transfer', amount: ils(2600), accountId: 'acc-joint', transferId: 'tr2' }),
    t({
      kind: 'income',
      amount: ils(2400),
      accountId: 'acc-paybox',
      context: 'business',
      incomeClass: 'business',
    }),
    t({ kind: 'transfer', amount: ils(-2400), accountId: 'acc-paybox', transferId: 'tr3' }),
    t({ kind: 'transfer', amount: ils(2400), accountId: 'acc-joint', transferId: 'tr3' }),
  ];

  it('counts Bit income exactly once, when received', () => {
    expect(actualBusinessRevenue(txns.slice(0, 3), M)).toBe(ils(2600));
    expect(actualFamilyIncome(txns.slice(0, 3), M)).toBe(ils(2600));
  });

  it('counts PayBox income exactly once despite the sweep to the bank', () => {
    expect(actualFamilyIncome(txns, M)).toBe(ils(5000));
    expect(actualBusinessRevenue(txns, M)).toBe(ils(5000));
  });
});

describe('installments', () => {
  // ₪1,000 in 3 charges of ₪333 — the last charge absorbs the rounding
  const plan: InstallmentPlan = {
    id: 'p1',
    merchant: 'KSP',
    icon: 'devices',
    totalAmount: ils(1000),
    monthlyAmount: ils(333),
    count: 3,
    firstChargeMonth: '2026-06',
    accountId: 'acc-card-oran',
    categoryId: 'cat-groceries',
    context: 'household',
  };

  it('charges only the current-month portion', () => {
    expect(monthlyPortion(plan, '2026-06')).toBe(ils(333));
    expect(monthlyPortion(plan, '2026-07')).toBe(ils(333));
    expect(monthlyPortion(plan, '2026-05')).toBe(0);
    expect(monthlyPortion(plan, '2026-09')).toBe(0);
  });

  it('last installment absorbs rounding so the charges sum to the total', () => {
    expect(monthlyPortion(plan, '2026-08')).toBe(ils(334));
    const total =
      monthlyPortion(plan, '2026-06') +
      monthlyPortion(plan, '2026-07') +
      monthlyPortion(plan, '2026-08');
    expect(total).toBe(plan.totalAmount);
  });

  it('tracks paid/remaining and the row label', () => {
    expect(paidCount(plan, M)).toBe(2);
    expect(remainingCount(plan, M)).toBe(1);
    expect(remainingCommitment(plan, M)).toBe(ils(334));
    expect(installmentLabel(plan, M)).toBe('תשלום 2 מתוך 3');
  });

  it('only the monthly charge row hits actual spending', () => {
    const charge = t({
      amount: ils(-333),
      categoryId: 'cat-groceries',
      installment: { planId: 'p1', sequence: 2 },
    });
    expect(actualSpending([charge], M)).toBe(ils(333));
  });
});

describe('household vs business separation', () => {
  const txns = [
    t({ kind: 'income', amount: ils(18200), incomeClass: 'salary' }),
    t({ kind: 'income', amount: ils(7400), context: 'business', incomeClass: 'business' }),
    t({ amount: ils(-500), categoryId: 'cat-groceries' }),
    t({ amount: ils(-2400), context: 'business', categoryId: 'cat-biz-equipment' }),
  ];
  const business: Business = {
    id: 'b1',
    ownerId: 'danielle',
    name: 'עסק',
    legalForm: 'עוסק מורשה',
    vatRate: 0.18,
    nextVatReportLabel: '15 באוגוסט',
  };

  it('business revenue contributes to family income', () => {
    expect(actualFamilyIncome(txns, M)).toBe(ils(25600));
    expect(actualHouseholdIncome(txns, M)).toBe(ils(18200));
  });

  it('business expenses never mix into household spending', () => {
    expect(actualSpending(txns, M, 'household')).toBe(ils(500));
    expect(actualSpending(txns, M, 'business')).toBe(ils(2400));
  });

  it('business summary is self-consistent and VAT stays informational', () => {
    const s = summarizeBusiness(txns, M, business);
    expect(s.revenue).toBe(ils(7400));
    expect(s.expenses).toBe(ils(2400));
    expect(s.profitBeforeTax).toBe(ils(5000));
    expect(s.vatDueEstimate).toBeGreaterThan(0);
    expect(s.vatDueEstimate).toBeLessThan(s.revenue);
  });
});

describe('category budgets', () => {
  const budget: MonthBudget = {
    month: M,
    context: 'household',
    items: [
      { categoryId: 'cat-groceries', amount: ils(800) },
      { categoryId: 'cat-fun', amount: ils(750) },
    ],
  };

  it('detects overspending with the exact overage', () => {
    const txns = [t({ amount: ils(-940), categoryId: 'cat-groceries' })];
    const s = summarizeCategory(groceries, budget, txns, M, midMonth);
    expect(s.status).toBe('over');
    expect(s.overspend).toBe(ils(140));
    expect(s.remaining).toBe(0);
    expect(s.utilization).toBeCloseTo(117.5);
  });

  it('flags near-limit at 80% utilization', () => {
    const txns = [t({ amount: ils(-680), categoryId: 'cat-groceries' })];
    const s = summarizeCategory(groceries, budget, txns, M, midMonth);
    expect(s.status).toBe('near');
  });

  it('refunds reduce category spending in their own month', () => {
    const txns = [
      t({ amount: ils(-500), categoryId: 'cat-groceries' }),
      t({ kind: 'refund', amount: ils(120), categoryId: 'cat-groceries' }),
    ];
    expect(categorySpending(txns, M, 'cat-groceries')).toBe(ils(380));
  });

  it('reallocation moves budget between categories without changing the total', () => {
    const before = totalBudget(budget);
    const adjusted = applyAdjustment(budget, {
      id: 'a1',
      month: M,
      categoryId: 'cat-groceries',
      delta: ils(200),
      kind: 'reallocation',
      counterpartCategoryId: 'cat-fun',
      scope: 'one_time',
      note: 'איזון',
      byId: 'oran',
      atLabel: 'עכשיו',
    });
    expect(totalBudget(adjusted)).toBe(before);
    expect(adjusted.items.find((i) => i.categoryId === 'cat-groceries')?.amount).toBe(ils(1000));
    expect(adjusted.items.find((i) => i.categoryId === 'cat-fun')?.amount).toBe(ils(550));
  });

  it('archived categories leave pickers but keep their history countable', () => {
    const archived: Category = { ...groceries, id: 'cat-pets', archived: true };
    expect(activeCategories([groceries, archived], 'household')).toEqual([groceries]);
    const txns = [t({ amount: ils(-380), categoryId: 'cat-pets' })];
    expect(categorySpending(txns, M, 'cat-pets')).toBe(ils(380));
  });
});

describe('expected flows and projections', () => {
  const expected: ExpectedTransaction[] = [
    {
      id: 'e1',
      month: M,
      name: 'משכורת אורן',
      icon: 'south_west',
      amount: ils(21400),
      dueLabel: '25 ביולי',
      group: 'fixed',
      direction: 'inflow',
      certainty: 'guaranteed',
      context: 'household',
      fulfilled: false,
    },
    {
      id: 'e2',
      month: M,
      name: 'משכורת דניאל',
      icon: 'south_west',
      amount: ils(18200),
      dueLabel: '10 ביולי',
      group: 'fixed',
      direction: 'inflow',
      certainty: 'guaranteed',
      context: 'household',
      fulfilled: true,
    },
    {
      id: 'e3',
      month: M,
      name: 'שת״פ אינסטגרם',
      icon: 'photo_camera',
      amount: ils(2500),
      dueLabel: 'לא ודאי',
      group: 'one_time',
      direction: 'inflow',
      certainty: 'uncertain',
      context: 'business',
      fulfilled: false,
    },
    {
      id: 'e4',
      month: M,
      name: 'ארנונה',
      icon: 'home',
      amount: ils(610),
      dueLabel: '25 ביולי',
      group: 'one_time',
      direction: 'outflow',
      context: 'household',
      fulfilled: false,
    },
    {
      id: 'e5',
      month: M,
      name: 'משכנתא',
      icon: 'account_balance',
      amount: ils(6200),
      dueLabel: '1 ביולי',
      group: 'fixed',
      direction: 'outflow',
      context: 'household',
      fulfilled: true,
    },
  ];

  it('uncertain income is never treated as guaranteed', () => {
    expect(expectedGuaranteedIncome(expected, M)).toBe(ils(39600));
    expect(expectedUncertainIncome(expected, M)).toBe(ils(2500));
    expect(remainingGuaranteedIncome(expected, M)).toBe(ils(21400));
  });

  it('future expected expenses count only while unfulfilled', () => {
    expect(remainingExpectedSpending(expected, M)).toBe(ils(610));
  });

  it('projected end of month = liquid balance + remaining income − remaining expenses', () => {
    const accounts: Account[] = [
      { id: 'a', name: 'עו״ש', type: 'bank', icon: 'account_balance', sync: 'ok', balance: ils(23450), balanceLabel: 'יתרה', context: 'household' },
      { id: 'b', name: 'Bit', type: 'wallet', icon: 'wallet', sync: 'ok', balance: ils(600), balanceLabel: 'יתרה', context: 'household' },
      // business accounts and credit cards stay out of the liquid balance
      { id: 'c', name: 'עסק', type: 'bank', icon: 'account_balance', sync: 'ok', balance: ils(18900), balanceLabel: 'יתרה', context: 'business' },
      { id: 'd', name: 'ויזה', type: 'credit_card', icon: 'credit_card', sync: 'ok', balance: ils(8240), balanceLabel: 'חיוב צפוי', context: 'household' },
    ];
    expect(projectedEndOfMonth(accounts, expected, M)).toBe(ils(23450 + 600 + 21400 - 610));
  });

  it('month balance = guaranteed income − spent − remaining expected', () => {
    const txns = [t({ amount: ils(-18400), categoryId: 'cat-groceries' })];
    expect(monthBalance(txns, expected, M)).toBe(ils(39600 - 18400 - 610));
  });
});

describe('net worth', () => {
  it('שווי נטו = נכסים − התחייבויות', () => {
    const s = summarizeNetWorth(
      [
        { id: '1', name: 'דירה', subtitle: '', icon: 'home', type: 'real_estate', chip: 'נכס', value: ils(2450000) },
        { id: '2', name: 'פנסיה', subtitle: '', icon: 'elderly', type: 'pension', chip: 'פנסיה', value: ils(791900) },
      ],
      [{ id: 'l1', name: 'משכנתא', subtitle: '', icon: 'home', balance: ils(820000) }],
    );
    expect(s.totalAssets).toBe(ils(3241900));
    expect(s.netWorth).toBe(ils(2421900));
  });
});
