'use client';

import { useActionState } from 'react';
import { acceptHouseholdInvitationAction } from '@/app/(finance)/actions';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  initialInvitationActionState,
  memberRoleLabels,
  type PendingHouseholdInvitation,
} from '@/lib/household/invitations';

const invitationDateFormatter = new Intl.DateTimeFormat('he-IL', {
  dateStyle: 'long',
  timeZone: 'Asia/Jerusalem',
});

export function HouseholdInvitation({
  invitation,
  displayName,
}: {
  invitation: PendingHouseholdInvitation;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptHouseholdInvitationAction,
    initialInvitationActionState,
  );
  const expiresLabel = invitationDateFormatter.format(
    new Date(invitation.expiresAt),
  );

  return (
    <main className='flex min-h-dvh items-center justify-center bg-bg px-4 py-10'>
      <section
        aria-labelledby='household-invitation-title'
        className='flex w-full max-w-[480px] flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8'
      >
        <div className='flex flex-col items-center gap-4 text-center'>
          <span
            aria-hidden
            className='flex size-16 items-center justify-center rounded-full bg-accent text-accent-ink'
          >
            <Icon name='family_restroom' filled className='text-[32px]' />
          </span>

          <div className='flex flex-col gap-2'>
            <p className='text-caption font-bold text-accent-ink'>
              שלום {displayName}
            </p>
            <h1
              id='household-invitation-title'
              className='text-title font-extrabold text-ink'
            >
              הוזמנת אל {invitation.householdName}
            </h1>
            <p className='text-body text-mut'>
              {invitation.inviterName} הזמין/ה אותך להצטרף לניהול המשותף של הבית.
            </p>
          </div>
        </div>

        <dl className='grid gap-3 rounded-lg border border-line bg-surface-2 p-4'>
          <div className='flex items-center justify-between gap-4'>
            <dt className='text-caption font-semibold text-mut'>הרשאה</dt>
            <dd className='text-body font-bold text-ink'>
              {memberRoleLabels[invitation.invitedRole]}
            </dd>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <dt className='text-caption font-semibold text-mut'>תוקף ההזמנה</dt>
            <dd className='text-body font-bold text-ink'>{expiresLabel}</dd>
          </div>
        </dl>

        {invitation.isExpired ? (
          <AlertBanner
            tone='warning'
            title='תוקף ההזמנה פג'
            body={`בקשו מ${invitation.inviterName} לחדש את ההזמנה בעמוד ההגדרות.`}
          />
        ) : (
          <>
            {state.status === 'error' && (
              <AlertBanner
                tone='error'
                title='ההצטרפות לא הושלמה'
                body={state.message}
              />
            )}

            <form action={formAction}>
              <input
                type='hidden'
                name='invitationId'
                value={invitation.invitationId}
              />
              <Button
                type='submit'
                size='lg'
                disabled={pending}
                className='h-11 w-full'
              >
                <Icon name='check_circle' filled className='text-[19px]' />
                {pending ? 'מצרפים אותך למשק הבית…' : 'אישור והצטרפות'}
              </Button>
            </form>
          </>
        )}

        <p className='text-center text-micro font-semibold text-mut'>
          ההצטרפות אפשרית רק לחשבון עם כתובת האימייל שאליה נרשמה ההזמנה.
        </p>

        <div className='flex justify-center border-t border-line pt-4'>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
