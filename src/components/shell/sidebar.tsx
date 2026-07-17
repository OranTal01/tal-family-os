'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { primaryNav, routeKeyFromPathname, routes } from '@/lib/routes';

type SidebarProps = {
  reviewCount: number;
};

/**
 * Fixed desktop sidebar, 206px, inline-start (right in RTL).
 * Active item: 3px accent bar + accent-soft background + accent-ink text.
 */
export function Sidebar({ reviewCount }: SidebarProps) {
  const pathname = usePathname();
  const activeKey = routeKeyFromPathname(pathname);

  return (
    <aside
      className='fixed inset-y-0 start-0 z-50 hidden w-[206px] flex-col border-e border-line bg-sidebar lg:flex'
      aria-label='ניווט ראשי'
    >
      <Link
        href={routes.dashboard}
        className='flex items-center gap-3 px-5 pt-6 pb-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
      >
        <span className='flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground'>
          <Icon name='account_balance_wallet' className='text-[22px]' />
        </span>
        <span className='flex flex-col'>
          <span className='text-subhead font-bold text-ink'>כספי הבית</span>
          <span className='text-caption font-semibold text-mut'>אורן ודניאל</span>
        </span>
      </Link>

      <nav className='flex-1 overflow-y-auto px-3 py-2'>
        <ul className='flex flex-col gap-0.5'>
          {primaryNav.map((item) => {
            const active = item.key === activeKey;
            return (
              <li key={item.key} className='relative'>
                {active && (
                  <span
                    aria-hidden
                    className='absolute inset-y-2 start-0 w-[3px] rounded-full bg-primary'
                  />
                )}
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-body font-semibold outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-mut hover:bg-muted hover:text-ink-2',
                  )}
                >
                  <Icon name={item.icon} filled={active} className='text-[20px]' />
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
      </nav>

      <div className='border-t border-line px-3 py-3'>
        <Link
          href={routes.settings}
          className='flex w-full items-center gap-3 rounded-md px-2 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          <span
            aria-hidden
            className='flex size-8 items-center justify-center rounded-full bg-surface-3 text-caption font-bold text-ink-2'
          >
            א
          </span>
          <span className='flex flex-1 flex-col'>
            <span className='text-caption font-bold text-ink'>אורן טל</span>
            <span className='text-micro font-semibold text-mut'>משק בית · טל</span>
          </span>
          <Icon name='unfold_more' className='text-[18px] text-mut' />
        </Link>
      </div>
    </aside>
  );
}
