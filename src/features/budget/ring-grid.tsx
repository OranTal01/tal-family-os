'use client';

import type { CategoryView } from '@/server/data/views';
import { CategoryRing } from '@/components/finance/category-ring';
import { formatMoneyRange } from '@/lib/format/currency';
import type { Agorot } from '@/types/money';
import { cn } from '@/lib/utils';

/**
 * Responsive ring grid: 2–3 columns mobile, 3–4 tablet, 4 desktop (spec §8).
 * Never scrolls horizontally — it stacks.
 */
export function RingGrid({
  categories,
  onOpen,
  showRange = false,
  size = 'md',
  extraTile,
  className,
}: {
  categories: CategoryView[];
  onOpen: (category: CategoryView) => void;
  /** budget screen shows "הוצא / תקציב" under each ring */
  showRange?: boolean;
  size?: 'sm' | 'md' | 'lg';
  extraTile?: React.ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 md:grid-cols-4',
        className,
      )}
    >
      {categories.map((c) => (
        <li key={c.id} className='flex flex-col items-center'>
          <CategoryRing
            icon={c.icon}
            name={c.shortName}
            utilization={c.utilization}
            status={c.status}
            centerAmount={(c.status === 'over' ? c.overspend : c.remaining) as Agorot}
            size={size}
            onOpen={() => onOpen(c)}
          />
          {showRange && (
            <span className='ltr-embed tabular-amounts -mt-1 text-micro font-semibold text-mut'>
              {formatMoneyRange(c.spent, c.allocated)}
            </span>
          )}
        </li>
      ))}
      {extraTile && <li className='flex flex-col items-center justify-center'>{extraTile}</li>}
    </ul>
  );
}
