'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CategoryView } from '@/server/data/views';
import { CategoryDetail } from '@/features/budget/category-detail';
import { RingGrid } from '@/features/budget/ring-grid';
import { SectionCard } from '@/components/finance/section-card';
import { Icon } from '@/components/ui/icon';
import { routes } from '@/lib/routes';

/**
 * Dashboard ring grid: 6–8 highlighted categories + a "View all" tile;
 * tapping a ring opens the category detail sheet/modal.
 */
export function RingsSection({ categories }: { categories: CategoryView[] }) {
  const [selected, setSelected] = React.useState<CategoryView | null>(null);

  // surface what needs attention first: over → near → largest budgets
  const ordered = React.useMemo(() => {
    const rank = { over: 0, near: 1, healthy: 2 } as const;
    return [...categories].sort(
      (a, b) => rank[a.status] - rank[b.status] || b.allocated - a.allocated,
    );
  }, [categories]);

  const shown = ordered.slice(0, 7);
  const restCount = Math.max(categories.length - shown.length, 0);

  return (
    <SectionCard
      title='תקציב לפי קטגוריה'
      action={
        <Link
          href={routes.budget}
          className='rounded-md px-2 py-1 text-caption font-bold text-accent-ink outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          כל הקטגוריות
        </Link>
      }
    >
      <RingGrid
        categories={shown}
        onOpen={setSelected}
        size='sm'
        extraTile={
          <Link
            href={routes.budget}
            className='flex size-[84px] flex-col items-center justify-center gap-1 rounded-full border border-dashed border-mut/50 text-mut outline-none transition-colors hover:bg-muted hover:text-ink-2 focus-visible:ring-3 focus-visible:ring-ring/50'
          >
            <Icon name='grid_view' className='text-[20px]' />
            <span className='text-micro font-bold'>{restCount > 0 ? `+${restCount}` : 'הכול'}</span>
          </Link>
        }
      />
      <CategoryDetail
        category={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </SectionCard>
  );
}
