'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryOption, TransactionItem } from '@/server/data/views';
import {
  updateTransactionClassificationAction,
  type TransactionClassificationActionResult,
} from '@/app/(finance)/transactions/actions';
import { Amount } from '@/components/finance/amount';
import { EmptyState } from '@/components/finance/empty-state';
import { ResponsiveDetail } from '@/components/finance/responsive-detail';
import { TransactionRow } from '@/components/finance/transaction-row';
import {
  ClassificationFields,
  type Classification,
} from '@/features/transactions/classification-fields';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDayHeading } from '@/lib/format/date';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 30;

type Tab = 'all' | 'expenses' | 'income' | 'review';
type SavedClassification = Extract<
  TransactionClassificationActionResult,
  { status: 'success' }
>['transaction'];

/**
 * Transactions screen: search, tabs, quick category chips, day-grouped list
 * (mobile) / wide rows with account+date (desktop), CSV export, detail sheet
 * with category correction + "זכור כלל זה".
 */
export function TransactionsView({
  items: initialItems,
  categories,
  initialTab = 'all',
}: {
  items: TransactionItem[];
  categories: CategoryOption[];
  initialTab?: Tab;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [previousInitialItems, setPreviousInitialItems] =
    React.useState(initialItems);
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // router.refresh() preserves Client Component state. Reset only the
  // server-backed transaction list when a fresh RSC payload arrives, while
  // keeping the user's active tab, search query, filters and scroll limit.
  if (initialItems !== previousInitialItems) {
    setPreviousInitialItems(initialItems);
    setItems(initialItems);
  }

  const filtered = React.useMemo(() => {
    const q = query.trim();
    return items.filter((t) => {
      if (tab === 'expenses' && !(t.kind === 'expense' || t.kind === 'refund')) return false;
      if (tab === 'income' && t.kind !== 'income') return false;
      if (tab === 'review' && !t.needsReview) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (q) {
        const amountText = String(Math.round(Math.abs(t.amount) / 100));
        const haystack = `${t.merchant} ${t.categoryName ?? ''} ${t.accountName} ${amountText}`;
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, query, categoryFilter]);

  const visible = filtered.slice(0, limit);
  const groups = React.useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    for (const t of visible) {
      const list = map.get(t.dateISO) ?? [];
      list.push(t);
      map.set(t.dateISO, list);
    }
    return [...map.entries()];
  }, [visible]);

  const selected = items.find((t) => t.id === selectedId) ?? null;
  const quickCategories = categories.filter((c) => c.context === 'household').slice(0, 6);

  function exportCsv() {
    const header = 'תאריך,שם,קטגוריה,חשבון,סכום';
    const rows = filtered.map((t) =>
      [t.dateISO, t.merchant, t.categoryName ?? '', t.accountName, (t.amount / 100).toFixed(2)]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    );
    const blob = new Blob([`﻿${[header, ...rows].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} תנועות יוצאו לקובץ CSV`);
  }

  return (
    <>
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <div className='relative min-w-0 flex-1'>
          <Icon
            name='search'
            className='pointer-events-none absolute inset-y-0 start-3 my-auto h-fit text-[18px] text-mut'
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder='חיפוש עסק, סכום או קטגוריה…'
            aria-label='חיפוש תנועות'
            className='h-10 ps-10'
          />
        </div>
        <Button variant='outline' size='lg' onClick={exportCsv}>
          <Icon name='download' className='text-[16px]' />
          <span className='hidden sm:inline'>ייצוא</span>
        </Button>
      </div>

      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as Tab);
            setLimit(PAGE_SIZE);
          }}
        >
          <TabsList>
            <TabsTrigger value='all'>הכול</TabsTrigger>
            <TabsTrigger value='expenses'>הוצאות</TabsTrigger>
            <TabsTrigger value='income'>הכנסות</TabsTrigger>
            <TabsTrigger value='review'>לבדיקה</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        className='mb-4 flex gap-1.5 overflow-x-auto pb-1 [scroll-snap-type:x_proximity]'
        role='group'
        aria-label='סינון לפי קטגוריה'
      >
        {quickCategories.map((c) => {
          const active = categoryFilter === c.id;
          return (
            <button
              key={c.id}
              type='button'
              aria-pressed={active}
              onClick={() => {
                setCategoryFilter(active ? null : c.id);
                setLimit(PAGE_SIZE);
              }}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-caption font-bold outline-none transition-colors [scroll-snap-align:start] focus-visible:ring-3 focus-visible:ring-ring/50',
                active
                  ? 'border-transparent bg-accent text-accent-foreground'
                  : 'border-line bg-surface text-ink-2 hover:bg-muted',
              )}
            >
              {c.name}
              {active && <Icon name='close' label='הסר סינון' className='text-[14px]' />}
            </button>
          );
        })}
        {categoryFilter && (
          <button
            type='button'
            onClick={() => setCategoryFilter(null)}
            className='shrink-0 rounded-full px-3 py-1.5 text-caption font-bold text-accent-ink outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'
          >
            נקה הכול
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon='receipt_long'
          variant='filtered'
          title='אין תנועות בטווח שנבחר'
          body='נסו להרחיב את התאריכים או לנקות את המסננים.'
          action={
            <Button
              variant='outline'
              onClick={() => {
                setQuery('');
                setCategoryFilter(null);
                setTab('all');
              }}
            >
              ניקוי מסננים
            </Button>
          }
        />
      ) : (
        <div className='rounded-lg border border-line bg-surface p-2 shadow-sm sm:p-3'>
          {groups.map(([dateISO, dayItems]) => (
            <section key={dateISO} aria-label={formatDayHeading(dateISO)}>
              <h2 className='px-2 pt-3 pb-1 text-caption font-bold text-mut'>
                {formatDayHeading(dateISO)}
              </h2>
              <ul className='divide-y divide-line'>
                {dayItems.map((t) => (
                  <li key={t.id}>
                    <TransactionRow
                      icon={t.icon}
                      name={t.merchant}
                      meta={`${t.meta} · ${t.accountName}`}
                      amount={t.amount}
                      kind={t.kind === 'transfer' ? 'expense' : t.kind}
                      tag={t.tag}
                      onOpen={() => setSelectedId(t.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {filtered.length > limit && (
            <div className='flex justify-center border-t border-line pt-3 pb-1'>
              <Button variant='ghost' onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                טעינת תנועות נוספות ({filtered.length - limit})
              </Button>
            </div>
          )}
        </div>
      )}

      <TransactionDetail
        item={selected}
        categories={categories}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onSave={(updated) => {
          setItems((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? {
                    ...t,
                    categoryId: updated.categoryId,
                    categoryName: updated.categoryName,
                    icon:
                      updated.categoryIcon ??
                      (t.kind === 'income' ? 'payments' : 'receipt_long'),
                    meta:
                      t.kind === 'income'
                        ? 'הכנסה'
                        : t.kind === 'refund'
                          ? 'החזר'
                          : updated.categoryName ?? 'ללא קטגוריה',
                    context: updated.context,
                    ownerId: updated.ownerId,
                    needsReview: updated.needsReview,
                    isRecurring: updated.isRecurring,
                    tag: updated.needsReview
                      ? { label: 'לבדיקה', tone: 'warn', icon: 'error' }
                      : updated.context === 'business'
                        ? {
                            label: 'עסק',
                            tone: 'future',
                            icon: 'storefront',
                          }
                        : updated.isRecurring
                          ? {
                              label: 'קבועה',
                              tone: 'sync',
                              icon: 'event_repeat',
                            }
                        : undefined,
                  }
                : t,
            ),
          );
        }}
      />
    </>
  );
}

function TransactionDetail({
  item,
  categories,
  onOpenChange,
  onSave,
}: {
  item: TransactionItem | null;
  categories: CategoryOption[];
  onOpenChange: (open: boolean) => void;
  onSave: (updated: SavedClassification) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [value, setValue] = React.useState<Classification | null>(null);
  const [prevItem, setPrevItem] = React.useState(item);

  // reset the form when a different transaction opens (derived-state reset)
  if (item !== prevItem) {
    setPrevItem(item);
    setError(null);
    setValue(
      item
        ? {
            categoryId: item.categoryId,
            context: item.context,
            ownerId: (item.ownerId as Classification['ownerId']) ?? 'shared',
            isTransfer: item.kind === 'transfer',
            isRecurring: Boolean(item.isRecurring),
            remember: false,
          }
        : null,
    );
  }

  if (!item || !value) return null;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateTransactionClassificationAction({
          transactionId: item!.id,
          categoryId: value!.categoryId,
          context: value!.context,
          ownerId: value!.ownerId,
          rememberRule: value!.remember,
          isRecurring: value!.isRecurring,
        });

        if (result.status === 'error') {
          setError(result.message);
          toast.error('לא הצלחנו לשמור', {
            description: result.message,
          });
          return;
        }

        onSave(result.transaction);
        onOpenChange(false);
        toast.success('התנועה עודכנה', {
          description: result.transaction.isRecurring
            ? 'החיוב נוסף להוצאות הקבועות ויופיע בתכנון החודשי.'
            : result.ruleSaved
              ? `נוצר כלל: "${item!.merchant}" ישויך אוטומטית בייבואים הבאים.`
              : undefined,
        });
        router.refresh();
      } catch {
        const message =
          'לא הצלחנו להתחבר לשרת. דבר לא השתנה ואפשר לנסות שוב.';
        setError(message);
        toast.error('לא הצלחנו לשמור', { description: message });
      }
    });
  }

  const needsCategory =
    item.kind === 'expense' || item.kind === 'refund';

  return (
    <ResponsiveDetail
      open={item !== null}
      onOpenChange={onOpenChange}
      title={item.merchant}
      description={`${item.dateLabel} · ${item.accountName}`}
      footer={
        <Button
          size='lg'
          className='w-full lg:w-auto'
          onClick={save}
          disabled={isPending || (needsCategory && !value.categoryId)}
          aria-busy={isPending}
        >
          {isPending ? 'שומר…' : 'שמירה'}
        </Button>
      }
    >
      <div className='flex flex-col gap-4 py-2'>
        <div className='flex items-center justify-between rounded-md bg-surface-2 px-3 py-3'>
          <span className='text-caption font-semibold text-mut'>סכום</span>
          <Amount
            value={item.amount}
            withAgorot
            sign={item.amount > 0 ? 'always' : 'auto'}
            tone={item.amount > 0 ? 'positive' : 'default'}
            className='text-heading font-extrabold'
          />
        </div>
        {item.tag && (
          <p className='text-caption font-semibold text-mut'>
            {item.tag.label === 'לבדיקה'
              ? 'התנועה ממתינה לאישור — אפשר לסווג אותה כאן.'
              : item.tag.label}
          </p>
        )}
        <ClassificationFields
          value={value}
          onChange={setValue}
          categories={categories}
          merchantName={item.merchant}
          idPrefix='txn'
          showCategory={item.kind !== 'income'}
          showTransfer={false}
          showRecurring={item.kind === 'expense'}
          showRemember={item.kind !== 'income'}
        />
        {error && (
          <p
            role='alert'
            className='rounded-md bg-warn-soft px-3 py-2 text-caption font-bold text-warn-ink'
          >
            {error}
          </p>
        )}
        <p className='text-caption font-semibold text-mut'>
          השינוי חל על התנועה הזו בלבד. אם תבחרו ״זכור כלל זה״, ייבואים חדשים
          מאותו בית עסק יסווגו אוטומטית. הוצאה קבועה תופיע בתכנון בכל חודש.
        </p>
      </div>
    </ResponsiveDetail>
  );
}
