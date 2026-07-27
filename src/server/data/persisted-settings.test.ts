import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPersistedSettingsScreen } from './persisted-settings';

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentHouseholdMembership.mockResolvedValue({
    householdId: 'household-1',
    role: 'owner',
  });

  const from = vi.fn((table: string) => {
    if (table === 'categories') {
      const result = Promise.resolve({
        data: [
          {
            id: 'category-1',
            name: 'תספורות וטיפוח',
            icon: 'content_cut',
            context: 'household',
          },
        ],
        error: null,
      });
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => result),
                })),
              })),
            })),
          })),
        })),
      };
    }

    const result = Promise.resolve({
      data: [
        {
          id: 'rule-1',
          merchant_pattern: 'מנטור ברבר שופ',
          category_id: 'category-1',
        },
      ],
      error: null,
    });
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => result),
          })),
        })),
      })),
    };
  });
  mocks.createClient.mockResolvedValue({ from });
});

describe('getPersistedSettingsScreen', () => {
  it('maps real categories and learned merchant rules for settings', async () => {
    await expect(getPersistedSettingsScreen()).resolves.toEqual({
      categories: [
        {
          id: 'category-1',
          name: 'תספורות וטיפוח',
          icon: 'content_cut',
          context: 'household',
        },
      ],
      rules: [
        {
          id: 'rule-1',
          pattern: 'מנטור ברבר שופ',
          categoryName: 'תספורות וטיפוח',
        },
      ],
    });
  });

  it('does not query another household when membership is missing', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);

    await expect(getPersistedSettingsScreen()).resolves.toEqual({
      categories: [],
      rules: [],
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
