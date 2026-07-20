import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database.generated';
import { requireSupabaseEnv } from './env';

/**
 * Browser-side Supabase client. `createBrowserClient` returns a singleton per
 * key pair, so calling this from multiple components is cheap.
 */
export function createClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
