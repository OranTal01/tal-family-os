import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database.generated';
import { requireSupabaseEnv } from './env';

/**
 * Server-side Supabase client for Server Components, Server Functions and
 * Route Handlers. Create a fresh client per request — never share one across
 * requests.
 *
 * `cookies()` is called before the env check on purpose: it's a Next.js
 * "dynamic API", so calling it first signals the route can't be statically
 * prerendered *before* a missing-env error has a chance to fire. Otherwise a
 * build without the Supabase env configured (e.g. a misconfigured Vercel
 * project) fails the entire `next build` during static generation instead of
 * just failing that page at request time.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requireSupabaseEnv();

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
