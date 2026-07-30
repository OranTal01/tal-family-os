import 'server-only';

import { getCurrentHouseholdMembership } from '@/lib/supabase/dal';
import { createClient } from '@/lib/supabase/server';
import type { SyncState } from '@/components/shell/sync-status';

export type ShellData = {
  reviewCount: number;
  syncState: SyncState;
  syncedAgo: string;
};

function importFreshness(createdAt: string, now = new Date()): string {
  const importedAt = new Date(createdAt);
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - importedAt.getTime()) / 60_000),
  );
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export async function getShellData(): Promise<ShellData> {
  const membership = await getCurrentHouseholdMembership();
  if (!membership) {
    return { reviewCount: 0, syncState: 'idle', syncedAgo: '' };
  }

  const supabase = await createClient();
  const [reviewResult, latestImportResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', membership.householdId)
      .eq('needs_review', true)
      .is('archived_at', null),
    supabase
      .from('import_batches')
      .select('created_at')
      .eq('household_id', membership.householdId)
      .neq('status', 'rolled_back')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const error = reviewResult.error ?? latestImportResult.error;
  if (error) {
    throw new Error('Unable to load persisted shell data', { cause: error });
  }

  const latestImport = latestImportResult.data;
  return {
    reviewCount: reviewResult.count ?? 0,
    syncState: latestImport ? 'imported' : 'idle',
    syncedAgo: latestImport ? importFreshness(latestImport.created_at) : '',
  };
}
