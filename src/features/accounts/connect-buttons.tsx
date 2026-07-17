'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';

export function ConnectButton() {
  return (
    <Button
      onClick={() =>
        toast('חיבור מקורות אמת יתאפשר בשלב הבא', {
          description: 'האפליקציה עובדת כעת על נתוני הדגמה בלבד — ללא חיבור לבנקים.',
        })
      }
    >
      <Icon name='add_link' className='text-[16px]' />
      חיבור מקור
    </Button>
  );
}

export function ReconnectButton({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <Button
      variant={compact ? 'outline' : 'secondary'}
      size={compact ? 'sm' : 'default'}
      onClick={() =>
        toast(`התחברות מחדש ל${name} תתאפשר בשלב הבא`, {
          description: 'בגרסת ההדגמה מצב השגיאה מוצג להמחשת התהליך.',
        })
      }
    >
      התחברות מחדש
    </Button>
  );
}
