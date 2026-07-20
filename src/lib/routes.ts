/**
 * Central route map + navigation registry.
 * All navigation (desktop sidebar, mobile bottom nav, "More" sheet, deep links)
 * reads from here — never hardcode paths in components.
 */

export const routes = {
  dashboard: '/dashboard',
  budget: '/budget',
  transactions: '/transactions',
  review: '/transactions/review',
  planning: '/planning',
  split: '/split',
  business: '/business',
  assets: '/assets',
  insurance: '/insurance',
  goals: '/goals',
  kids: '/kids',
  accounts: '/accounts',
  daily: '/daily',
  settings: '/settings',
} as const;

/**
 * Auth routes are intentionally kept out of `routes` — that object's keys drive
 * `mobileActiveKey`'s exhaustive nav map, and `/login` is never a nav destination.
 */
export const authRoutes = {
  login: '/login',
} as const;

export type RouteKey = keyof typeof routes;

export type NavItem = {
  key: RouteKey;
  href: string;
  label: string;
  /** Material Symbols Rounded icon name */
  icon: string;
  /** show the open-review-items count badge */
  showReviewBadge?: boolean;
};

/** Desktop sidebar — 10 primary items, in design order */
export const primaryNav: NavItem[] = [
  { key: 'dashboard', href: routes.dashboard, label: 'לוח חודשי', icon: 'space_dashboard' },
  { key: 'budget', href: routes.budget, label: 'תקציב חודשי', icon: 'donut_small' },
  { key: 'transactions', href: routes.transactions, label: 'תנועות', icon: 'receipt_long' },
  { key: 'review', href: routes.review, label: 'לבדיקה', icon: 'fact_check', showReviewBadge: true },
  { key: 'planning', href: routes.planning, label: 'תכנון וצפי', icon: 'event_upcoming' },
  { key: 'split', href: routes.split, label: 'בית מול עסק', icon: 'compare_arrows' },
  { key: 'assets', href: routes.assets, label: 'נכסים וחיסכון', icon: 'savings' },
  { key: 'insurance', href: routes.insurance, label: 'ביטוחים', icon: 'shield' },
  { key: 'accounts', href: routes.accounts, label: 'חשבונות וכרטיסים', icon: 'account_balance' },
  { key: 'settings', href: routes.settings, label: 'הגדרות', icon: 'settings' },
];

/** Mobile bottom bar — 5 items; "more" opens the MoreSheet */
export const mobileNav: NavItem[] = [
  { key: 'dashboard', href: routes.dashboard, label: 'לוח', icon: 'space_dashboard' },
  { key: 'budget', href: routes.budget, label: 'תקציב', icon: 'donut_small' },
  { key: 'transactions', href: routes.transactions, label: 'תנועות', icon: 'receipt_long' },
  { key: 'assets', href: routes.assets, label: 'נכסים', icon: 'savings' },
];

/** "עוד" sheet on mobile — the rest of the screens, in design order */
export const moreNav: NavItem[] = [
  { key: 'review', href: routes.review, label: 'תנועות לבדיקה', icon: 'fact_check', showReviewBadge: true },
  { key: 'planning', href: routes.planning, label: 'תכנון וצפי', icon: 'event_upcoming' },
  { key: 'split', href: routes.split, label: 'בית מול עסק', icon: 'compare_arrows' },
  { key: 'business', href: routes.business, label: 'עסק דניאל', icon: 'storefront' },
  { key: 'insurance', href: routes.insurance, label: 'ביטוחים', icon: 'shield' },
  { key: 'goals', href: routes.goals, label: 'יעדים פיננסיים', icon: 'flag' },
  { key: 'kids', href: routes.kids, label: 'חיסכון ילדים', icon: 'family_restroom' },
  { key: 'accounts', href: routes.accounts, label: 'חשבונות וכרטיסים', icon: 'account_balance' },
  { key: 'daily', href: routes.daily, label: 'סיכום יומי', icon: 'today' },
  { key: 'settings', href: routes.settings, label: 'הגדרות', icon: 'settings' },
];

/**
 * Which bottom-nav item is highlighted for each route
 * (secondary screens highlight "עוד").
 */
export const mobileActiveKey: Record<RouteKey, RouteKey | 'more'> = {
  dashboard: 'dashboard',
  budget: 'budget',
  transactions: 'transactions',
  review: 'transactions',
  planning: 'more',
  split: 'more',
  business: 'more',
  assets: 'assets',
  insurance: 'more',
  goals: 'more',
  kids: 'more',
  accounts: 'more',
  daily: 'more',
  settings: 'more',
};

/** Screens whose top bar shows the month selector */
export const monthScopedRoutes: RouteKey[] = [
  'dashboard',
  'budget',
  'transactions',
  'planning',
  'split',
  'business',
];

export function routeKeyFromPathname(pathname: string): RouteKey | null {
  const entries = Object.entries(routes) as [RouteKey, string][];
  // longest match first so /transactions/review resolves to "review"
  const match = entries
    .filter(([, href]) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b[1].length - a[1].length)[0];
  return match ? match[0] : null;
}
