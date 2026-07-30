'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  dismissTransactionReviewsAction,
  updateTransactionClassificationAction,
} from '@/app/(finance)/transactions/actions';
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
 * "תקין" dismisses a review item in Supabase, while resolution opens the
 * persisted classification sheet. Empty state celebrates order.
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
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();
  const resolving = items.find((i) => i.id === resolvingId) ?? null;

  function remove(id: string, message: string, description?: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(message, {
      description,
    });
  }

  function approveAll() {
    const snapshot = items;
    startTransition(async () => {
      const result = await dismissTransactionReviewsAction(
        snapshot.map((item) => item.transactionId),
      );
      if (result.status === 'error') {
        toast.error('לא הצלחנו לעדכן', { description: result.message });
        return;
      }
      setItems([]);
      toast.success(`${result.count} תנועות סומנו כתקינות`);
      router.refresh();
    });
  }

  function approveOne(item: ReviewCardView) {
    startTransition(async () => {
      const result = await dismissTransactionReviewsAction([
        item.transactionId,
      ]);
      if (result.status === 'error') {
        toast.error('לא הצלחנו לעדכן', { description: result.message });
        return;
      }
      remove(item.id, 'סומן כתקין');
      router.refresh();
    });
  }

  return (
    <>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <p className='text-body font-bold text-ink-2'>
          {items.length > 0 ? `${items.length} פתוחות` : 'אין פריטים פתוחים'}
        </p>
        {items.length > 1 && (
          <Button variant='outline' onClick={approveAll} disabled={isPending}>
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
            <Button
              variant='outline'
              onClick={() => {
                router.refresh();
                toast('הרשימה רועננה');
              }}
            >
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
                onApprove={() => approveOne(item)}
                resolving={isPending}
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
          startTransition(async () => {
            const result = await updateTransactionClassificationAction({
              transactionId: item.transactionId,
              categoryId: value.categoryId,
              context: value.context,
              ownerId: value.ownerId,
              rememberRule: value.remember,
              isRecurring: value.isRecurring,
            });
            if (result.status === 'error') {
              toast.error('לא הצלחנו לשמור', {
                description: result.message,
              });
              return;
            }
            const category = categories.find(
              (candidate) =>
                candidate.id === result.transaction.categoryId,
            );
            remove(
              item.id,
              category ? `שויך ל${category.name}` : 'התנועה עודכנה',
              result.ruleSaved
                ? `נוצר כלל: "${item.name}" יסווג אוטומטית בעתיד.`
                : undefined,
            );
            setResolvingId(null);
            router.refresh();
          });
        }}
        pending={isPending}
      />
    </>
  );
}

function ResolutionSheet({
  item,
  categories,
  onOpenChange,
  onResolve,
  pending,
}: {
  item: ReviewCardView | null;
  categories: CategoryOption[];
  onOpenChange: (open: boolean) => void;
  onResolve: (item: ReviewCardView, value: Classification) => void;
  pending: boolean;
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
            isRecurring: false,
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
          disabled={
            pending ||
            (!item.isIncome && !value.categoryId)
          }
          onClick={() => {
            onResolve(item, value);
          }}
          aria-busy={pending}
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
          showCategory={!item.isIncome}
          showTransfer={false}
          showRecurring={!item.isIncome}
          showRemember={!item.isIncome}
        />
      </div>
    </ResponsiveDetail>
  );
}
