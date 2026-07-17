/**
 * Shell-level data (review badge count, sync freshness).
 * Mock implementation — the Supabase phase swaps this behind the same signature.
 */
export type ShellData = {
  reviewCount: number;
  syncedAgo: string;
};

export async function getShellData(): Promise<ShellData> {
  // Wired to the mock review repository in the domain phase.
  const { getOpenReviewCount } = await import('@/server/data/repository');
  return {
    reviewCount: await getOpenReviewCount(),
    syncedAgo: 'לפני 6 ד׳',
  };
}
