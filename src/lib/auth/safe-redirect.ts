import { authRoutes, routes } from '@/lib/routes';

/**
 * Turns an untrusted post-login redirect target (e.g. the `redirectedFrom` query
 * param, which is attacker-controllable via a crafted link) into a safe internal
 * path. Only a value that is unambiguously a same-app path is accepted as-is;
 * anything else — an absolute URL, a protocol-relative URL, a `javascript:` URI,
 * or the login route itself — falls back to the dashboard.
 */
export function sanitizeRedirectTarget(value: string | null | undefined): string {
  if (!value) return routes.dashboard;
  if (!value.startsWith('/')) return routes.dashboard;
  if (value.startsWith('//')) return routes.dashboard;
  if (value.startsWith('/\\')) return routes.dashboard;
  if (value.includes('://')) return routes.dashboard;
  if (value === authRoutes.login || value.startsWith(`${authRoutes.login}?`)) {
    return routes.dashboard;
  }
  return value;
}
