import 'server-only';

import type { FinanceDb } from '@/types/domain';
import { financeDb } from '@/mocks';

/**
 * Repository layer — the only door to persisted data. Mock-backed today; the
 * Supabase implementation replaces the internals without touching callers.
 * Server-only: mock data never ships to the client wholesale — screens pass
 * down exactly what they render.
 */

export async function getFinanceDb(): Promise<FinanceDb> {
  return financeDb;
}

export async function getOpenReviewCount(): Promise<number> {
  return financeDb.reviewItems.filter((r) => r.status === 'open').length;
}
