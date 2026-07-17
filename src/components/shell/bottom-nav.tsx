'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import {
  mobileActiveKey,
  mobileNav,
  moreNav,
  routeKeyFromPathname,
} from '@/lib/routes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type BottomNavProps = {
  reviewCount: number;
};

/**
 * Mobile bottom navigation: לוח · תקציב · תנועות · נכסים · עוד.
 * "עוד" opens a bottom sheet with the remaining screens.
 * Touch targets ≥ 44px; active item = accent-ink + filled icon.
 */
export function BottomNav({ reviewCount }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const routeKey = routeKeyFromPathname(pathname);
  const activeKey = routeKey ? mobileActiveKey[routeKey] : null;

  return (
    <nav
      aria-label='ניווט תחתון'
      className='fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg lg:hidden'
    >
      <ul className='grid grid-cols-5'>
        {mobileNav.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'text-accent-ink' : 'text-mut',
                )}
              >
                <Icon name={item.icon} filled={active} className='text-[22px]' />
                <span className='text-micro font-bold'>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              className={cn(
                'flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                activeKey === 'more' ? 'text-accent-ink' : 'text-mut',
              )}
            >
              <Icon name='menu' className='text-[22px]' />
              <span className='text-micro font-bold'>עוד</span>
            </SheetTrigger>
            <SheetContent side='bottom' className='max-h-[80dvh] rounded-t-xl'>
              <SheetHeader>
                <SheetTitle>עוד מסכים</SheetTitle>
              </SheetHeader>
              <ul className='grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-6'>
                {moreNav.map((item) => {
                  const active = item.key === routeKey;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-body font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                          active
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-surface text-ink-2 hover:bg-muted',
                        )}
                      >
                        <Icon name={item.icon} className='text-[20px]' />
                        <span className='flex-1 truncate'>{item.label}</span>
                        {item.showReviewBadge && reviewCount > 0 && (
                          <span
                            className='flex size-5 items-center justify-center rounded-full bg-warn-soft text-micro font-bold text-warn-ink'
                            aria-label={`${reviewCount} תנועות לבדיקה`}
                          >
                            {reviewCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
