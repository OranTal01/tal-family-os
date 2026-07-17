'use client';

import * as React from 'react';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

/**
 * Preferences block (design screen 14): currency/language are display-only in
 * the single-household MVP; theme is live; notification/security toggles keep
 * session state and explain their demo scope.
 */
export function Preferences() {
  const [smartAlerts, setSmartAlerts] = React.useState(true);
  const [biometric, setBiometric] = React.useState(false);

  return (
    <ul className='flex flex-col divide-y divide-line'>
      <PrefRow icon='payments' label='מטבע'>
        <span className='text-body font-bold text-ink'>שקל · ₪</span>
      </PrefRow>
      <PrefRow icon='language' label='שפה'>
        <span className='text-body font-bold text-ink'>עברית</span>
      </PrefRow>
      <PrefRow icon='contrast' label='מצב תצוגה'>
        <ThemeToggle />
      </PrefRow>
      <PrefRow icon='notifications' label='התראות חכמות' hint='סיכום יומי ב־21:30 והתראות חריגה'>
        <Switch
          checked={smartAlerts}
          onCheckedChange={(checked) => {
            setSmartAlerts(checked);
            toast(checked ? 'התראות חכמות הופעלו' : 'התראות חכמות כובו', {
              description: 'שליחת התראות בפועל תתחבר בשלב הבא — ללא ספק חיצוני בהדגמה.',
            });
          }}
          aria-label='התראות חכמות'
        />
      </PrefRow>
      <PrefRow icon='fingerprint' label='כניסה ביומטרית'>
        <Switch
          checked={biometric}
          onCheckedChange={(checked) => {
            setBiometric(checked);
            toast(checked ? 'כניסה ביומטרית תופעל עם מערכת ההתחברות' : 'כניסה ביומטרית כובתה');
          }}
          aria-label='כניסה ביומטרית'
        />
      </PrefRow>
      <PrefRow icon='cloud_sync' label='גיבוי וייצוא נתונים'>
        <button
          type='button'
          onClick={() =>
            toast('ייצוא מלא יתאפשר עם חיבור מסד הנתונים', {
              description: 'ייצוא CSV של תנועות זמין כבר עכשיו במסך התנועות.',
            })
          }
          className='flex items-center gap-1 rounded-md px-2 py-1 text-body font-bold text-accent-ink outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          ניהול
          <Icon name='chevron_left' className='text-[16px]' />
        </button>
      </PrefRow>
    </ul>
  );
}

function PrefRow({
  icon,
  label,
  hint,
  children,
}: {
  icon: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <li className='flex min-h-14 items-center gap-3 py-2.5'>
      <Icon name={icon} className='text-[20px] text-mut' />
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='text-body font-bold text-ink'>{label}</span>
        {hint && <span className='text-caption font-semibold text-mut'>{hint}</span>}
      </span>
      {children}
    </li>
  );
}
