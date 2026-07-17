'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const options = [
  { key: 'light', label: 'בהיר', icon: 'light_mode' },
  { key: 'dark', label: 'כהה', icon: 'dark_mode' },
  { key: 'system', label: 'מערכת', icon: 'brightness_auto' },
] as const;

/** Segmented Light / Dark / System control (settings screen). */
const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // theme is unknown until hydration; render no active state on the server
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role='radiogroup'
      aria-label='מצב תצוגה'
      className='inline-flex rounded-lg bg-surface-2 p-1'
    >
      {options.map((option) => {
        const active = mounted && theme === option.key;
        return (
          <button
            key={option.key}
            type='button'
            role='radio'
            aria-checked={active}
            onClick={() => setTheme(option.key)}
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
  );
}
