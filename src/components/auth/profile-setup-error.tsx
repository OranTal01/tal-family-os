import { AlertBanner } from '@/components/finance/alert-banner';
import { SignOutButton } from '@/components/auth/sign-out-button';

/**
 * Shown when a signed-in user has no matching `public.profiles` row — the
 * `on_auth_user_created` trigger should always create one, so this only
 * surfaces on an unexpected setup failure. Gives the user a way out (sign out)
 * instead of a broken/crashed screen.
 */
export function ProfileSetupError() {
  return (
    <div className='flex min-h-dvh items-center justify-center bg-bg px-4'>
      <div className='flex w-full max-w-[420px] flex-col gap-4'>
        <AlertBanner
          tone='error'
          title='אירעה תקלה בהגדרת החשבון'
          body='החשבון מחובר אך פרופיל המשתמש לא נמצא. יש לפנות למי שמנהל את המערכת.'
        />
        <SignOutButton />
      </div>
    </div>
  );
}
