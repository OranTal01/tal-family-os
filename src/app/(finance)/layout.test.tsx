import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinanceLayout from './layout';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  getCurrentHouseholdMembership: vi.fn(),
  getPendingHouseholdInvitation: vi.fn(),
  getShellData: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/lib/supabase/dal', () => ({
  getCurrentUser: mocks.getCurrentUser,
  getCurrentProfile: mocks.getCurrentProfile,
  getCurrentHouseholdMembership: mocks.getCurrentHouseholdMembership,
  getPendingHouseholdInvitation: mocks.getPendingHouseholdInvitation,
}));

vi.mock('@/server/data/shell', () => ({
  getShellData: mocks.getShellData,
}));

vi.mock('@/components/auth/profile-setup-error', () => ({
  ProfileSetupError: () => <div>PROFILE_SETUP_ERROR</div>,
}));

vi.mock('@/components/onboarding/household-setup', () => ({
  HouseholdSetup: ({ displayName }: { displayName: string }) => (
    <div>HOUSEHOLD_SETUP:{displayName}</div>
  ),
}));

vi.mock('@/components/onboarding/household-setup-error', () => ({
  HouseholdSetupError: () => <div>HOUSEHOLD_SETUP_ERROR</div>,
}));

vi.mock('@/components/onboarding/household-invitation', () => ({
  HouseholdInvitation: ({
    displayName,
    invitation,
  }: {
    displayName: string;
    invitation: { householdName: string };
  }) => (
    <div>
      HOUSEHOLD_INVITATION:{displayName}:{invitation.householdName}
    </div>
  ),
}));

vi.mock('@/components/shell/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='app-shell'>{children}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  });
  mocks.getCurrentUser.mockResolvedValue({ id: 'profile-1' });
  mocks.getCurrentProfile.mockResolvedValue({
    id: 'profile-1',
    display_name: 'אורן',
  });
  mocks.getCurrentHouseholdMembership.mockResolvedValue({
    householdId: 'household-1',
    role: 'owner',
  });
  mocks.getPendingHouseholdInvitation.mockResolvedValue(null);
  mocks.getShellData.mockResolvedValue({ reviewCount: 0, syncedAgo: 'עכשיו' });
});

describe('FinanceLayout access flow', () => {
  it('redirects an unauthenticated request before loading profile data', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(
      FinanceLayout({ children: <div>CONTENT</div> }),
    ).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mocks.getCurrentProfile).not.toHaveBeenCalled();
    expect(mocks.getCurrentHouseholdMembership).not.toHaveBeenCalled();
  });

  it('shows the profile setup error when the authenticated profile is missing', async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);

    render(await FinanceLayout({ children: <div>CONTENT</div> }));

    expect(screen.getByText('PROFILE_SETUP_ERROR')).toBeInTheDocument();
    expect(mocks.getCurrentHouseholdMembership).not.toHaveBeenCalled();
  });

  it('shows household setup before the app shell when membership is missing', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);

    render(await FinanceLayout({ children: <div>CONTENT</div> }));

    expect(screen.getByText('HOUSEHOLD_SETUP:אורן')).toBeInTheDocument();
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument();
    expect(mocks.getShellData).not.toHaveBeenCalled();
  });

  it('shows an exact-email invitation instead of offering a second household', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);
    mocks.getPendingHouseholdInvitation.mockResolvedValue({
      invitationId: 'invite-1',
      householdName: 'כספי הבית',
      invitedRole: 'owner',
      inviterName: 'אורן',
      expiresAt: '2026-08-09T12:00:00.000Z',
      isExpired: false,
    });

    render(await FinanceLayout({ children: <div>CONTENT</div> }));

    expect(
      screen.getByText('HOUSEHOLD_INVITATION:אורן:כספי הבית'),
    ).toBeInTheDocument();
    expect(screen.queryByText('HOUSEHOLD_SETUP:אורן')).not.toBeInTheDocument();
    expect(mocks.getShellData).not.toHaveBeenCalled();
  });

  it('shows a calm failure state when membership cannot be loaded', async () => {
    mocks.getCurrentHouseholdMembership.mockRejectedValue(new Error('database unavailable'));

    render(await FinanceLayout({ children: <div>CONTENT</div> }));

    expect(screen.getByText('HOUSEHOLD_SETUP_ERROR')).toBeInTheDocument();
    expect(mocks.getShellData).not.toHaveBeenCalled();
  });

  it('shows a calm failure state when an invitation cannot be checked', async () => {
    mocks.getCurrentHouseholdMembership.mockResolvedValue(null);
    mocks.getPendingHouseholdInvitation.mockRejectedValue(
      new Error('database unavailable'),
    );

    render(await FinanceLayout({ children: <div>CONTENT</div> }));

    expect(screen.getByText('HOUSEHOLD_SETUP_ERROR')).toBeInTheDocument();
    expect(mocks.getShellData).not.toHaveBeenCalled();
  });

  it('renders the app shell only for a household member', async () => {
    render(await FinanceLayout({ children: <div>CONTENT</div> }));

    expect(screen.getByTestId('app-shell')).toHaveTextContent('CONTENT');
    expect(mocks.getShellData).toHaveBeenCalledOnce();
  });
});
