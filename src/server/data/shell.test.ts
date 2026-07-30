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

import { getShellData } from './shell';

describe('persisted shell data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('shows the real review count and latest import freshness', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T12:30:00Z'));
    mocks.getCurrentHouseholdMembership.mockResolvedValue({
      householdId: 'household-1',
      role: 'owner',
    });

    const reviewQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
    };
    reviewQuery.select.mockReturnValue(reviewQuery);
    reviewQuery.eq.mockReturnValue(reviewQuery);
    reviewQuery.is.mockResolvedValue({
      count: 3,
      data: null,
      error: null,
    });

    const importQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(),
    };
    importQuery.select.mockReturnValue(importQuery);
    importQuery.eq.mockReturnValue(importQuery);
    importQuery.neq.mockReturnValue(importQuery);
    importQuery.order.mockReturnValue(importQuery);
    importQuery.limit.mockReturnValue(importQuery);
    importQuery.maybeSingle.mockResolvedValue({
      data: { created_at: '2026-07-29T12:15:00Z' },
      error: null,
    });

    mocks.createClient.mockResolvedValue({
      from: vi.fn((table: string) =>
        table === 'transactions' ? reviewQuery : importQuery,
      ),
    });

    await expect(getShellData()).resolves.toEqual({
      reviewCount: 3,
      syncState: 'imported',
      syncedAgo: 'לפני 15 דק׳',
    });
  });

  it('uses an honest empty status before the first import', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);

    await expect(getShellData()).resolves.toEqual({
      reviewCount: 0,
      syncState: 'idle',
      syncedAgo: '',
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
