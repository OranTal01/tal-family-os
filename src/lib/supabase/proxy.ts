import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/types/database.generated';
import { authRoutes } from '@/lib/routes';
import { readSupabaseEnv } from './env';
import { resolveAuthRedirect } from './route-guard';

/**
 * Session refresh + route protection for the root proxy (Next 16's successor to
 * middleware). Revalidates the auth token on each matched request, writes
 * refreshed cookies to both the forwarded request and the response, and — this
 * is only the optimistic gate — redirects based on a verified JWT check.
 *
 * `getClaims()` cryptographically verifies the session JWT (not merely "a cookie
 * is present"); it's still just the proxy layer, though. Real authorization for
 * data access lives in the DAL (`getCurrentUser`/`getCurrentProfile`) backed by
 * RLS, which is checked again close to the data on every request.
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
  // session this resolves locally to an error, i.e. unauthenticated.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && !!data?.claims;

  const redirectPath = resolveAuthRedirect({
    pathname: request.nextUrl.pathname,
    isAuthenticated,
  });

  if (redirectPath) {
    const redirectUrl = new URL(redirectPath, request.url);
    if (redirectPath === authRoutes.login) {
      redirectUrl.searchParams.set(
        'redirectedFrom',
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Carry over any cookies refreshed above (e.g. a rotated refresh token) —
    // otherwise the redirect would silently drop the new session.
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}
