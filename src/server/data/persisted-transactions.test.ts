import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPersistedTransactionsScreen } from './persisted-transactions';

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

function resolvedQuery(data: unknown[]) {
  return Promise.resolve({ data, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentHouseholdMembership.mockResolvedValue({
    householdId: 'household-1',
    role: 'owner',
  });

  const from = vi.fn((table: string) => {
    if (table === 'transactions') {
      const final = resolvedQuery([
        {
          id: 'transaction-1',
          account_id: 'account-1',
          date: '2026-07-26',
          amount: -12_345,
          merchant_name: 'צילום לעסק',
          category_id: null,
          context: 'business',
          owner_person_id: 'person-danielle',
          kind: 'expense',
          needs_review: true,
        },
      ]);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => final),
              })),
            })),
          })),
        })),
      };
    }

    const rows =
      table === 'financial_accounts'
        ? [{ id: 'account-1', name: 'כאל ••1639' }]
        : table === 'categories'
          ? []
          : [{ id: 'person-danielle', name: 'דניאל' }];
    const afterArchived = resolvedQuery(rows);
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() =>
            table === 'categories'
              ? {
                  order: vi.fn(() => afterArchived),
                }
              : afterArchived,
          ),
        })),
      })),
    };
  });

  mocks.createClient.mockResolvedValue({ from });
});

describe('getPersistedTransactionsScreen', () => {
  it('renders the real imported ledger instead of fixture transactions', async () => {
    const result = await getPersistedTransactionsScreen();

    expect(result.reviewCount).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'transaction-1',
        merchant: 'צילום לעסק',
        amount: -12_345,
        accountName: 'כאל ••1639',
        context: 'business',
        ownerId: 'danielle',
        needsReview: true,
        tag: {
          label: 'לבדיקה',
          tone: 'warn',
          icon: 'error',
        },
      }),
    ]);
  });

  it('returns an empty private screen without a household membership', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);

    await expect(getPersistedTransactionsScreen()).resolves.toEqual({
      items: [],
      categories: [],
      reviewCount: 0,
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
