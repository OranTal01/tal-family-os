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
        toast(`הוספת הפקדה ל"${goalName}" עדיין אינה פעילה`, {
          description: 'הסכומים שמוצגים במסך מגיעים ממסד הנתונים בלבד.',
        })
      }
    >
      <Icon name='add' className='text-[14px]' />
      הפקדה
    </Button>
  );
}
