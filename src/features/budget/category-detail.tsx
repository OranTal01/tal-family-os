'use client';

import * as React from 'react';
import type { Agorot } from '@/types/money';
import type { CategoryView } from '@/server/data/views';
import { Amount } from '@/components/finance/amount';
import { ResponsiveDetail } from '@/components/finance/responsive-detail';
import { StatusBadge, categoryStatus } from '@/components/finance/status-badge';
import { TransactionRow } from '@/components/finance/transaction-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Category detail — bottom sheet on mobile, modal on desktop (design screen 2).
 * Shows budget/spent/remaining/projected + the month's transactions, and
 * (when editable) a budget-amount editor that logs an adjustment.
 */
export function CategoryDetail({
  category,
  open,
  onOpenChange,
  onBudgetChange,
}: {
  category: CategoryView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** present on the budget screen; absent (read-only) on the dashboard */
  onBudgetChange?: (categoryId: string, next: Agorot) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState('');

  if (!category) return null;
  const st = categoryStatus[category.status];
  const over = category.status === 'over';

  function saveBudget() {
    const shekels = Number(value);
    if (!Number.isInteger(shekels) || shekels <= 0) {
      toast.error('יש להזין סכום שלם בשקלים');
      return;
    }
    onBudgetChange?.(category!.id, (shekels * 100) as Agorot);
    setEditing(false);
    toast.success('התקציב עודכן לחודש זה', {
      description: 'השינוי תועד ביומן ההתאמות',
    });
  }

  return (
    <ResponsiveDetail
      open={open}
      onOpenChange={(o) => {
        setEditing(false);
        onOpenChange(o);
      }}
      title={
        <span className='flex items-center gap-2'>
          <Icon name={category.icon} className='text-[20px] text-mut' />
          {category.name}
          <StatusBadge
            tone={st.tone}
            icon={st.icon}
            label={over ? `חריגה ₪${Math.round(category.overspend / 100).toLocaleString('en-US')}` : st.label}
            size='micro'
          />
        </span>
      }
      footer={
        onBudgetChange ? (
          editing ? (
            <div className='flex w-full items-end gap-2'>
              <div className='flex flex-1 flex-col gap-1.5'>
                <Label htmlFor='budget-amount'>תקציב חודשי חדש (₪)</Label>
                <Input
                  id='budget-amount'
                  inputMode='numeric'
                  dir='ltr'
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={String(Math.round(category.allocated / 100))}
                />
              </div>
              <Button size='lg' onClick={saveBudget}>
                שמירה
              </Button>
              <Button size='lg' variant='ghost' onClick={() => setEditing(false)}>
                ביטול
              </Button>
            </div>
          ) : (
            <Button
              size='lg'
              className='w-full lg:w-auto'
              onClick={() => {
                setValue(String(Math.round(category.allocated / 100)));
                setEditing(true);
              }}
            >
              עריכת תקציב
            </Button>
          )
        ) : undefined
      }
    >
      <dl className='grid grid-cols-2 gap-3 py-3'>
        <StatCell label='תקציב חודשי' value={category.allocated} />
        <StatCell label='הוצא' value={category.spent} />
        {over ? (
          <StatCell label='חריגה' value={(-category.overspend) as Agorot} negative />
        ) : (
          <StatCell label='נותר' value={category.remaining} />
        )}
        <StatCell
          label='צפי לסוף החודש'
          value={category.projected}
          negative={category.projected > category.allocated}
        />
      </dl>

      <h3 className='mt-2 mb-1 text-caption font-bold text-mut'>תנועות בקטגוריה</h3>
      {category.transactions.length === 0 ? (
        <p className='py-4 text-body text-mut'>אין תנועות בקטגוריה החודש.</p>
      ) : (
        <ul className='divide-y divide-line'>
          {category.transactions.map((t) => (
            <li key={t.id}>
              <TransactionRow
                icon={t.icon}
                name={t.merchant}
                meta={t.dateLabel}
                amount={t.amount}
                kind={t.kind === 'transfer' ? 'expense' : t.kind}
              />
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDetail>
  );
}

function StatCell({
  label,
  value,
  negative,
}: {
  label: string;
  value: Agorot;
  negative?: boolean;
}) {
  return (
    <div className='rounded-md bg-surface-2 p-3'>
      <dt className='text-caption font-semibold text-mut'>{label}</dt>
      <dd>
        <Amount
          value={value}
          className={cn('text-subhead font-extrabold', negative ? 'text-warn-ink' : 'text-ink')}
        />
      </dd>
    </div>
  );
}
