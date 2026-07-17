'use client';

import * as React from 'react';

/** SSR-safe media query subscription (false on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop per the design breakpoints (≥1024): modal instead of bottom sheet. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
