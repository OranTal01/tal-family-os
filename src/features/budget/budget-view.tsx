'use client';

import * as React from 'react';
import type { Agorot } from '@/types/money';
import type { CategoryView } from '@/server/data/views';
import { Amount } from '@/components/finance/amount';
import { EmptyState } from '@/components/finance/empty-state';
import { CategoryDetail } from '@/features/budget/category-detail';
import { RingGrid } from '@/features/budget/ring-grid';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPercent } from '@/lib/format/currency';
import { agorot } from '@/types/money';
import { toast } from 'sonner';

type BudgetViewProps = {
  household: CategoryView[];
  business: CategoryView[];
  /**
   * total household spending from the engine — includes not-yet-categorized
   * transactions, so the headline matches the dashboard exactly (no
   * contradictory totals across screens)
   */
  householdSpent: Agorot;
};

/**
 * Budget screen body: summary trio, בית/עסק switch, full ring grid, and the
 * category detail sheet with budget editing (demo persistence: local state +
 * adjustment toast; Supabase wiring lands behind the same handlers).
 */
export function BudgetView({ household, business, householdSpent }: BudgetViewProps) {
  const [context, setContext] = React.useState<'household' | 'business'>('household');
  const [categories, setCategories] = React.useState({ household, business });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const active = categories[context];
  const totalAllocated = agorot(active.reduce((sum, c) => sum + c.allocated, 0));
  const totalSpent =
    context === 'household'
      ? householdSpent
      : agorot(active.reduce((sum, c) => sum + c.spent, 0));
  const remaining = agorot(Math.max(totalAllocated - totalSpent, 0));
  const utilization = totalAllocated > 0 ? totalSpent / totalAllocated : 0;
  const selected = active.find((c) => c.id === selectedId) ?? null;

  function handleBudgetChange(categoryId: string, next: Agorot) {
    setCategories((prev) => ({
      ...prev,
      [context]: prev[context].map((c) => {
        if (c.id !== categoryId) return c;
        const spentOver = Math.max(c.spent - next, 0);
        return {
          ...c,
          allocated: next,
          remaining: agorot(Math.max(next - c.spent, 0)),
          overspend: agorot(spentOver),
          utilization: next > 0 ? (c.spent / next) * 100 : 100,
          status: spentOver > 0 ? 'over' : c.spent / next >= 0.8 ? 'near' : 'healthy',
        };
      }),
    }));
  }

  return (
    <>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <Tabs value={context} onValueChange={(v) => setContext(v as typeof context)}>
          <TabsList>
            <TabsTrigger value='household'>משק בית</TabsTrigger>
            <TabsTrigger value='business'>עסק</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant='outline'
          onClick={() =>
            toast('הוספת קטגוריה תתאפשר עם חיבור מסד הנתונים', {
              description: 'בגרסת ההדגמה הקטגוריות קבועות מראש.',
            })
          }
        >
          <Icon name='add' className='text-[16px]' />
          קטגוריה חדשה
        </Button>
      </div>

      <dl className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
          <dt className='text-caption font-semibold text-mut'>
            תקציב חודשי{context === 'business' ? ' · עסק' : ''}
          </dt>
          <dd>
            <Amount value={totalAllocated} className='text-display font-extrabold text-ink' />
          </dd>
        </div>
        <div className='rounded-lg border border-line bg-surface p-4 shadow-sm'>
          <dt className='text-caption font-semibold text-mut'>
            הוצא · {formatPercent(utilization)}
          </dt>
          <dd>
            <Amount value={totalSpent} className='text-display font-extrabold text-ink' />
          </dd>
        </div>
        <div className='rounded-lg border border-pos/25 bg-pos-soft p-4 shadow-sm'>
          <dt className='text-caption font-semibold text-pos-ink'>נותר בתקציב</dt>
          <dd>
            <Amount value={remaining} className='text-display font-extrabold text-pos-ink' />
          </dd>
        </div>
      </dl>

      {active.length === 0 ? (
        <EmptyState
          icon='donut_small'
          title='אין קטגוריות עדיין'
          body='צרו תקציב ראשון מתבניות מוכנות — אפשר לשנות הכול אחר כך.'
          action={
            <Button onClick={() => toast('יתאפשר עם חיבור מסד הנתונים')}>צור תקציב ראשון</Button>
          }
        />
      ) : (
        <RingGrid
          categories={active}
          onOpen={(c) => setSelectedId(c.id)}
          showRange
          size='lg'
          className='rounded-lg border border-line bg-surface p-4 shadow-sm'
          extraTile={
            <button
              type='button'
              onClick={() =>
                toast('הוספת קטגוריה תתאפשר עם חיבור מסד הנתונים', {
                  description: 'בגרסת ההדגמה הקטגוריות קבועות מראש.',
                })
              }
              className='flex size-[96px] flex-col items-center justify-center gap-1 rounded-full border border-dashed border-mut/50 text-mut outline-none transition-colors hover:bg-muted hover:text-ink-2 focus-visible:ring-3 focus-visible:ring-ring/50'
            >
              <Icon name='add' className='text-[22px]' />
              <span className='text-micro font-bold'>קטגוריה</span>
            </button>
          }
        />
      )}

      <CategoryDetail
        category={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onBudgetChange={handleBudgetChange}
      />
    </>
  );
}
