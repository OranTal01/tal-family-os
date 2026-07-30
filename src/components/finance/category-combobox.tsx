'use client';

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import {
  CheckIcon,
  ChevronDownIcon,
  SearchIcon,
} from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { CategoryOption } from '@/server/data/views';

export function CategoryCombobox({
  id,
  value,
  options,
  disabled = false,
  placeholder = 'בחירת קטגוריה',
  onValueChange,
}: {
  id: string;
  value?: string;
  options: CategoryOption[];
  disabled?: boolean;
  placeholder?: string;
  onValueChange: (categoryId?: string) => void;
}) {
  const selectedCategory =
    options.find((category) => category.id === value) ?? null;

  return (
    <ComboboxPrimitive.Root
      items={options}
      value={selectedCategory}
      disabled={disabled}
      autoHighlight
      itemToStringLabel={(category) => category.name}
      itemToStringValue={(category) => category.id}
      isItemEqualToValue={(category, selected) =>
        category.id === selected.id
      }
      onValueChange={(category) =>
        onValueChange(category?.id ?? undefined)
      }
    >
      <ComboboxPrimitive.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pe-2 ps-2.5 text-sm whitespace-nowrap outline-none select-none transition-colors',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'data-placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-input/30 dark:hover:bg-input/50',
        )}
      >
        <ComboboxPrimitive.Value placeholder={placeholder}>
          <span className='min-w-0 flex-1 truncate text-start'>
            {selectedCategory?.name ?? placeholder}
          </span>
        </ComboboxPrimitive.Value>
        <ComboboxPrimitive.Icon>
          <ChevronDownIcon className='pointer-events-none size-4 shrink-0 text-muted-foreground' />
        </ComboboxPrimitive.Icon>
      </ComboboxPrimitive.Trigger>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          align='start'
          sideOffset={4}
          className='isolate z-50 outline-none'
        >
          <ComboboxPrimitive.Popup
            aria-label='בחירת קטגוריה'
            className={cn(
              'relative isolate z-50 w-(--anchor-width) min-w-60 max-w-(--available-width) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10',
              'origin-(--transform-origin) duration-100',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <div className='relative border-b border-line bg-popover px-2 pt-2 pb-1'>
              <SearchIcon className='pointer-events-none absolute start-4 top-[calc(50%+2px)] size-4 -translate-y-1/2 text-muted-foreground' />
              <ComboboxPrimitive.Input
                aria-label='חיפוש קטגוריה'
                placeholder='חיפוש קטגוריה…'
                dir='rtl'
                className='h-9 w-full rounded-md border border-input bg-background ps-9 pe-3 text-start text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
              />
            </div>

            <ComboboxPrimitive.Empty className='empty:hidden px-3 py-5 text-start text-sm font-semibold text-muted-foreground'>
              לא נמצאה קטגוריה מתאימה
            </ComboboxPrimitive.Empty>

            <ComboboxPrimitive.List
              dir='rtl'
              className='max-h-72 overflow-y-auto overscroll-contain scroll-smooth px-1 pt-0.5 pb-1 outline-none data-empty:p-0'
            >
              {(category: CategoryOption) => (
                <ComboboxPrimitive.Item
                  key={category.id}
                  value={category}
                  className={cn(
                    'relative flex min-h-10 w-full cursor-pointer items-center justify-start rounded-md ps-3 pe-9 py-2 text-start text-sm outline-none select-none',
                    'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                    'data-selected:font-bold',
                  )}
                >
                  <span className='flex min-w-0 items-center justify-start gap-2'>
                    <Icon
                      name={category.icon}
                      className='shrink-0 text-[17px] text-muted-foreground'
                    />
                    <span className='truncate'>{category.name}</span>
                  </span>
                  <ComboboxPrimitive.ItemIndicator className='pointer-events-none absolute end-3 flex size-4 items-center justify-center'>
                    <CheckIcon className='size-4' />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
