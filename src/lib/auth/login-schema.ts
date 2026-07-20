import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'יש להזין כתובת אימייל' })
    .pipe(z.email({ error: 'כתובת האימייל אינה תקינה' })),
  password: z.string().min(1, { error: 'יש להזין סיסמה' }),
});

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

/** Validates raw form input and returns field-level Hebrew errors, if any. */
export function validateLoginFields(input: {
  email: string;
  password: string;
}): LoginFieldErrors | null {
  const result = loginSchema.safeParse(input);
  if (result.success) return null;

  const flattened = z.flattenError(result.error).fieldErrors;
  const errors: LoginFieldErrors = {
    email: flattened.email?.[0],
    password: flattened.password?.[0],
  };
  return errors.email || errors.password ? errors : null;
}
