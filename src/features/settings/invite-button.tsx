'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';

export function InviteButton() {
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={() =>
        toast('הזמנת בני משפחה תתאפשר עם מערכת ההתחברות', {
          description: 'משק הבית בהדגמה כולל את אורן ודניאל כבעלים.',
        })
      }
    >
      <Icon name='person_add' className='text-[14px]' />
      הזמנה
    </Button>
  );
}
