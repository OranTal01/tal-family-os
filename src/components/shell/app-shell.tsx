import { BottomNav } from '@/components/shell/bottom-nav';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/top-bar';
import type { SyncState } from '@/components/shell/sync-status';

/**
 * Single shell for all Finance screens: fixed right sidebar + sticky top bar
 * on desktop, bottom nav + "More" sheet on mobile. Content renders in the slot.
 */
export function AppShell({
  children,
  reviewCount,
  syncState,
  syncedAgo,
}: {
  children: React.ReactNode;
  reviewCount: number;
  syncState: SyncState;
  syncedAgo: string;
}) {
  return (
    <div className='min-h-dvh bg-bg'>
      <Sidebar reviewCount={reviewCount} />
      <div className='lg:ps-[206px]'>
        <TopBar syncState={syncState} syncedAgo={syncedAgo} />
        <main id='main'>{children}</main>
      </div>
      <BottomNav reviewCount={reviewCount} />
    </div>
  );
}
