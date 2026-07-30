'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { MonthSelector } from '@/components/shell/month-selector';
import {
  SyncStatus,
  type SyncState,
} from '@/components/shell/sync-status';
import { monthScopedRoutes, routeKeyFromPathname } from '@/lib/routes';

/**
 * Sticky desktop top bar: month selector (on month-scoped screens),
 * sync status, and global search/notifications placeholders.
 * Mobile screens render their own compact headers instead.
 */
export function TopBar({
  syncState,
  syncedAgo,
}: {
  syncState: SyncState;
  syncedAgo: string;
}) {
  const pathname = usePathname();
  const routeKey = routeKeyFromPathname(pathname);
  const monthScoped = routeKey ? monthScopedRoutes.includes(routeKey) : false;

  return (
    <header className='sticky top-0 z-40 hidden h-14 items-center gap-4 border-b border-line bg-bg/90 px-6 backdrop-blur lg:flex'>
      {monthScoped ? (
        <React.Suspense>
          <MonthSelector />
        </React.Suspense>
      ) : (
        <span aria-hidden />
      )}
      <SyncStatus state={syncState} detail={syncedAgo} />
      <div className='flex-1' />
      <button
        type='button'
        aria-label='חיפוש'
        className='flex size-9 items-center justify-center rounded-md text-mut outline-none transition-colors hover:bg-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50'
      >
        <Icon name='search' className='text-[20px]' />
      </button>
      <button
        type='button'
        aria-label='התראות'
        className='flex size-9 items-center justify-center rounded-md text-mut outline-none transition-colors hover:bg-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50'
      >
        <Icon name='notifications' className='text-[20px]' />
      </button>
    </header>
  );
}
