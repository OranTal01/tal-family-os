import { describe, expect, it } from 'vitest';
import { validateLoginFields } from '@/lib/auth/login-schema';

describe('validateLoginFields', () => {
  it('returns Hebrew errors for both empty fields', () => {
    expect(validateLoginFields({ email: '', password: '' })).toEqual({
      email: 'יש להזין כתובת אימייל',
      password: 'יש להזין סיסמה',
    });
  });

  it('flags an invalid email format', () => {
    expect(validateLoginFields({ email: 'not-an-email', password: 'secret' })).toEqual({
      email: 'כתובת האימייל אינה תקינה',
      password: undefined,
    });
  });

  it('flags an empty password only', () => {
    expect(validateLoginFields({ email: 'a@b.com', password: '' })).toEqual({
      email: undefined,
      password: 'יש להזין סיסמה',
    });
  });

  it('returns null when both fields are valid', () => {
    expect(validateLoginFields({ email: 'a@b.com', password: 'secret' })).toBeNull();
  });
});
