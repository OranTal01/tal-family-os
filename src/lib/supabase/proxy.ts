import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database.generated';
import { readSupabaseEnv } from './env';

/**
 * Session refresh for the root proxy (Next 16's successor to middleware).
 * Revalidates the auth token on each matched request and writes refreshed
 * cookies to both the forwarded request and the response.
 *
 * Soft no-op when the Supabase environment is not configured, so the app
 * keeps working in the mock-data phase and in environments without secrets.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = readSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Verifies the JWT and triggers a token refresh when needed. With no auth
  // session (the current state of the app) this resolves locally to null.
  await supabase.auth.getClaims();

  return response;
}
