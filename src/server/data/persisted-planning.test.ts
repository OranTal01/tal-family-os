import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPersistedPlanningScreen } from './persisted-planning';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getCurrentHouseholdMembership: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/dal', () => ({
  getCurrentHouseholdMembership: mocks.getCurrentHouseholdMembership,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

function result(data: unknown[]) {
  return Promise.resolve({ data, error: null });
}

function filteredQuery(
  rows: unknown[],
  operators: Array<'eq' | 'is' | 'gte' | 'lt'>,
) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  const next = () => query;
  for (const operator of operators) {
    query[operator] = vi.fn(next);
  }
  query.then = vi.fn((resolve) => result(rows).then(resolve));
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentHouseholdMembership.mockResolvedValue({
    householdId: 'household-1',
    role: 'owner',
  });

  const rows: Record<string, unknown[]> = {
    recurring_transactions: [
      {
        id: 'recurring-1',
        name: 'גן של אלי',
        amount: 250_000,
        estimate: false,
        category_id: 'category-kids',
        account_id: 'account-1',
        direction: 'outflow',
        day_of_month: 10,
        cadence: 'monthly',
        created_at: '2026-07-29T10:00:00Z',
      },
    ],
    expected_transactions: [
      {
        id: 'salary-1',
        name: 'משכורת אורן',
        icon: 'payments',
        amount: 1_000_000,
        estimate: false,
        due_date: '2026-08-25',
        group_kind: 'fixed',
        category_id: null,
        direction: 'inflow',
        certainty: 'guaranteed',
        context: 'household',
        recurring_id: null,
        fulfilled_txn_id: null,
      },
      {
        id: 'groceries-1',
        name: 'סופר',
        icon: null,
        amount: 150_000,
        estimate: true,
        due_date: null,
        group_kind: 'variable_estimate',
        category_id: 'category-groceries',
        direction: 'outflow',
        certainty: null,
        context: 'household',
        recurring_id: null,
        fulfilled_txn_id: null,
      },
    ],
    transactions: [
      {
        account_id: 'account-1',
        merchant_name: ' גן   של אלי ',
        kind: 'expense',
      },
    ],
    categories: [
      { id: 'category-kids', icon: 'child_care' },
      { id: 'category-groceries', icon: 'shopping_cart' },
    ],
    installment_entries: [{ plan_id: 'plan-1', amount: 20_000 }],
    installment_plans: [{ id: 'plan-1' }],
  };
  const operatorMap: Record<
    string,
    Array<'eq' | 'is' | 'gte' | 'lt'>
  > = {
    recurring_transactions: ['eq'],
    expected_transactions: ['eq'],
    transactions: ['eq', 'is', 'gte', 'lt'],
    categories: ['eq', 'is'],
    installment_entries: ['eq'],
    installment_plans: ['eq'],
  };
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => filteredQuery(rows[table] ?? [], operatorMap[table])),
  }));
  mocks.createClient.mockResolvedValue({ from });
});

describe('getPersistedPlanningScreen', () => {
  it('combines recurring expenses and the real monthly plan', async () => {
    const planning = await getPersistedPlanningScreen('2026-08');

    expect(planning).toEqual(
      expect.objectContaining({
        month: '2026-08',
        income: 1_000_000,
        uncertainIncome: 0,
        expectedExpenses: 420_000,
        balance: 580_000,
        committedInstallments: 20_000,
        installmentsCount: 1,
      }),
    );
    expect(planning.groups[0].items).toEqual([
      expect.objectContaining({
        id: 'recurring-recurring-1',
        name: 'גן של אלי',
        icon: 'child_care',
        dueLabel: '10 בכל חודש',
        amount: 250_000,
        fulfilled: true,
      }),
    ]);
    expect(planning.groups[1].items).toEqual([
      expect.objectContaining({
        name: 'סופר',
        icon: 'shopping_cart',
        amount: 150_000,
        estimate: true,
      }),
    ]);
  });

  it('does not load another household when membership is missing', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);

    const planning = await getPersistedPlanningScreen('2026-08');

    expect(planning.expectedExpenses).toBe(0);
    expect(planning.groups.every((group) => group.items.length === 0)).toBe(
      true,
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
