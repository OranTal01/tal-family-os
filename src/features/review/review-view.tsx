'use client';

import * as React from 'react';
import type { CategoryOption, ReviewCardView } from '@/server/data/views';
import { EmptyState } from '@/components/finance/empty-state';
import { ResponsiveDetail } from '@/components/finance/responsive-detail';
import { ReviewCard } from '@/components/finance/review-card';
import {
  ClassificationFields,
  type Classification,
} from '@/features/transactions/classification-fields';
import { Amount } from '@/components/finance/amount';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Review queue (design screen 4): one reason + one primary action per card,
 * "תקין" approves instantly with undo, resolution opens the classification
 * sheet. Empty state celebrates order: "הכול מסודר ✨".
 */
export function ReviewView({
  items: initialItems,
  categories,
}: {
  items: ReviewCardView[];
  categories: CategoryOption[];
}) {
  const [items, setItems] = React.useState(initialItems);
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);
  const resolving = items.find((i) => i.id === resolvingId) ?? null;

  function remove(id: string, message: string, description?: string) {
    const removed = items.find((i) => i.id === id);
    const index = items.findIndex((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(message, {
      description,
      action: removed
        ? {
            label: 'ביטול',
            onClick: () =>
              setItems((prev) => {
                const next = [...prev];
                next.splice(Math.min(index, next.length), 0, removed);
                return next;
              }),
          }
        : undefined,
    });
  }

  function approveAll() {
    const count = items.length;
    const snapshot = items;
    setItems([]);
    toast.success(`${count} תנועות סומנו כתקינות`, {
      action: { label: 'ביטול', onClick: () => setItems(snapshot) },
    });
  }

  return (
    <>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <p className='text-body font-bold text-ink-2'>
          {items.length > 0 ? `${items.length} פתוחות` : 'אין פריטים פתוחים'}
        </p>
        {items.length > 1 && (
          <Button variant='outline' onClick={approveAll}>
            סמן הכול כתקין
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon='task_alt'
          variant='all-clear'
          title='הכול מסודר ✨'
          body='אין תנועות שדורשות בדיקה. נעדכן אתכם כשתגיע תנועה חדשה לסיווג.'
          action={
            <Button variant='outline' onClick={() => toast('הסנכרון מעודכן', { description: 'לא נמצאו תנועות חדשות לבדיקה.' })}>
              רענון סנכרון
            </Button>
          }
        />
      ) : (
        <ul className='flex flex-col gap-3'>
          {items.map((item) => (
            <li key={item.id}>
              <ReviewCard
                icon={item.icon}
                name={item.name}
                note={item.note}
                reason={item.reasonLabel}
                amount={item.amount}
                actionLabel={item.actionLabel}
                onAction={() => setResolvingId(item.id)}
                onApprove={() => remove(item.id, 'סומן כתקין')}
              />
            </li>
          ))}
        </ul>
      )}

      <ResolutionSheet
        item={resolving}
        categories={categories}
        onOpenChange={(open) => !open && setResolvingId(null)}
        onResolve={(item, value) => {
          const category = categories.find((c) => c.id === value.categoryId);
          remove(
            item.id,
            value.isTransfer
              ? 'סומנה כהעברה פנימית — לא תיספר כהכנסה או הוצאה'
              : category
                ? `שויך ל${category.name}`
                : 'התנועה עודכנה',
            value.remember
              ? `נוצר כלל: "${item.name}" יסווג אוטומטית בעתיד. ניתן לנהל בהגדרות.`
              : undefined,
          );
        }}
      />
    </>
  );
}

function ResolutionSheet({
  item,
  categories,
  onOpenChange,
  onResolve,
}: {
  item: ReviewCardView | null;
  categories: CategoryOption[];
  onOpenChange: (open: boolean) => void;
  onResolve: (item: ReviewCardView, value: Classification) => void;
}) {
  const [value, setValue] = React.useState<Classification | null>(null);
  const [prevItem, setPrevItem] = React.useState(item);

  // reset the form when a different review item opens (derived-state reset)
  if (item !== prevItem) {
    setPrevItem(item);
    setValue(
      item
        ? {
            categoryId: item.suggestedCategoryId,
            context: 'household',
            ownerId: 'shared',
            isTransfer: false,
            remember: false,
          }
        : null,
    );
  }

  if (!item || !value) return null;

  return (
    <ResponsiveDetail
      open={item !== null}
      onOpenChange={onOpenChange}
      title={item.name}
      description={
        <span className='flex items-center gap-2'>
          {item.note} ·{' '}
          <Amount
            value={item.amount}
            sign={item.isIncome ? 'always' : 'auto'}
            className='font-bold'
          />
        </span>
      }
      footer={
        <Button
          size='lg'
          className='w-full lg:w-auto'
          disabled={!value.isTransfer && !value.categoryId}
          onClick={() => {
            onResolve(item, value);
            onOpenChange(false);
          }}
        >
          אישור וסיווג
        </Button>
      }
    >
      <div className='flex flex-col gap-4 py-2'>
        <p className='rounded-md bg-warn-soft px-3 py-2 text-caption font-bold text-warn-ink'>
          {item.reasonLabel}
        </p>
        <ClassificationFields
          value={value}
          onChange={setValue}
          categories={categories}
          merchantName={item.name}
          idPrefix='review'
        />
      </div>
    </ResponsiveDetail>
  );
}
