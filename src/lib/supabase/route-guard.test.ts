import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect } from '@/lib/supabase/route-guard';

describe('resolveAuthRedirect (proxy route protection)', () => {
  it('redirects an unauthenticated visitor on a protected route to /login', () => {
    expect(
      resolveAuthRedirect({ pathname: '/dashboard', isAuthenticated: false }),
    ).toBe('/login');
    expect(resolveAuthRedirect({ pathname: '/', isAuthenticated: false })).toBe('/login');
  });

  it('lets an unauthenticated visitor stay on /login', () => {
    expect(resolveAuthRedirect({ pathname: '/login', isAuthenticated: false })).toBeNull();
  });

  it('redirects an authenticated user away from /login to /dashboard', () => {
    expect(resolveAuthRedirect({ pathname: '/login', isAuthenticated: true })).toBe(
      '/dashboard',
    );
  });

  it('lets an authenticated user stay on any protected route', () => {
    expect(
      resolveAuthRedirect({ pathname: '/dashboard', isAuthenticated: true }),
    ).toBeNull();
    expect(
      resolveAuthRedirect({ pathname: '/settings', isAuthenticated: true }),
    ).toBeNull();
  });
});
