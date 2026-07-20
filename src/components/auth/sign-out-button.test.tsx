import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignOutButton } from '@/components/auth/sign-out-button';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signOutMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: signOutMock } }),
}));

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock },
}));

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
  signOutMock.mockReset();
  toastErrorMock.mockClear();
});

describe('SignOutButton', () => {
  it('signs out and navigates to /login on success', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole('button', { name: 'התנתקות' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(refreshMock).toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('shows a visible error and stays put when sign-out fails', async () => {
    signOutMock.mockResolvedValue({ error: { message: 'network error' } });
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole('button', { name: 'התנתקות' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('ההתנתקות נכשלה, נסו שוב'));
    expect(pushMock).not.toHaveBeenCalled();
  });
});
