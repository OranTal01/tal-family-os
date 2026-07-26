import { SignOutButton } from '@/components/auth/sign-out-button';
import { AlertBanner } from '@/components/finance/alert-banner';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

export function HouseholdSetupError() {
  return (
    <main className='flex min-h-dvh items-center justify-center bg-bg px-4 py-10'>
      <div className='flex w-full max-w-[440px] flex-col gap-4'>
        <AlertBanner
          tone='error'
          title='לא הצלחנו לבדוק את הגדרת הבית'
          body='המידע לא נטען כרגע. אפשר לנסות שוב, והנתונים הקיימים לא ייפגעו.'
        />
        <div className='flex flex-wrap justify-center gap-2'>
          <Button
            nativeButton={false}
            render={<a href={routes.dashboard} />}
            variant='outline'
          >
            ניסיון נוסף
          </Button>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
