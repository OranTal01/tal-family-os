'use client';

import { useActionState, useState } from 'react';
import { createHouseholdInvitationAction } from '@/app/(finance)/settings/actions';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initialInvitationActionState } from '@/lib/household/invitations';

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createHouseholdInvitationAction,
    initialInvitationActionState,
  );

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
        <Icon name='person_add' className='text-[14px]' />
        הזמנה
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-[440px]' showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className='text-subhead font-extrabold text-ink'>
              הזמנת דניאל לניהול משותף
            </DialogTitle>
            <DialogDescription className='text-body text-mut'>
              ההזמנה תעבוד רק בחשבון עם כתובת האימייל המדויקת שתוזן כאן.
            </DialogDescription>
          </DialogHeader>

          {state.status !== 'idle' && (
            <AlertBanner
              tone={state.status === 'success' ? 'success' : 'error'}
              title={
                state.status === 'success'
                  ? 'ההזמנה נרשמה'
                  : 'רישום ההזמנה נכשל'
              }
              body={state.message}
            />
          )}

          <form action={formAction} className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='household-invitation-email'>האימייל של דניאל</Label>
              <Input
                id='household-invitation-email'
                name='email'
                type='email'
                inputMode='email'
                autoComplete='email'
                dir='ltr'
                required
                placeholder='danielle@example.com'
                className='h-10 text-left'
              />
              <p className='text-caption font-semibold text-mut'>
                ההרשאה שתינתן: בעלים · גישה מלאה.
              </p>
            </div>

            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
              >
                סגירה
              </Button>
              <Button type='submit' disabled={pending}>
                <Icon name='person_add' className='text-[16px]' />
                {pending ? 'רושמים הזמנה…' : 'רישום ההזמנה'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
