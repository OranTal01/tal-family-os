'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertBanner } from '@/components/finance/alert-banner';
import { createClient } from '@/lib/supabase/client';
import { validateLoginFields, type LoginFieldErrors } from '@/lib/auth/login-schema';

const GENERIC_AUTH_ERROR = 'אימייל או סיסמה שגויים';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateLoginFields({ email, password });
    setFieldErrors(errors);
    setAuthError(null);
    if (errors) return;

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(GENERIC_AUTH_ERROR);
      setPending(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
      {authError && <AlertBanner tone='error' title={authError} />}

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='email'>אימייל</Label>
        <Input
          id='email'
          name='email'
          type='email'
          dir='ltr'
          autoComplete='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={fieldErrors?.email ? true : undefined}
          disabled={pending}
        />
        {fieldErrors?.email && (
          <p className='text-caption font-semibold text-warn'>{fieldErrors.email}</p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='password'>סיסמה</Label>
        <Input
          id='password'
          name='password'
          type='password'
          dir='ltr'
          autoComplete='current-password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fieldErrors?.password ? true : undefined}
          disabled={pending}
        />
        {fieldErrors?.password && (
          <p className='text-caption font-semibold text-warn'>{fieldErrors.password}</p>
        )}
      </div>

      <Button type='submit' size='lg' disabled={pending} className='mt-1 w-full'>
        {pending ? 'מתחבר…' : 'כניסה'}
      </Button>
    </form>
  );
}
