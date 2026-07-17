'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';

export function DepositButton({ goalName }: { goalName: string }) {
  return (
    <Button
      size='sm'
      variant='outline'
      onClick={() =>
        toast(`הפקדה ל"${goalName}" תתאפשר עם חיבור מסד הנתונים`, {
          description: 'ההפקדות בהדגמה מגיעות מהנתונים לדוגמה.',
        })
      }
    >
      <Icon name='add' className='text-[14px]' />
      הפקדה
    </Button>
  );
}
