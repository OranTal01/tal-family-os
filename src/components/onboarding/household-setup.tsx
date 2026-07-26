'use client';

import { useActionState } from 'react';
import { createHouseholdAction } from '@/app/(finance)/actions';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  DEFAULT_HOUSEHOLD_NAME,
  initialHouseholdSetupActionState,
} from '@/lib/household/setup';

export function HouseholdSetup({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    createHouseholdAction,
    initialHouseholdSetupActionState,
  );

  return (
    <main className='flex min-h-dvh items-center justify-center bg-bg px-4 py-10'>
      <section
        aria-labelledby='household-setup-title'
        className='flex w-full max-w-[460px] flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8'
      >
        <div className='flex flex-col items-center gap-4 text-center'>
          <span
            aria-hidden
            className='flex size-16 items-center justify-center rounded-full bg-accent text-accent-ink'
          >
            <Icon name='account_balance_wallet' filled className='text-[32px]' />
          </span>

          <div className='flex flex-col gap-2'>
            <p className='text-caption font-bold text-accent-ink'>שלום {displayName}</p>
            <h1
              id='household-setup-title'
              className='text-title font-extrabold text-ink'
            >
              בואו נקים את כספי הבית
            </h1>
            <p className='text-body text-mut'>
              ניצור מרחב משפחתי פרטי שבו ינוהלו החשבונות, התקציב והתנועות שלכם.
              בשלב הבא יהיה אפשר לצרף גם את דניאל.
            </p>
          </div>
        </div>

        <div className='rounded-lg border border-line bg-surface-2 p-4'>
          <div className='flex items-start gap-3'>
            <Icon name='verified_user' className='mt-0.5 text-[20px] text-pos-ink' />
            <div className='flex flex-col gap-1'>
              <p className='text-body font-bold text-ink'>המרחב נשאר פרטי</p>
              <p className='text-caption font-semibold text-mut'>
                רק בני משפחה שתאשרו יוכלו לראות או לעדכן את המידע.
              </p>
            </div>
          </div>
        </div>

        {state.status === 'error' && (
          <AlertBanner tone='error' title='ההקמה לא הושלמה' body={state.message} />
        )}

        <form action={formAction} className='flex flex-col gap-3'>
          <input
            type='hidden'
            name='householdName'
            value={DEFAULT_HOUSEHOLD_NAME}
          />
          <Button type='submit' size='lg' disabled={pending} className='h-11 w-full'>
            <Icon name='home' filled className='text-[19px]' />
            {pending ? 'מקימים את כספי הבית…' : 'הקמת כספי הבית'}
          </Button>
          <p className='text-center text-micro font-semibold text-mut'>
            לא יוזנו נתונים פיננסיים בשלב הזה.
          </p>
        </form>

        <div className='flex justify-center border-t border-line pt-4'>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
