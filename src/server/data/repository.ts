/**
 * Repository layer — the only door to persisted data. Mock-backed today;
 * a Supabase implementation replaces the internals without touching callers.
 * (Filled out in the domain phase; shell needs only the review count for now.)
 */

export async function getOpenReviewCount(): Promise<number> {
  return 4;
}
