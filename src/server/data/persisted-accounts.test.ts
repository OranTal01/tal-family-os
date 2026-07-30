import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  buildPersistedAccountItems,
  getPersistedAccountsScreen,
} from './persisted-accounts';

const bankAccount = {
  id: 'bank-1',
  name: 'הבנק הבינלאומי משותף',
  type: 'bank' as const,
  institution: 'הבנק הבינלאומי',
  last4: '3270',
  icon: 'account_balance',
  context: 'household' as const,
  opening_balance: 0,
  opening_balance_date: null,
  sort_order: 1,
};

describe('persisted accounts mapper', () => {
  it('uses the newest active bank snapshot and only later ledger movements', () => {
    const items = buildPersistedAccountItems({
      accounts: [bankAccount],
      transactions: [
        { account_id: 'bank-1', date: '2026-07-24', amount: -1_000 },
        { account_id: 'bank-1', date: '2026-07-26', amount: 5_000 },
      ],
      snapshots: [
        {
          financial_account_id: 'bank-1',
          import_batch_id: 'batch-old',
          balance: 10_000_000,
          snapshot_date: '2026-07-24',
          created_at: '2026-07-24T12:00:00Z',
        },
        {
          financial_account_id: 'bank-1',
          import_batch_id: 'batch-new',
          balance: 10_201_465,
          snapshot_date: '2026-07-25',
          created_at: '2026-07-25T12:00:00Z',
        },
      ],
      batches: [
        { id: 'batch-old', status: 'committed' },
        { id: 'batch-new', status: 'committed' },
      ],
    });

    expect(items[0]).toMatchObject({
      balance: 10_206_465,
      balanceLabel: 'יתרה',
      source: 'imported',
      subtitle: 'הבנק הבינלאומי · ••3270',
    });
  });

  it('ignores a snapshot whose import was fully rolled back', () => {
    const items = buildPersistedAccountItems({
      accounts: [{ ...bankAccount, opening_balance: 500_000 }],
      transactions: [],
      snapshots: [
        {
          financial_account_id: 'bank-1',
          import_batch_id: 'batch-rolled-back',
          balance: 10_201_465,
          snapshot_date: '2026-07-25',
          created_at: '2026-07-25T12:00:00Z',
        },
      ],
      batches: [{ id: 'batch-rolled-back', status: 'rolled_back' }],
    });

    expect(items[0]).toMatchObject({
      balance: 500_000,
      source: 'manual',
    });
  });

  it('shows a positive expected charge for a credit-card liability', () => {
    const items = buildPersistedAccountItems({
      accounts: [
        {
          ...bankAccount,
          id: 'card-1',
          name: 'כאל ••1639',
          type: 'credit_card',
          institution: 'כאל',
          last4: '1639',
        },
      ],
      transactions: [
        { account_id: 'card-1', date: '2026-07-24', amount: -22_000 },
        { account_id: 'card-1', date: '2026-07-25', amount: 2_000 },
      ],
      snapshots: [],
      batches: [],
    });

    expect(items[0]).toMatchObject({
      balance: 20_000,
      balanceLabel: 'חיוב מיובא',
    });
  });
});

describe('persisted accounts repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list without a household membership', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);

    await expect(getPersistedAccountsScreen()).resolves.toEqual([]);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
