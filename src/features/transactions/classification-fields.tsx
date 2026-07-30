'use client';

import type { CategoryOption } from '@/server/data/views';
import { CategoryCombobox } from '@/components/finance/category-combobox';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type Classification = {
  categoryId?: string;
  context: 'household' | 'business';
  ownerId: 'shared' | 'oran' | 'danielle';
  isTransfer: boolean;
  isRecurring: boolean;
  remember: boolean;
};

const owners = [
  { id: 'shared', label: 'משותף' },
  { id: 'oran', label: 'אורן' },
  { id: 'danielle', label: 'דניאל' },
] as const;

/**
 * The review-confirmation field set (PRODUCT_SPEC §2): category,
 * household/business, owner, internal transfer, remember-rule. Shared by the
 * transaction detail sheet and the review resolution sheet.
 */
export function ClassificationFields({
  value,
  onChange,
  categories,
  merchantName,
  idPrefix,
  showCategory = true,
  showTransfer = true,
  showRecurring = false,
  showRemember = true,
}: {
  value: Classification;
  onChange: (next: Classification) => void;
  categories: CategoryOption[];
  merchantName: string;
  idPrefix: string;
  showCategory?: boolean;
  showTransfer?: boolean;
  showRecurring?: boolean;
  showRemember?: boolean;
}) {
  const contextCategories = categories.filter((c) => c.context === value.context);

  return (
    <div className='flex flex-col gap-4'>
      {showCategory && (
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor={`${idPrefix}-category`}>קטגוריה</Label>
          <CategoryCombobox
            id={`${idPrefix}-category`}
            value={value.categoryId ?? ''}
            options={contextCategories}
            onValueChange={(categoryId) =>
              onChange({ ...value, categoryId })
            }
            disabled={value.isTransfer}
          />
        </div>
      )}

      <fieldset className='flex flex-col gap-1.5'>
        <legend className='text-caption font-semibold text-ink-2'>הקשר</legend>
        <div role='radiogroup' aria-label='הקשר' className='inline-flex w-fit rounded-lg bg-surface-2 p-1'>
          {(
            [
              { key: 'household', label: 'משק בית', icon: 'home' },
              { key: 'business', label: 'עסק', icon: 'storefront' },
            ] as const
          ).map((option) => {
            const active = value.context === option.key;
            return (
              <button
                key={option.key}
                type='button'
                role='radio'
                aria-checked={active}
                onClick={() =>
                  onChange({
                    ...value,
                    context: option.key,
                    categoryId: undefined,
                    isRecurring:
                      option.key === 'business' ? false : value.isRecurring,
                  })
                }
                className={cn(
                  'flex min-h-9 items-center gap-1.5 rounded-md px-3 text-caption font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'bg-surface text-ink shadow-sm' : 'text-mut hover:text-ink-2',
                )}
              >
                <Icon name={option.icon} className='text-[16px]' />
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`${idPrefix}-owner`}>שיוך</Label>
        <Select
          value={value.ownerId}
          onValueChange={(v) => onChange({ ...value, ownerId: v as Classification['ownerId'] })}
        >
          <SelectTrigger id={`${idPrefix}-owner`} className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showTransfer && (
        <label className='flex cursor-pointer items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5'>
          <span className='flex flex-col'>
            <span className='text-body font-bold text-ink'>העברה בין חשבונות</span>
            <span className='text-caption font-semibold text-mut'>
              תנועה בין חשבונות שלנו — לא הכנסה ולא הוצאה
            </span>
          </span>
          <Switch
            checked={value.isTransfer}
            onCheckedChange={(checked) =>
              onChange({
                ...value,
                isTransfer: checked,
                isRecurring: checked ? false : value.isRecurring,
                categoryId: checked ? undefined : value.categoryId,
              })
            }
          />
        </label>
      )}

      {showRecurring && value.context === 'household' && !value.isTransfer && (
        <label className='flex cursor-pointer items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5'>
          <span className='flex flex-col'>
            <span className='text-body font-bold text-ink'>הוצאה קבועה</span>
            <span className='text-caption font-semibold text-mut'>
              הצג את החיוב הזה בתכנון בכל חודש
            </span>
          </span>
          <Switch
            checked={value.isRecurring}
            onCheckedChange={(checked) =>
              onChange({ ...value, isRecurring: checked })
            }
          />
        </label>
      )}

      {showRemember && (
        <label className='flex cursor-pointer items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5'>
          <span className='flex flex-col'>
            <span className='text-body font-bold text-ink'>זכור כלל זה</span>
            <span className='text-caption font-semibold text-mut'>
              {value.isTransfer
                ? `סמן אוטומטית העברות מ"${merchantName}" בעתיד`
                : `שייך אוטומטית את "${merchantName}" לקטגוריה זו בעתיד`}
            </span>
          </span>
          <Switch
            checked={value.remember}
            onCheckedChange={(checked) =>
              onChange({ ...value, remember: checked })
            }
          />
        </label>
      )}
    </div>
  );
}
