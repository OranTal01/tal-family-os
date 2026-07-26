'use client';

import { useActionState } from 'react';
import { revokeHouseholdInvitationAction } from '@/app/(finance)/settings/actions';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  initialInvitationActionState,
  memberRoleLabels,
  type HouseholdInvitationListItem,
} from '@/lib/household/invitations';

const invitationDateFormatter = new Intl.DateTimeFormat('he-IL', {
  dateStyle: 'medium',
  timeZone: 'Asia/Jerusalem',
});

function PendingInvitation({
  invitation,
}: {
  invitation: HouseholdInvitationListItem;
}) {
  const [state, formAction, pending] = useActionState(
    revokeHouseholdInvitationAction,
    initialInvitationActionState,
  );

  return (
    <li className='flex flex-col gap-2 py-3'>
      <div className='flex items-center gap-3'>
        <span
          aria-hidden
          className='flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink'
        >
          <Icon name='outgoing_mail' className='text-[20px]' />
        </span>
        <span className='flex min-w-0 flex-1 flex-col'>
          <span dir='ltr' className='truncate text-left text-body font-bold text-ink'>
            {invitation.email}
          </span>
          <span className='text-caption font-semibold text-mut'>
            {invitation.isExpired
              ? 'פג תוקף · אפשר לחדש דרך כפתור ההזמנה'
              : `${memberRoleLabels[invitation.role]} · עד ${invitationDateFormatter.format(
                  new Date(invitation.expiresAt),
                )}`}
          </span>
        </span>
        <form action={formAction}>
          <input type='hidden' name='invitationId' value={invitation.id} />
          <Button type='submit' variant='ghost' size='sm' disabled={pending}>
            {pending ? 'מבטלים…' : 'ביטול'}
          </Button>
        </form>
      </div>
      {state.status === 'error' && (
        <p role='alert' className='text-caption font-semibold text-warn-ink'>
          {state.message}
        </p>
      )}
    </li>
  );
}

export function PendingInvitations({
  invitations,
}: {
  invitations: HouseholdInvitationListItem[];
}) {
  if (invitations.length === 0) return null;

  return (
    <div className='border-t border-line pt-2'>
      <p className='pt-2 text-caption font-extrabold text-mut'>הזמנות ממתינות</p>
      <ul className='flex flex-col divide-y divide-line'>
        {invitations.map((invitation) => (
          <PendingInvitation key={invitation.id} invitation={invitation} />
        ))}
      </ul>
    </div>
  );
}
