import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database.generated';
import { requireSupabaseEnv } from './env';

/**
 * Server-side Supabase client for Server Components, Server Functions and
 * Route Handlers. Create a fresh client per request — never share one across
 * requests.
 */
export async function createClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component render, where cookies cannot be
          // written. Safe to ignore: the proxy refreshes sessions.
        }
      },
    },
  });
}
