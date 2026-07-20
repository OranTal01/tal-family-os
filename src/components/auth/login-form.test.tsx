import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signInWithPasswordMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: signInWithPasswordMock },
  }),
}));

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
  signInWithPasswordMock.mockReset();
});

describe('LoginForm', () => {
  it('shows Hebrew validation errors for empty fields and does not call Supabase', async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo='/dashboard' />);

    await user.click(screen.getByRole('button', { name: 'כניסה' }));

    expect(await screen.findByText('יש להזין כתובת אימייל')).toBeInTheDocument();
    expect(screen.getByText('יש להזין סיסמה')).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it('shows an invalid-email error for a malformed address', async () => {
    const user = userEvent.setup();
    render(<LoginForm redirectTo='/dashboard' />);

    await user.type(screen.getByLabelText('אימייל'), 'not-an-email');
    await user.type(screen.getByLabelText('סיסמה'), 'secret');
    await user.click(screen.getByRole('button', { name: 'כניסה' }));

    expect(await screen.findByText('כתובת האימייל אינה תקינה')).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it('shows a generic Hebrew error on failed login and re-enables the form', async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const user = userEvent.setup();
    render(<LoginForm redirectTo='/dashboard' />);

    await user.type(screen.getByLabelText('אימייל'), 'oran@example.com');
    await user.type(screen.getByLabelText('סיסמה'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'כניסה' }));

    expect(await screen.findByText('אימייל או סיסמה שגויים')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'כניסה' })).not.toBeDisabled();
  });

  it('shows a loading state while the request is pending', async () => {
    let resolveSignIn: (value: { error: null }) => void = () => {};
    signInWithPasswordMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm redirectTo='/dashboard' />);

    await user.type(screen.getByLabelText('אימייל'), 'oran@example.com');
    await user.type(screen.getByLabelText('סיסמה'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'כניסה' }));

    expect(await screen.findByRole('button', { name: 'מתחבר…' })).toBeDisabled();

    resolveSignIn({ error: null });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('navigates to redirectTo on successful login', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginForm redirectTo='/budget' />);

    await user.type(screen.getByLabelText('אימייל'), 'oran@example.com');
    await user.type(screen.getByLabelText('סיסמה'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'כניסה' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/budget'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('renders no public sign-up entry point', () => {
    render(<LoginForm redirectTo='/dashboard' />);

    expect(screen.queryByRole('link', { name: /הרשמה|צור חשבון|sign ?up/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /הרשמה|צור חשבון|sign ?up/i })).toBeNull();
    expect(screen.getAllByRole('textbox')).toHaveLength(1); // only the email field
  });
});
