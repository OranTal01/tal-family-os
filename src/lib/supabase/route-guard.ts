import { authRoutes, routes } from '@/lib/routes';

type ResolveAuthRedirectInput = {
  pathname: string;
  isAuthenticated: boolean;
};

/**
 * Pure route-protection decision, kept free of NextRequest/NextResponse so it's
 * unit-testable directly. `/login` is the only public path — everything else
 * (including `/`) requires a session. Returns the path to redirect to, or `null`
 * to let the request through unchanged.
 */
export function resolveAuthRedirect({
  pathname,
  isAuthenticated,
}: ResolveAuthRedirectInput): string | null {
  const isLoginPath = pathname === authRoutes.login;

  if (!isAuthenticated && !isLoginPath) return authRoutes.login;
  if (isAuthenticated && isLoginPath) return routes.dashboard;
  return null;
}
