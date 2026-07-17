'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';

export function AddExpectedButton({ label = 'הוצאה צפויה' }: { label?: string }) {
  return (
    <Button
      onClick={() =>
        toast('הוספת הוצאות צפויות תתאפשר עם חיבור מסד הנתונים', {
          description: 'בגרסת ההדגמה התכנון נבנה מהנתונים לדוגמה.',
        })
      }
    >
      <Icon name='add' className='text-[16px]' />
      {label}
    </Button>
  );
}
