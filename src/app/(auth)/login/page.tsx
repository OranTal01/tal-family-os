import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { sanitizeRedirectTarget } from '@/lib/auth/safe-redirect';

export const metadata: Metadata = { title: 'כניסה' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string }>;
}) {
  const { redirectedFrom } = await searchParams;
  const redirectTo = sanitizeRedirectTarget(redirectedFrom);

  return (
    <div className='flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-md'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-title font-extrabold text-ink'>כניסה לחשבון</h1>
        <p className='text-body text-mut'>כספי הבית — אורן ודניאל</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
