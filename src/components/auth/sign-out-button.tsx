'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { createClient } from '@/lib/supabase/client';
import { authRoutes } from '@/lib/routes';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error('ההתנתקות נכשלה, נסו שוב');
      setPending(false);
      return;
    }

    router.push(authRoutes.login);
    router.refresh();
  }

  return (
    <Button variant='outline' size='sm' onClick={handleSignOut} disabled={pending}>
      <Icon name='logout' className='text-[14px]' />
      {pending ? 'מתנתק…' : 'התנתקות'}
    </Button>
  );
}
